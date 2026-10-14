package app

import (
	"net/http"
	"path/filepath"
	"strings"
	"testing"
)

func TestLibraryMetadataAPI(t *testing.T) {
	handler := newTestHandler(t, filepath.Join(t.TempDir(), "settings.db"))
	project, _ := createExternalProjectForTest(t, handler, "Metadata")
	other, _ := createExternalProjectForTest(t, handler, "Other")
	asset := uploadImageAssetForTest(t, handler, project.ID, "original.png")
	path := "/api/v1/projects/" + project.ID + "/media-assets/" + asset.ID
	for _, tc := range []struct {
		name, path, body string
		status           int
	}{
		{"save", path, `{"tags":["主角"," 夜景 "],"note":"中文备注","rating":4}`, 200},
		{"rename compatibility", path, `{"filename":"renamed.png"}`, 200},
		{"partial", path, `{"rating":5}`, 200},
		{"cross project", "/api/v1/projects/" + other.ID + "/media-assets/" + asset.ID, `{"note":"wrong"}`, 404},
		{"wrong global", "/api/v1/media-assets/" + asset.ID, `{"note":"wrong"}`, 404},
		{"missing", path + "missing", `{"note":"wrong"}`, 404},
		{"high", path, `{"rating":6}`, 400}, {"negative", path, `{"rating":-1}`, 400}, {"fraction", path, `{"rating":1.5}`, 400},
		{"tag type", path, `{"tags":"wrong"}`, 400}, {"note type", path, `{"note":7}`, 400},
		{"empty", path, `{}`, 400}, {"null", path, `{"note":null}`, 400},
	} {
		t.Run(tc.name, func(t *testing.T) {
			response := requestJSON(t, handler, http.MethodPut, tc.path, tc.body)
			defer response.Body.Close()
			body := readBody(t, response.Body)
			if response.StatusCode != tc.status {
				t.Fatalf("status %d want %d: %s", response.StatusCode, tc.status, body)
			}
		})
	}
	list := requestJSON(t, handler, http.MethodGet, "/api/v1/projects/"+project.ID+"/media-assets?q="+"%E5%A4%9C%E6%99%AF", "")
	defer list.Body.Close()
	body := readBody(t, list.Body)
	if !strings.Contains(body, asset.ID) || !strings.Contains(body, `"note":"中文备注"`) || !strings.Contains(body, `"rating":5`) || strings.Contains(body, "wrong") {
		t.Fatalf("persisted search: %s", body)
	}
	clear := requestJSON(t, handler, http.MethodPut, path, `{"tags":[],"note":"","rating":0}`)
	defer clear.Body.Close()
	body = readBody(t, clear.Body)
	if clear.StatusCode != 200 || !strings.Contains(body, `"tags":[]`) || !strings.Contains(body, `"note":""`) || !strings.Contains(body, `"rating":0`) || !strings.Contains(body, asset.URL) {
		t.Fatalf("clear: %s", body)
	}
}
