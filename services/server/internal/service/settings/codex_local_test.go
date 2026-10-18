package settings

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestImportLocalCodex(t *testing.T) {
	for _, tc := range []struct {
		name, config, auth string
		wantError, relay   bool
	}{
		{"relay", "model='gpt-test'\nmodel_provider='custom'\n[model_providers.custom]\nbase_url='https://example.com/v1'\nwire_api='responses'\nexperimental_bearer_token='private-test-key'", "", false, true},
		{"official", "", `{"tokens":{"access_token":"private-test-key"}}`, false, false},
		{"missing auth", "", "", true, false},
		{"bad config redacted", "secret='private-test-key", "", true, false},
		{"unsupported relay", "model_provider='custom'\n[model_providers.custom]\nwire_api='chat'", "", true, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			source, target := t.TempDir(), t.TempDir()
			if err := os.WriteFile(filepath.Join(source, "config.toml"), []byte(tc.config), 0o600); err != nil {
				t.Fatal(err)
			}
			if tc.auth != "" {
				if err := os.WriteFile(filepath.Join(source, "auth.json"), []byte(tc.auth), 0o600); err != nil {
					t.Fatal(err)
				}
			}
			service := NewSettingsWithStores(&memoryAPIKeyStore{values: map[string]string{}}, nil, &memoryAppSettingStore{values: map[string]string{}})
			service.SetCodexCLIPath("unused")
			service.SetCodexAccountHome(target)
			result, err := service.importLocalCodex(context.Background(), source)
			if (err != nil) != tc.wantError {
				t.Fatalf("unexpected error: %v", err)
			}
			if err != nil {
				if strings.Contains(err.Error(), "private-test-key") {
					t.Fatal("secret in error")
				}
				return
			}
			if result.Enabled != tc.relay {
				t.Fatalf("wrong channel: %#v", result)
			}
			encoded, _ := json.Marshal(result)
			if strings.Contains(string(encoded), "private-test-key") {
				t.Fatal("secret in response")
			}
			config, _ := os.ReadFile(filepath.Join(source, "config.toml"))
			if string(config) != tc.config {
				t.Fatal("source config changed")
			}
			if tc.relay {
				repeated, err := service.importLocalCodex(context.Background(), source)
				if err != nil || len(repeated.Profiles) != 1 {
					t.Fatal("repeat import duplicated profile", err)
				}
			} else {
				auth, _ := os.ReadFile(filepath.Join(target, "auth.json"))
				if string(auth) != tc.auth {
					t.Fatal("official auth not imported")
				}
				runtime, err := service.PrepareCodexRelayRuntimeConfig(context.Background(), t.TempDir(), "")
				if err != nil || runtime.Env["CODEX_HOME"] != target {
					t.Fatal("official runtime uses wrong home", err)
				}
			}
		})
	}
}
