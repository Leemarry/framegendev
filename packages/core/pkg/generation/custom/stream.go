package custom

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"strings"

	"github.com/mediago-dev/mediago-drama/packages/core/pkg/generation"
	"github.com/mediago-dev/mediago-drama/packages/core/pkg/multimodal"
)

// Stream decodes the protocol's SSE events and closes its HTTP body on cancellation.
func (p *TextProvider) Stream(ctx context.Context, request multimodal.GenerateRequest) (*multimodal.StreamReader, error) {
	if !p.Model.Streaming {
		return nil, generation.ErrTextStreamingUnsupported
	}
	payload, path, err := p.payload(request, true)
	if err != nil {
		return nil, err
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	resp, err := Request(ctx, p.Client, p.Definition.BaseURL, path, p.Model.Protocol, p.APIKey, "application/json", bytes.NewReader(raw))
	if err != nil {
		return nil, err
	}
	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 4096), 4<<20)
	queue := []multimodal.StreamEvent{}
	done := false
	terminal := false
	hasOutput := false
	usage := multimodal.Usage{}
	calls := map[int]multimodal.ToolCall{}
	textEvent := func(delta string) {
		if delta != "" {
			hasOutput = true
			queue = append(queue, multimodal.StreamEvent{Type: multimodal.StreamEventMessageDelta, Delta: delta})
		}
	}
	callEvent := func(index int, id, name, args string) {
		call := calls[index]
		call.Index = &index
		call.Type = "function"
		if id != "" {
			call.ID = id
		}
		if name != "" {
			call.Name = name
		}
		call.Arguments += args
		calls[index] = call
		hasOutput = true
		delta := multimodal.ToolCall{ID: call.ID, Name: name, Arguments: args, Index: &index, Type: "function"}
		queue = append(queue, multimodal.StreamEvent{Type: multimodal.StreamEventToolCall, ToolCall: &delta})
	}
	finish := func() error {
		if !hasOutput {
			return fmt.Errorf("供应商未返回内容")
		}
		for _, call := range calls {
			if call.ID == "" || call.Name == "" || !json.Valid([]byte(call.Arguments)) {
				return fmt.Errorf("供应商工具调用不完整")
			}
		}
		done = true
		_ = resp.Body.Close()
		snapshot := usage
		queue = append(queue, multimodal.StreamEvent{Type: multimodal.StreamEventDone, Usage: &snapshot})
		return nil
	}
	return multimodal.NewStreamReader(func() (multimodal.StreamEvent, error) {
		for len(queue) == 0 {
			if done {
				return multimodal.StreamEvent{}, io.EOF
			}
			if err := ctx.Err(); err != nil {
				_ = resp.Body.Close()
				return multimodal.StreamEvent{}, err
			}
			lines := []string{}
			for scanner.Scan() {
				line := scanner.Text()
				if line == "" {
					if len(lines) > 0 {
						break
					}
					continue
				}
				if strings.HasPrefix(line, "data:") {
					lines = append(lines, strings.TrimPrefix(strings.TrimPrefix(line, "data:"), " "))
				}
			}
			if len(lines) == 0 {
				_ = resp.Body.Close()
				if ctx.Err() != nil {
					return multimodal.StreamEvent{}, ctx.Err()
				}
				if scanner.Err() != nil {
					return multimodal.StreamEvent{}, fmt.Errorf("供应商流读取失败")
				}
				return multimodal.StreamEvent{}, fmt.Errorf("供应商流提前结束")
			}
			data := strings.Join(lines, "\n")
			if data == "[DONE]" {
				if p.Model.Protocol != Chat || !terminal {
					return multimodal.StreamEvent{}, fmt.Errorf("供应商流缺少完成状态")
				}
				if err := finish(); err != nil {
					return multimodal.StreamEvent{}, err
				}
				continue
			}
			var value map[string]any
			if err := json.Unmarshal([]byte(data), &value); err != nil {
				return multimodal.StreamEvent{}, fmt.Errorf("供应商流包含无效 JSON")
			}
			kind := str(value["type"])
			if value["error"] != nil || kind == "error" || kind == "response.failed" || kind == "response.incomplete" {
				_ = resp.Body.Close()
				return multimodal.StreamEvent{}, fmt.Errorf("供应商流错误: %s", SafeError(data, p.APIKey))
			}
			switch p.Model.Protocol {
			case Chat:
				if value["usage"] != nil {
					usage = decodeUsage(object(value["usage"]))
				}
				for _, item := range array(value["choices"]) {
					choice := object(item)
					if number(choice["index"]) != 0 {
						continue
					}
					delta := object(choice["delta"])
					textEvent(str(delta["content"]))
					for _, item := range array(delta["tool_calls"]) {
						call := object(item)
						fn := object(call["function"])
						callEvent(number(call["index"]), str(call["id"]), str(fn["name"]), str(fn["arguments"]))
					}
					if reason := str(choice["finish_reason"]); reason != "" {
						if reason != "stop" && reason != "tool_calls" {
							return multimodal.StreamEvent{}, fmt.Errorf("生成未完整结束: %s", reason)
						}
						terminal = true
					}
				}
			case Responses:
				switch kind {
				case "response.output_text.delta":
					textEvent(str(value["delta"]))
				case "response.output_item.added":
					item := object(value["item"])
					if str(item["type"]) == "function_call" {
						callEvent(number(value["output_index"]), str(item["call_id"]), str(item["name"]), str(item["arguments"]))
					}
				case "response.function_call_arguments.delta":
					callEvent(number(value["output_index"]), "", "", str(value["delta"]))
				case "response.completed":
					response := object(value["response"])
					usage = decodeUsage(object(response["usage"]))
					if err := finish(); err != nil {
						return multimodal.StreamEvent{}, err
					}
				}
			case Anthropic:
				switch kind {
				case "message_start":
					usage = decodeUsage(object(object(value["message"])["usage"]))
				case "content_block_start":
					block := object(value["content_block"])
					if str(block["type"]) == "tool_use" {
						callEvent(number(value["index"]), str(block["id"]), str(block["name"]), "")
					}
					if str(block["type"]) == "text" {
						textEvent(str(block["text"]))
					}
				case "content_block_delta":
					delta := object(value["delta"])
					if str(delta["type"]) == "text_delta" {
						textEvent(str(delta["text"]))
					}
					if str(delta["type"]) == "input_json_delta" {
						callEvent(number(value["index"]), "", "", str(delta["partial_json"]))
					}
				case "message_delta":
					output := object(value["usage"])
					if output["output_tokens"] != nil {
						usage.OutputTokens = number(output["output_tokens"])
						usage.TotalTokens = usage.InputTokens + usage.OutputTokens
					}
					reason := str(object(value["delta"])["stop_reason"])
					if reason != "" && reason != "end_turn" && reason != "tool_use" && reason != "stop_sequence" {
						return multimodal.StreamEvent{}, fmt.Errorf("生成未完整结束: %s", reason)
					}
					terminal = reason != ""
				case "message_stop":
					if !terminal {
						return multimodal.StreamEvent{}, fmt.Errorf("供应商流缺少停止原因")
					}
					if err := finish(); err != nil {
						return multimodal.StreamEvent{}, err
					}
				}
			}
		}
		event := queue[0]
		queue = queue[1:]
		return event, nil
	}, resp.Body.Close), nil
}
