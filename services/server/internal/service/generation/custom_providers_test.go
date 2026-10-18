package generation

import (
	"context"
	"encoding/base64"
	"fmt"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	core "github.com/mediago-dev/mediago-drama/packages/core/pkg/generation"
	"github.com/mediago-dev/mediago-drama/packages/core/pkg/generation/custom"
	"github.com/mediago-dev/mediago-drama/services/server/internal/repository"
	"github.com/mediago-dev/mediago-drama/services/server/internal/service/settings"
)

func TestCustomGenerationRouteSnapshotAndPersistence(t *testing.T) {
	var calls atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		if r.Header.Get("Authorization") != "Bearer original-key" {
			t.Error("in-flight credential changed")
		}
		if r.URL.Path == "/v1/chat/completions" {
			_, _ = w.Write([]byte(`{"choices":[{"message":{"content":"OK"}}]}`))
			return
		}
		if r.URL.Path != "/v1/images/generations" {
			t.Error(r.URL.Path)
		}
		_, _ = fmt.Fprintf(w, `{"data":[{"b64_json":%q}]}`, base64.StdEncoding.EncodeToString([]byte("image-bytes")))
	}))
	defer server.Close()
	path := filepath.Join(t.TempDir(), "settings.db")
	store, err := repository.NewAppSettingRepository(path)
	if err != nil {
		t.Fatal(err)
	}
	service := settings.NewSettingsWithStores(repository.NewAPIKeyStore(path), nil, store)
	ctx := context.Background()
	key := "original-key"
	d := custom.Definition{SchemaVersion: 1, ID: "test", Name: "Custom", BaseURL: server.URL + "/v1", Enabled: true, Models: []custom.Model{{ID: "text", Name: "Text", Kind: core.KindText, Protocol: custom.Chat}, {ID: "image", Name: "Image", Kind: core.KindImage, Protocol: custom.Images, Generation: true}}}
	item, err := service.SaveCustomProvider(ctx, "", settings.CustomProviderMutation{Definition: d, APIKey: &key})
	if err != nil {
		t.Fatal(err)
	}
	mediaAssets := newTestMediaAssets(t, path, t.TempDir())
	tasks := newTestGenerationTaskService(t, path, func(prefix string) (string, error) { return fmt.Sprintf("%s-%d", prefix, calls.Load()), nil })
	workflow := NewGenerationService(service, tasks, mediaAssets)
	catalog := workflow.ListGenerationModels()
	found := 0
	for _, route := range catalog.Routes {
		if strings.HasPrefix(route.ID, "custom-") {
			found++
			if !route.Configured {
				t.Error("custom route unavailable")
			}
		}
	}
	if found != 2 {
		t.Fatalf("custom routes=%d", found)
	}
	result, status, err := workflow.CreateGenerationMessage(ctx, GenerationMessageRequest{Kind: "image", RouteID: d.RouteID(d.Models[1]), Prompt: "circle"})
	if err != nil || status >= 400 {
		t.Fatalf("generation status=%d result=%+v err=%v", status, result, err)
	}
	for deadline := time.Now().Add(5 * time.Second); result.Status == "submitted" || result.Status == "running"; {
		if time.Now().After(deadline) {
			t.Fatal("generation did not finish")
		}
		time.Sleep(10 * time.Millisecond)
		result, status, err = workflow.GetGenerationVideo(ctx, result.ID)
		if err != nil {
			t.Fatal(err)
		}
	}
	if result.Status != "completed" {
		t.Fatalf("generation failed: %+v", result)
	}
	if len(result.Assets) != 1 || !strings.Contains(result.Assets[0].URL, "/media-assets/") {
		t.Fatalf("asset not persisted: %+v", result)
	}
	route, err := workflow.resolveGenerationRoute(GenerationMessageRequest{RouteID: d.RouteID(d.Models[0])})
	if err != nil {
		t.Fatal(err)
	}
	d.BaseURL = "http://127.0.0.1:1/v1"
	replacement := "new-key"
	item, err = service.SaveCustomProvider(ctx, d.ID, settings.CustomProviderMutation{Definition: d, Revision: item.Revision, APIKey: &replacement})
	if err != nil {
		t.Fatal(err)
	}
	provider, err := workflow.newGenerationProvider(route)
	if err != nil {
		t.Fatal(err)
	}
	response, err := provider.Generate(ctx, core.Request{Kind: core.KindText, Model: "text", Prompt: "hello"})
	if err != nil || response.Text != "OK" {
		t.Fatal(response, err)
	}
	if err := service.DeleteCustomProvider(ctx, d.ID, item.Revision); err != nil {
		t.Fatal(err)
	}
	if _, err := workflow.resolveGenerationRoute(GenerationMessageRequest{RouteID: route.ID}); err == nil {
		t.Fatal("deleted route callable")
	}
	assets, err := mediaAssets.List("")
	if err != nil || len(assets) != 1 {
		t.Fatalf("history assets removed: %v %v", assets, err)
	}
	if calls.Load() != 2 {
		t.Fatalf("unexpected requests: %d", calls.Load())
	}
}
