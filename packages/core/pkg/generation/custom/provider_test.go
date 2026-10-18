package custom

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/mediago-dev/mediago-drama/packages/core/pkg/generation"
	"github.com/mediago-dev/mediago-drama/packages/core/pkg/multimodal"
)

func textRequest() multimodal.GenerateRequest {
	return multimodal.GenerateRequest{Messages: []multimodal.Message{{Role: multimodal.RoleUser, Parts: []multimodal.Part{{Modality: multimodal.ModalityText, Text: "hello"}}}}}
}

func TestIncompleteTextResponsesFail(t *testing.T) {
	for _, test := range []struct{ protocol, body string }{
		{Chat, `{"choices":[{"finish_reason":"length","message":{"content":"partial"}}]}`},
		{Anthropic, `{"stop_reason":"max_tokens","content":[{"type":"text","text":"partial"}]}`},
		{Responses, `{"status":"incomplete","output":[]}`},
		{Chat, `{"choices":[{"message":{"tool_calls":[{"id":"c1","function":{"name":"tool","arguments":"{"}}]}}]}`},
		{Anthropic, `{"content":[{"type":"tool_use","id":"c1","name":"tool","input":null}]}`},
	} {
		t.Run(test.protocol+test.body, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				_, _ = io.WriteString(w, test.body)
			}))
			defer server.Close()
			p := &TextProvider{Definition: Definition{BaseURL: server.URL}, Model: Model{ID: "m", Protocol: test.protocol, Tools: true}}
			if _, err := p.Generate(context.Background(), textRequest()); err == nil {
				t.Fatal("accepted an incomplete response")
			}
		})
	}
}

func TestTextProtocolsAndToolRoundTrip(t *testing.T) {
	for _, test := range []struct{ protocol, path, response string }{
		{Chat, "/chat/completions", `{"choices":[{"message":{"tool_calls":[{"id":"call-1","function":{"name":"weather","arguments":"{\"city\":\"Paris\"}"}}]}}],"usage":{"prompt_tokens":4,"completion_tokens":7}}`},
		{Responses, "/responses", `{"status":"completed","output":[{"type":"function_call","call_id":"call-1","name":"weather","arguments":"{\"city\":\"Paris\"}"}],"usage":{"input_tokens":4,"output_tokens":7}}`},
		{Anthropic, "/messages", `{"content":[{"type":"tool_use","id":"call-1","name":"weather","input":{"city":"Paris"}}],"usage":{"input_tokens":4,"output_tokens":7}}`},
	} {
		t.Run(test.protocol, func(t *testing.T) {
			count := 0
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				count++
				if r.URL.Path != "/api/v1"+test.path {
					t.Errorf("path=%s", r.URL.Path)
				}
				if test.protocol == Anthropic {
					if r.Header.Get("x-api-key") != "test-key" || r.Header.Get("anthropic-version") == "" {
						t.Error("missing anthropic authentication")
					}
				} else if r.Header.Get("Authorization") != "Bearer test-key" {
					t.Error("missing bearer")
				}
				raw, _ := io.ReadAll(r.Body)
				if count == 2 && (!strings.Contains(string(raw), "call-1") || !strings.Contains(string(raw), "sunny")) {
					t.Errorf("tool result lost: %s", raw)
				}
				if count == 1 {
					_, _ = io.WriteString(w, test.response)
				} else {
					switch test.protocol {
					case Chat:
						_, _ = io.WriteString(w, `{"choices":[{"message":{"content":"sunny"}}]}`)
					case Responses:
						_, _ = io.WriteString(w, `{"status":"completed","output":[{"content":[{"type":"output_text","text":"sunny"}]}]}`)
					case Anthropic:
						_, _ = io.WriteString(w, `{"content":[{"type":"text","text":"sunny"}]}`)
					}
				}
			}))
			defer server.Close()
			p := &TextProvider{Definition: Definition{ID: "sample", BaseURL: server.URL + "/api/v1/"}, Model: Model{ID: "model", Protocol: test.protocol, Tools: true}, APIKey: "test-key"}
			request := textRequest()
			request.Tools = []multimodal.Tool{{Name: "weather", Parameters: map[string]multimodal.ToolParameter{"city": {Type: multimodal.ToolParameterString, Required: true}}}}
			response, err := p.Generate(context.Background(), request)
			if err != nil {
				t.Fatal(err)
			}
			if response.Usage.TotalTokens != 11 || len(response.Messages[0].ToolCalls) != 1 {
				t.Fatalf("response=%+v", response)
			}
			request.Messages = append(request.Messages, response.Messages[0], multimodal.Message{Role: multimodal.RoleTool, ToolCallID: "call-1", Parts: []multimodal.Part{{Modality: multimodal.ModalityText, Text: "sunny"}}})
			response, err = p.Generate(context.Background(), request)
			if err != nil || textParts(response.Messages[0].Parts) != "sunny" {
				t.Fatalf("round trip: %+v %v", response, err)
			}
		})
	}
}

func TestStreamingProtocols(t *testing.T) {
	for _, test := range []struct {
		protocol string
		events   []string
	}{
		{Chat, []string{`{"choices":[{"delta":{"content":"O"}}]}`, `{"choices":[{"delta":{"content":"K"},"finish_reason":"stop"}],"usage":{"prompt_tokens":2,"completion_tokens":1}}`, `[DONE]`}},
		{Responses, []string{`{"type":"response.output_text.delta","delta":"O"}`, `{"type":"response.output_text.delta","delta":"K"}`, `{"type":"response.completed","response":{"usage":{"input_tokens":2,"output_tokens":1}}}`}},
		{Anthropic, []string{`{"type":"message_start","message":{"usage":{"input_tokens":2}}}`, `{"type":"content_block_delta","delta":{"type":"text_delta","text":"OK"}}`, `{"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":1}}`, `{"type":"message_stop"}`}},
	} {
		t.Run(test.protocol, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "text/event-stream")
				for _, event := range test.events {
					_, _ = fmt.Fprintf(w, ": heartbeat\n\ndata: %s\n\n", event)
					w.(http.Flusher).Flush()
				}
			}))
			defer server.Close()
			p := &TextProvider{Definition: Definition{BaseURL: server.URL}, Model: Model{ID: "model", Protocol: test.protocol, Streaming: true}, APIKey: "key"}
			stream, err := p.Stream(context.Background(), textRequest())
			if err != nil {
				t.Fatal(err)
			}
			defer stream.Close()
			var text strings.Builder
			done := false
			for {
				event, err := stream.Recv()
				if err == io.EOF {
					break
				}
				if err != nil {
					t.Fatal(err)
				}
				text.WriteString(event.Delta)
				if event.Type == multimodal.StreamEventDone {
					done = true
					if event.Usage.TotalTokens != 3 {
						t.Errorf("usage=%+v", event.Usage)
					}
				}
			}
			if text.String() != "OK" || !done {
				t.Fatalf("text=%s done=%v", text.String(), done)
			}
		})
	}
}

func TestStreamToolArgumentFragments(t *testing.T) {
	for _, test := range []struct {
		protocol string
		events   []string
	}{
		{Chat, []string{`{"choices":[{"delta":{"tool_calls":[{"index":0,"id":"c1","function":{"name":"weather","arguments":"{\"city\":"}}]}}]}`, `{"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"\"Paris\"}"}}]},"finish_reason":"tool_calls"}]}`, `[DONE]`}},
		{Responses, []string{`{"type":"response.output_item.added","output_index":0,"item":{"type":"function_call","call_id":"c1","name":"weather","arguments":""}}`, `{"type":"response.function_call_arguments.delta","output_index":0,"delta":"{\"city\":"}`, `{"type":"response.function_call_arguments.delta","output_index":0,"delta":"\"Paris\"}"}`, `{"type":"response.completed","response":{}}`}},
		{Anthropic, []string{`{"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"c1","name":"weather"}}`, `{"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\"city\":"}}`, `{"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"\"Paris\"}"}}`, `{"type":"message_delta","delta":{"stop_reason":"tool_use"}}`, `{"type":"message_stop"}`}},
	} {
		t.Run(test.protocol, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				for _, event := range test.events {
					_, _ = fmt.Fprintf(w, "data: %s\n\n", event)
				}
			}))
			defer server.Close()
			p := &TextProvider{Definition: Definition{BaseURL: server.URL}, Model: Model{Protocol: test.protocol, Streaming: true, Tools: true}}
			reader, err := p.Stream(context.Background(), textRequest())
			if err != nil {
				t.Fatal(err)
			}
			defer reader.Close()
			args := ""
			name := ""
			for {
				event, err := reader.Recv()
				if err == io.EOF {
					break
				}
				if err != nil {
					t.Fatal(err)
				}
				if event.ToolCall != nil {
					args += event.ToolCall.Arguments
					name += event.ToolCall.Name
				}
			}
			if args != `{"city":"Paris"}` || name != "weather" {
				t.Fatalf("args=%s name=%s", args, name)
			}
		})
	}
}

func TestStreamFailureAndCancellation(t *testing.T) {
	for _, body := range []string{"data: {bad}\n\n", "data: {\"choices\":[{\"delta\":{\"content\":\"partial\"}}]}\n\n", "data: {\"error\":{\"message\":\"secret-key\"}}\n\n"} {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { _, _ = io.WriteString(w, body) }))
		p := &TextProvider{Definition: Definition{BaseURL: server.URL}, Model: Model{Protocol: Chat, Streaming: true}, APIKey: "secret-key"}
		reader, err := p.Stream(context.Background(), textRequest())
		if err != nil {
			t.Fatal(err)
		}
		for {
			_, err = reader.Recv()
			if err != nil {
				break
			}
		}
		_ = reader.Close()
		server.Close()
		if err == io.EOF || strings.Contains(err.Error(), "secret-key") {
			t.Fatalf("unsafe success/error: %v", err)
		}
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.WriteHeader(200)
		w.(http.Flusher).Flush()
		<-r.Context().Done()
	}))
	defer server.Close()
	ctx, cancel := context.WithCancel(context.Background())
	p := &TextProvider{Definition: Definition{BaseURL: server.URL}, Model: Model{Protocol: Chat, Streaming: true}}
	reader, err := p.Stream(ctx, textRequest())
	if err != nil {
		t.Fatal(err)
	}
	cancel()
	defer reader.Close()
	if _, err := reader.Recv(); err == nil {
		t.Fatal("cancel ignored")
	}
}

func TestImagesGenerationEditAndFailures(t *testing.T) {
	image := []byte("\x89PNG\r\n\x1a\nimage")
	encoded := base64.StdEncoding.EncodeToString(image)
	for _, edit := range []bool{false, true} {
		t.Run(fmt.Sprint(edit), func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if edit {
					if r.URL.Path != "/v1/images/edits" {
						t.Error(r.URL.Path)
					}
					if err := r.ParseMultipartForm(1 << 20); err != nil {
						t.Fatal(err)
					}
					defer r.MultipartForm.RemoveAll()
					for _, name := range []string{"image[]", "mask"} {
						file, _, err := r.FormFile(name)
						if err != nil {
							t.Error(err)
							continue
						}
						data, _ := io.ReadAll(file)
						_ = file.Close()
						if string(data) != string(image) {
							t.Error("image bytes changed")
						}
					}
				} else {
					if r.URL.Path != "/v1/images/generations" {
						t.Error(r.URL.Path)
					}
					var payload map[string]any
					_ = json.NewDecoder(r.Body).Decode(&payload)
					if payload["model"] != "image-model" {
						t.Error(payload)
					}
				}
				_, _ = fmt.Fprintf(w, `{"data":[{"b64_json":%q}]}`, encoded)
			}))
			defer server.Close()
			p := &ImageProvider{Definition: Definition{BaseURL: server.URL + "/v1"}, Model: Model{ID: "image-model", Generation: true, Editing: true, MaxReferenceImages: 2}}
			request := generation.Request{Prompt: "circle"}
			if edit {
				request.ReferenceURLs = []string{"data:image/png;base64," + encoded}
				request.Params = map[string]any{"mask": "data:image/png;base64," + encoded}
			}
			response, err := p.Generate(context.Background(), request)
			if err != nil || len(response.Assets) != 1 {
				t.Fatalf("response=%+v err=%v", response, err)
			}
		})
	}
	for _, body := range []string{`{"data":[]}`, `{"error":{"message":"secret"}}`, `{"data":[{"b64_json":"bad"}]}`} {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { _, _ = io.WriteString(w, body) }))
		p := &ImageProvider{Definition: Definition{BaseURL: server.URL}, Model: Model{Generation: true}, APIKey: "secret"}
		_, err := p.Generate(context.Background(), generation.Request{Prompt: "test"})
		server.Close()
		if err == nil || strings.Contains(err.Error(), "secret") {
			t.Fatalf("error=%v", err)
		}
	}
}

func TestDefinitionValidationAndIsolation(t *testing.T) {
	d := Definition{SchemaVersion: 1, ID: "demo", Name: "Demo", BaseURL: "https://example.com/v1", Models: []Model{{ID: "same", Name: "Same", Kind: generation.KindText, Protocol: Chat}}}
	if err := d.Validate(); err != nil {
		t.Fatal(err)
	}
	first := d.RouteID(d.Models[0])
	d.ID = "other"
	if first == d.RouteID(d.Models[0]) {
		t.Fatal("route identity collision")
	}
	for _, url := range []string{"file:///tmp/a", "https://user:password@host/v1", "https://host/v1?api_key=secret"} {
		d.BaseURL = url
		if d.Validate() == nil {
			t.Error("accepted", url)
		}
	}
	d.BaseURL = "http://127.0.0.1:1234/v1"
	d.Models = append(d.Models, d.Models[0])
	if d.Validate() == nil {
		t.Error("duplicate accepted")
	}
}
