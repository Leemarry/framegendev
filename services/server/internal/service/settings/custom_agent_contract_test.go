package settings

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/mediago-dev/mediago-drama/packages/core/pkg/generation"
	"github.com/mediago-dev/mediago-drama/packages/core/pkg/generation/custom"
)

// This optional contract test exercises the installed OpenCode binary, not a generated-config mock.
func TestCustomOpenCodeExecutableProtocols(t *testing.T) {
	binary := os.Getenv("MEDIAGO_TEST_OPENCODE_PATH")
	if binary == "" {
		t.Skip("set MEDIAGO_TEST_OPENCODE_PATH to verify an installed OpenCode runtime")
	}
	for _, protocol := range []string{custom.Chat, custom.Responses, custom.Anthropic} {
		t.Run(protocol, func(t *testing.T) {
			var mu sync.Mutex
			paths := []string{}
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				mu.Lock()
				paths = append(paths, r.URL.Path)
				mu.Unlock()
				var body struct {
					Stream bool `json:"stream"`
				}
				_ = json.NewDecoder(r.Body).Decode(&body)
				if protocol == custom.Anthropic {
					if r.Header.Get("x-api-key") != "contract-key" {
						t.Error("wrong Anthropic auth")
					}
				} else if r.Header.Get("Authorization") != "Bearer contract-key" {
					t.Error("wrong OpenAI auth")
				}
				if !body.Stream {
					t.Error("expected streaming runtime request")
				}
				w.Header().Set("Content-Type", "text/event-stream")
				events := []string{}
				switch protocol {
				case custom.Chat:
					events = []string{`{"id":"c1","object":"chat.completion.chunk","created":1,"model":"contract","choices":[{"index":0,"delta":{"role":"assistant","content":"OK"},"finish_reason":null}]}`, `{"id":"c1","object":"chat.completion.chunk","created":1,"model":"contract","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":1,"completion_tokens":1,"total_tokens":2}}`, `[DONE]`}
				case custom.Responses:
					events = []string{`{"type":"response.created","response":{"id":"r1","created_at":1,"model":"contract","status":"in_progress","output":[]}}`, `{"type":"response.output_item.added","output_index":0,"item":{"id":"m1","type":"message","role":"assistant","content":[]}}`, `{"type":"response.output_text.delta","item_id":"m1","output_index":0,"content_index":0,"delta":"OK"}`, `{"type":"response.output_item.done","output_index":0,"item":{"id":"m1","type":"message","role":"assistant","content":[{"type":"output_text","text":"OK","annotations":[]}]}}`, `{"type":"response.completed","response":{"id":"r1","status":"completed","usage":{"input_tokens":1,"output_tokens":1,"total_tokens":2}}}`}
				case custom.Anthropic:
					events = []string{`{"type":"message_start","message":{"id":"m1","type":"message","role":"assistant","model":"contract","content":[],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":1,"output_tokens":0}}}`, `{"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}`, `{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"OK"}}`, `{"type":"content_block_stop","index":0}`, `{"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":1}}`, `{"type":"message_stop"}`}
				}
				for _, event := range events {
					_, _ = fmt.Fprintf(w, "data: %s\n\n", event)
					w.(http.Flusher).Flush()
				}
			}))
			defer server.Close()
			root := t.TempDir()
			service := customSettings(t, filepath.Join(root, "settings.db"))
			key := "contract-key"
			d := custom.Definition{SchemaVersion: 1, ID: "contract", Name: "Contract", BaseURL: server.URL + "/v1", Enabled: true, Models: []custom.Model{{ID: "contract", Name: "Contract", Kind: generation.KindText, Protocol: protocol, Streaming: true, Tools: true, ContextWindow: 32000, MaxOutputTokens: 4096}}}
			_, err := service.SaveCustomProvider(context.Background(), "", CustomProviderMutation{Definition: d, APIKey: &key})
			if err != nil {
				t.Fatal(err)
			}
			model := d.ProviderID() + "-" + protocol + "/contract"
			config, err := service.PrepareOpenCodeRuntimeConfigForModel(context.Background(), root, model)
			if err != nil {
				t.Fatal(err)
			}
			ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
			defer cancel()
			cmd := exec.CommandContext(ctx, binary, "run", "--pure", "--format", "json", "--title", "Protocol contract", "--model", model, "--dir", root, "Reply with OK. Do not use tools.")
			cmd.Dir = root
			cmd.Env = append(os.Environ(), "OPENCODE_CONFIG="+filepath.Join(config.ConfigDir, "opencode.json"), "OPENCODE_CONFIG_DIR="+config.ConfigDir, "OPENCODE_DISABLE_MODELS_FETCH=true", "OPENCODE_DISABLE_AUTOUPDATE=true", "OPENCODE_DISABLE_DEFAULT_PLUGINS=true", "XDG_DATA_HOME="+filepath.Join(root, "data"), "XDG_CONFIG_HOME="+filepath.Join(root, "config"), "XDG_CACHE_HOME="+filepath.Join(root, "cache"), "XDG_STATE_HOME="+filepath.Join(root, "state"))
			for name, value := range config.Env {
				cmd.Env = append(cmd.Env, name+"="+value)
			}
			output, err := cmd.CombinedOutput()
			if err != nil {
				t.Fatalf("OpenCode failed: %v %s", err, custom.SafeError(string(output), key))
			}
			if !strings.Contains(string(output), `"text":"OK"`) {
				t.Fatalf("OpenCode did not return text: %s", custom.SafeError(string(output), key))
			}
			expected := "/v1/chat/completions"
			if protocol == custom.Responses {
				expected = "/v1/responses"
			}
			if protocol == custom.Anthropic {
				expected = "/v1/messages"
			}
			mu.Lock()
			defer mu.Unlock()
			if len(paths) == 0 {
				t.Fatal("runtime made no provider request")
			}
			for _, path := range paths {
				if path != expected {
					t.Errorf("protocol routed to %s, want %s", path, expected)
				}
			}
		})
	}
}
