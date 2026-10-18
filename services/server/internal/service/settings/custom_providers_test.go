package settings

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/mediago-dev/mediago-drama/packages/core/pkg/generation"
	"github.com/mediago-dev/mediago-drama/packages/core/pkg/generation/custom"
	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	"github.com/mediago-dev/mediago-drama/services/server/internal/repository"
	"github.com/mediago-dev/mediago-drama/services/server/internal/testutil"
)

func customSettings(t *testing.T, path string) *Settings {
	t.Helper()
	store, err := repository.NewAppSettingRepository(path)
	if err != nil {
		t.Fatal(err)
	}
	db, err := repository.OpenGormSQLite(path)
	if err != nil {
		t.Fatal(err)
	}
	testutil.CloseDB(t, db)
	return NewSettingsWithStores(repository.NewAPIKeyStore(path), nil, store)
}
func customDefinition() custom.Definition {
	return custom.Definition{SchemaVersion: 1, ID: "test", Name: "Test", BaseURL: "https://example.invalid/v1", Enabled: true, Models: []custom.Model{{ID: "same/model", Name: "Model", Kind: generation.KindText, Protocol: custom.Chat, Streaming: true, Tools: true}}}
}

func TestCustomProviderPersistenceCASAndKeys(t *testing.T) {
	ctx := context.Background()
	path := filepath.Join(t.TempDir(), "settings.db")
	service := customSettings(t, path)
	key := "private-custom-key"
	created, err := service.SaveCustomProvider(ctx, "", CustomProviderMutation{Definition: customDefinition(), APIKey: &key})
	if err != nil {
		t.Fatal(err)
	}
	if !created.Configured || created.Revision == "" {
		t.Fatal(created)
	}
	service = customSettings(t, path)
	items, err := service.ListCustomProviders(ctx)
	if err != nil || len(items) != 1 {
		t.Fatalf("items=%v err=%v", items, err)
	}
	raw, _ := json.Marshal(items)
	if strings.Contains(string(raw), key) {
		t.Fatal("credential exposed")
	}
	updated := created.Definition
	updated.Name = "Updated"
	current, err := service.SaveCustomProvider(ctx, updated.ID, CustomProviderMutation{Definition: updated, Revision: created.Revision})
	if err != nil {
		t.Fatal(err)
	}
	if !current.Configured {
		t.Fatal("key lost on update")
	}
	badKey := "must-not-write"
	_, err = service.SaveCustomProvider(ctx, updated.ID, CustomProviderMutation{Definition: updated, Revision: created.Revision, APIKey: &badKey})
	if !errors.Is(err, domain.ErrSettingsRevisionConflict) {
		t.Fatalf("stale err=%v", err)
	}
	_, _, actual, err := service.ResolveCustomRoute(ctx, updated.RouteID(updated.Models[0]))
	if err != nil || actual != key {
		t.Fatalf("credential changed on rejected write: %v", err)
	}
	_, err = service.SaveCustomProvider(ctx, "", CustomProviderMutation{Definition: updated, APIKey: &badKey})
	if !errors.Is(err, domain.ErrSettingsRevisionConflict) {
		t.Fatalf("duplicate err=%v", err)
	}
	cleared, err := service.SetCustomProviderKey(ctx, updated.ID, current.Revision, "")
	if err != nil || cleared.Configured {
		t.Fatalf("clear: %v %v", cleared, err)
	}
	if err := service.DeleteCustomProvider(ctx, updated.ID, cleared.Revision); err != nil {
		t.Fatal(err)
	}
	items, err = service.ListCustomProviders(ctx)
	if err != nil || len(items) != 0 {
		t.Fatal(items, err)
	}
}

func TestCustomProviderTestInvalidationAndDiscovery(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v1/models" {
			_, _ = w.Write([]byte(`{"data":[{"id":"same/model"}]}`))
			return
		}
		_, _ = w.Write([]byte(`{"choices":[{"message":{"content":"OK"}}]}`))
	}))
	defer server.Close()
	service := customSettings(t, filepath.Join(t.TempDir(), "settings.db"))
	d := customDefinition()
	d.BaseURL = server.URL + "/v1"
	key := "test-key"
	ctx := context.Background()
	item, err := service.SaveCustomProvider(ctx, "", CustomProviderMutation{Definition: d, APIKey: &key})
	if err != nil {
		t.Fatal(err)
	}
	models, err := service.DiscoverCustomModels(ctx, CustomModelDiscovery{ProviderID: d.ID, Revision: item.Revision, BaseURL: d.BaseURL, Protocol: custom.Chat})
	if err != nil || len(models) != 1 {
		t.Fatal(models, err)
	}
	_, err = service.DiscoverCustomModels(ctx, CustomModelDiscovery{ProviderID: d.ID, Revision: item.Revision, BaseURL: server.URL + "/other", Protocol: custom.Chat})
	if !errors.Is(err, custom.ErrInvalid) {
		t.Fatal("stored key sent to altered address", err)
	}
	result, err := service.TestCustomProvider(ctx, d.ID, CustomProviderTestRequest{Revision: item.Revision, ModelID: d.Models[0].ID, Protocol: custom.Chat, Operation: "text"})
	if err != nil || !result.Passed {
		t.Fatal(result, err)
	}
	items, _ := service.ListCustomProviders(ctx)
	if len(items[0].Tests) != 1 {
		t.Fatal("missing test evidence")
	}
	d.Enabled = false
	item, err = service.SaveCustomProvider(ctx, d.ID, CustomProviderMutation{Definition: d, Revision: item.Revision})
	if err != nil || len(item.Tests) != 0 {
		t.Fatal(item, err)
	}
	if _, _, _, err := service.ResolveCustomRoute(ctx, d.RouteID(d.Models[0])); err == nil {
		t.Fatal("disabled provider resolved")
	}
}

func TestCustomOpenCodeProtocolConfig(t *testing.T) {
	service := customSettings(t, filepath.Join(t.TempDir(), "settings.db"))
	d := customDefinition()
	key := "private-runtime-key"
	d.Models = nil
	for _, protocol := range []string{custom.Chat, custom.Responses, custom.Anthropic} {
		d.Models = append(d.Models, custom.Model{ID: "same-model", Name: protocol, Kind: generation.KindText, Protocol: protocol, Tools: true, Streaming: true, ContextWindow: 32000, MaxOutputTokens: 4096})
	}
	_, err := service.SaveCustomProvider(context.Background(), "", CustomProviderMutation{Definition: d, APIKey: &key})
	if err != nil {
		t.Fatal(err)
	}
	config, err := service.PrepareOpenCodeRuntimeConfig(context.Background(), t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	raw, err := os.ReadFile(filepath.Join(config.ConfigDir, "opencode.json"))
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(raw), key) {
		t.Fatal("key embedded in runtime file")
	}
	var parsed openCodeConfigFile
	if err := json.Unmarshal(raw, &parsed); err != nil {
		t.Fatal(err)
	}
	for _, protocol := range []string{custom.Chat, custom.Responses, custom.Anthropic} {
		provider := parsed.Provider[d.ProviderID()+"-"+protocol]
		if provider.NPM != customAgentNPM(protocol) || provider.Options.BaseURL != d.BaseURL || !provider.Models["same-model"].ToolCall {
			t.Fatalf("protocol %s config=%+v", protocol, provider)
		}
	}
	if len(config.AllowedModelValues) != 3 {
		t.Fatalf("models=%v", config.AllowedModelValues)
	}
}
