package app

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestGenerationGlobalMediaPathsUseConfiguredWorkspace(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "settings.db")
	handler := newTestHandler(t, dbPath)
	project, _ := createExternalProjectForTest(t, handler, "Configured media roots")
	asset := uploadImageAssetForTest(t, handler, "", "global-path.png")
	root := filepath.Join(filepath.Dir(dbPath), "assets") + string(filepath.Separator)
	if !strings.HasPrefix(asset.DownloadPath, root) {
		t.Fatalf("uploaded media path=%q outside configured media directory=%q", asset.DownloadPath, root)
	}
	before, err := os.ReadFile(asset.DownloadPath)
	if err != nil {
		t.Fatal(err)
	}
	expected, err := json.Marshal(asset.DownloadPath)
	if err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct{ method, path, body string }{
		{http.MethodPost, "/api/v1/generation/sessions/configured-root-fixture/media-assets/import", fmt.Sprintf(`{"kind":"image","conversationTitle":"Configured roots","assetIds":[%q]}`, asset.ID)},
		{http.MethodGet, "/api/v1/generation/sessions/configured-root-fixture/tasks?kind=image", ""},
		{http.MethodPost, "/api/v1/projects/" + project.ID + "/generation/selected-assets", fmt.Sprintf(`{"resourceType":"character","mediaAssetId":%q}`, asset.ID)},
		{http.MethodGet, "/api/v1/projects/" + project.ID + "/generation/selected-assets", ""},
	} {
		response := requestJSON(t, handler, tc.method, tc.path, tc.body)
		body := readBody(t, response.Body)
		response.Body.Close()
		if response.StatusCode != http.StatusOK || !strings.Contains(body, `"downloadPath":`+string(expected)) {
			t.Errorf("%s %s status=%d body=%s, want configured path=%s", tc.method, tc.path, response.StatusCode, body, expected)
		}
	}
	after, err := os.ReadFile(asset.DownloadPath)
	if err != nil || string(before) != string(after) {
		t.Fatalf("media changed after projection: error=%v", err)
	}
}
