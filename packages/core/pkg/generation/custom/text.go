package custom

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/mediago-dev/mediago-drama/packages/core/pkg/multimodal"
)

// TextProvider executes a fixed definition/model/credential snapshot.
type TextProvider struct {
	Definition Definition
	Model      Model
	APIKey     string
	Client     *http.Client
}

// Name identifies this configured connection.
func (p *TextProvider) Name() string { return p.Definition.ProviderID() }

func clientFor(client *http.Client) *http.Client {
	if client == nil {
		client = &http.Client{Timeout: 180 * time.Second}
	}
	copy := *client
	// Never forward credentials to an API redirect target.
	copy.CheckRedirect = func(_ *http.Request, _ []*http.Request) error { return http.ErrUseLastResponse }
	return &copy
}

// Request performs one authenticated request without retries or credential-bearing redirects.
func Request(ctx context.Context, client *http.Client, baseURL, path, protocol, key, contentType string, body io.Reader) (*http.Response, error) {
	if err := ValidateURL(baseURL); err != nil {
		return nil, err
	}
	method := http.MethodPost
	if body == nil {
		method = http.MethodGet
	}
	req, err := http.NewRequestWithContext(ctx, method, strings.TrimRight(baseURL, "/")+path, body)
	if err != nil {
		return nil, fmt.Errorf("请求地址无效")
	}
	if protocol == Anthropic {
		req.Header.Set("x-api-key", key)
		req.Header.Set("anthropic-version", "2023-06-01")
	} else {
		req.Header.Set("Authorization", "Bearer "+key)
	}
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	resp, err := clientFor(client).Do(req)
	if err != nil {
		if ctx.Err() != nil {
			return nil, ctx.Err()
		}
		return nil, fmt.Errorf("供应商连接失败，请检查地址、网络或超时")
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		defer resp.Body.Close()
		raw, _ := io.ReadAll(io.LimitReader(resp.Body, 8192))
		return nil, fmt.Errorf("供应商 HTTP %d: %s", resp.StatusCode, SafeError(string(raw), key))
	}
	return resp, nil
}

// SafeError redacts configured credentials from bounded upstream diagnostics.
func SafeError(message, key string) string {
	if key != "" {
		message = strings.ReplaceAll(message, key, "[redacted]")
	}
	if len(message) > 1000 {
		message = message[:1000]
	}
	return message
}

func textParts(parts []multimodal.Part) string {
	var b strings.Builder
	for _, part := range parts {
		if part.Modality == multimodal.ModalityText {
			b.WriteString(part.Text)
		}
	}
	return b.String()
}

func schema(parameter multimodal.ToolParameter) map[string]any {
	result := map[string]any{"type": string(parameter.Type)}
	if parameter.Description != "" {
		result["description"] = parameter.Description
	}
	if len(parameter.Enum) > 0 {
		result["enum"] = parameter.Enum
	}
	if parameter.Items != nil {
		result["items"] = schema(*parameter.Items)
	}
	if parameter.Type == multimodal.ToolParameterObject {
		properties := map[string]any{}
		required := []string{}
		for name, value := range parameter.Properties {
			properties[name] = schema(value)
			if value.Required {
				required = append(required, name)
			}
		}
		result["properties"] = properties
		result["required"] = required
	}
	return result
}

func (p *TextProvider) payload(request multimodal.GenerateRequest, stream bool) (map[string]any, string, error) {
	if len(request.Tools) > 0 && !p.Model.Tools {
		return nil, "", fmt.Errorf("模型未声明工具调用能力")
	}
	payload := map[string]any{"model": p.Model.ID, "stream": stream}
	if request.Options.Model != "" && request.Options.Model != p.Model.ID {
		return nil, "", fmt.Errorf("请求模型与配置不一致")
	}
	if request.Options.Temperature != nil {
		payload["temperature"] = *request.Options.Temperature
	}
	maxTokens := p.Model.MaxOutputTokens
	if request.Options.MaxTokens != nil {
		maxTokens = *request.Options.MaxTokens
	}
	if maxTokens <= 0 {
		maxTokens = 4096
	}
	messages := []any{}
	system := []string{}
	for _, message := range request.Messages {
		role := string(message.Role)
		text := textParts(message.Parts)
		if p.Model.Protocol == Anthropic && role == "system" {
			system = append(system, text)
			continue
		}
		parts := []any{}
		for _, part := range message.Parts {
			if part.Modality == multimodal.ModalityText {
				typ := "text"
				if p.Model.Protocol == Responses {
					typ = "input_text"
					if role == "assistant" {
						typ = "output_text"
					}
				}
				parts = append(parts, map[string]any{"type": typ, "text": part.Text})
				continue
			}
			if part.Modality != multimodal.ModalityImage || !p.Model.Vision {
				return nil, "", fmt.Errorf("模型未声明该附件能力")
			}
			uri := part.URI
			if len(part.Data) > 0 {
				uri = "data:" + part.MIMEType + ";base64," + base64.StdEncoding.EncodeToString(part.Data)
			}
			switch p.Model.Protocol {
			case Chat:
				parts = append(parts, map[string]any{"type": "image_url", "image_url": map[string]string{"url": uri}})
			case Responses:
				parts = append(parts, map[string]any{"type": "input_image", "image_url": uri})
			case Anthropic:
				source := map[string]any{"type": "url", "url": uri}
				if strings.HasPrefix(uri, "data:") {
					metadata, data, ok := strings.Cut(uri[5:], ",")
					if !ok || !strings.HasSuffix(metadata, ";base64") {
						return nil, "", fmt.Errorf("无效的图片 data URL")
					}
					source = map[string]any{"type": "base64", "media_type": strings.TrimSuffix(metadata, ";base64"), "data": data}
				}
				parts = append(parts, map[string]any{"type": "image", "source": source})
			}
		}
		if role == "tool" {
			switch p.Model.Protocol {
			case Responses:
				messages = append(messages, map[string]any{"type": "function_call_output", "call_id": message.ToolCallID, "output": text})
			case Anthropic:
				messages = append(messages, map[string]any{"role": "user", "content": []any{map[string]any{"type": "tool_result", "tool_use_id": message.ToolCallID, "content": text}}})
			default:
				messages = append(messages, map[string]any{"role": "tool", "tool_call_id": message.ToolCallID, "content": text})
			}
			continue
		}
		entry := map[string]any{"role": role, "content": parts}
		calls := []any{}
		for _, call := range message.ToolCalls {
			switch p.Model.Protocol {
			case Chat:
				calls = append(calls, map[string]any{"id": call.ID, "type": "function", "function": map[string]string{"name": call.Name, "arguments": call.Arguments}})
			case Responses:
				calls = append(calls, map[string]any{"type": "function_call", "call_id": call.ID, "name": call.Name, "arguments": call.Arguments})
			case Anthropic:
				var args map[string]any
				if err := json.Unmarshal([]byte(call.Arguments), &args); err != nil {
					return nil, "", fmt.Errorf("工具参数 JSON 无效")
				}
				parts = append(parts, map[string]any{"type": "tool_use", "id": call.ID, "name": call.Name, "input": args})
			}
		}
		if p.Model.Protocol == Chat && len(calls) > 0 {
			entry["tool_calls"] = calls
		}
		if p.Model.Protocol == Anthropic {
			entry["content"] = parts
		}
		if len(parts) > 0 || p.Model.Protocol != Responses {
			messages = append(messages, entry)
		}
		if p.Model.Protocol == Responses {
			messages = append(messages, calls...)
		}
	}
	path := "/chat/completions"
	payload["messages"] = messages
	payload["max_tokens"] = maxTokens
	if p.Model.Protocol == Responses {
		path = "/responses"
		delete(payload, "messages")
		delete(payload, "max_tokens")
		payload["input"] = messages
		payload["max_output_tokens"] = maxTokens
		payload["store"] = false
	}
	if p.Model.Protocol == Anthropic {
		path = "/messages"
		if len(system) > 0 {
			payload["system"] = strings.Join(system, "\n")
		}
	}
	if p.Model.Protocol == Chat && stream {
		payload["stream_options"] = map[string]bool{"include_usage": true}
	}
	if len(request.Tools) > 0 {
		items := []any{}
		for _, tool := range request.Tools {
			params := schema(multimodal.ToolParameter{Type: multimodal.ToolParameterObject, Properties: tool.Parameters})
			switch p.Model.Protocol {
			case Chat:
				items = append(items, map[string]any{"type": "function", "function": map[string]any{"name": tool.Name, "description": tool.Description, "parameters": params}})
			case Responses:
				items = append(items, map[string]any{"type": "function", "name": tool.Name, "description": tool.Description, "parameters": params, "strict": false})
			case Anthropic:
				items = append(items, map[string]any{"name": tool.Name, "description": tool.Description, "input_schema": params})
			}
		}
		payload["tools"] = items
		if request.Options.ToolChoice != "" {
			choice := string(request.Options.ToolChoice)
			if p.Model.Protocol == Anthropic {
				if choice == "required" {
					choice = "any"
				}
				payload["tool_choice"] = map[string]string{"type": choice}
			} else {
				payload["tool_choice"] = choice
			}
		}
	}
	return payload, path, nil
}

// Generate returns a normalized response for any supported text protocol.
func (p *TextProvider) Generate(ctx context.Context, request multimodal.GenerateRequest) (multimodal.GenerateResponse, error) {
	payload, path, err := p.payload(request, false)
	if err != nil {
		return multimodal.GenerateResponse{}, err
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return multimodal.GenerateResponse{}, err
	}
	resp, err := Request(ctx, p.Client, p.Definition.BaseURL, path, p.Model.Protocol, p.APIKey, "application/json", bytes.NewReader(raw))
	if err != nil {
		return multimodal.GenerateResponse{}, err
	}
	defer resp.Body.Close()
	var result map[string]any
	if err := json.NewDecoder(io.LimitReader(resp.Body, 16<<20)).Decode(&result); err != nil {
		return multimodal.GenerateResponse{}, fmt.Errorf("供应商返回了无效 JSON")
	}
	if result["error"] != nil {
		return multimodal.GenerateResponse{}, fmt.Errorf("供应商错误: %s", SafeError(fmt.Sprint(result["error"]), p.APIKey))
	}
	message := multimodal.Message{Role: multimodal.RoleAssistant}
	usage := decodeUsage(object(result["usage"]))
	switch p.Model.Protocol {
	case Chat:
		choices := array(result["choices"])
		if len(choices) == 0 {
			return multimodal.GenerateResponse{}, fmt.Errorf("供应商未返回 choices")
		}
		if reason := str(object(choices[0])["finish_reason"]); reason == "length" || reason == "content_filter" {
			return multimodal.GenerateResponse{}, fmt.Errorf("文本生成未完成: %s", reason)
		}
		entry := object(object(choices[0])["message"])
		message.Parts = append(message.Parts, multimodal.Part{Modality: multimodal.ModalityText, Text: str(entry["content"])})
		for _, value := range array(entry["tool_calls"]) {
			call := object(value)
			fn := object(call["function"])
			message.ToolCalls = append(message.ToolCalls, multimodal.ToolCall{ID: str(call["id"]), Name: str(fn["name"]), Arguments: str(fn["arguments"]), Type: "function"})
		}
	case Responses:
		if status := str(result["status"]); status != "completed" {
			return multimodal.GenerateResponse{}, fmt.Errorf("Responses 未完成: %s", SafeError(status, p.APIKey))
		}
		for _, value := range array(result["output"]) {
			entry := object(value)
			if str(entry["type"]) == "function_call" {
				message.ToolCalls = append(message.ToolCalls, multimodal.ToolCall{ID: str(entry["call_id"]), Name: str(entry["name"]), Arguments: str(entry["arguments"]), Type: "function"})
			}
			for _, part := range array(entry["content"]) {
				block := object(part)
				if str(block["type"]) == "output_text" {
					message.Parts = append(message.Parts, multimodal.Part{Modality: multimodal.ModalityText, Text: str(block["text"])})
				}
			}
		}
	case Anthropic:
		if reason := str(result["stop_reason"]); reason == "max_tokens" || reason == "refusal" || reason == "pause_turn" {
			return multimodal.GenerateResponse{}, fmt.Errorf("文本生成未完成: %s", reason)
		}
		for _, value := range array(result["content"]) {
			entry := object(value)
			if str(entry["type"]) == "text" {
				message.Parts = append(message.Parts, multimodal.Part{Modality: multimodal.ModalityText, Text: str(entry["text"])})
			}
			if str(entry["type"]) == "tool_use" {
				args, _ := json.Marshal(entry["input"])
				message.ToolCalls = append(message.ToolCalls, multimodal.ToolCall{ID: str(entry["id"]), Name: str(entry["name"]), Arguments: string(args), Type: "function"})
			}
		}
	}
	if textParts(message.Parts) == "" && len(message.ToolCalls) == 0 {
		return multimodal.GenerateResponse{}, fmt.Errorf("供应商未返回文本或工具调用")
	}
	for _, call := range message.ToolCalls {
		var args map[string]any
		if call.ID == "" || call.Name == "" || json.Unmarshal([]byte(call.Arguments), &args) != nil || args == nil {
			return multimodal.GenerateResponse{}, fmt.Errorf("供应商返回了无效工具调用")
		}
	}
	return multimodal.GenerateResponse{Messages: []multimodal.Message{message}, Usage: usage}, nil
}

func object(v any) map[string]any { result, _ := v.(map[string]any); return result }
func array(v any) []any           { result, _ := v.([]any); return result }
func str(v any) string            { result, _ := v.(string); return result }
func number(v any) int            { result, _ := v.(float64); return int(result) }
func decodeUsage(value map[string]any) multimodal.Usage {
	input := number(value["input_tokens"])
	if input == 0 {
		input = number(value["prompt_tokens"])
	}
	output := number(value["output_tokens"])
	if output == 0 {
		output = number(value["completion_tokens"])
	}
	cached := number(object(value["input_tokens_details"])["cached_tokens"])
	if cached == 0 {
		cached = number(object(value["prompt_tokens_details"])["cached_tokens"])
	}
	if cached == 0 {
		cached = number(value["cache_read_input_tokens"])
	}
	return multimodal.Usage{InputTokens: input, OutputTokens: output, TotalTokens: input + output, CachedTokens: cached, ReasoningTokens: number(object(value["output_tokens_details"])["reasoning_tokens"])}
}
