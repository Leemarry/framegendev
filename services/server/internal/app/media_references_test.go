package app

import (
	"encoding/json"
	"net/http"
	"path/filepath"
	"testing"

	servicemedia "github.com/mediago-dev/mediago-drama/services/server/internal/service/media"
)

func TestMediaReferencesIncludesDocumentsThroughAPI(t *testing.T) {
	handler := newTestHandler(t, filepath.Join(t.TempDir(), "settings.db"))
	project, _ := createExternalProjectForTest(t, handler, "Reference project")
	asset := uploadImageAssetForTest(t, handler, "", "reference.png")
	request := func(method, path, body string, status int) string {
		t.Helper()
		response := requestJSON(t, handler, method, path, body)
		defer response.Body.Close()
		content := readBody(t, response.Body)
		if response.StatusCode != status {
			t.Fatalf("%s %s: %d want %d: %s", method, path, response.StatusCode, status, content)
		}
		return content
	}
	base := "/api/v1/projects/" + project.ID
	payload, err := json.Marshal(map[string]string{
		"id": "reference-document", "title": "Referenced document", "category": "scene",
		"content": "# Referenced document\n\nInline ![image](" + asset.URL + ")\n\n![again](" + asset.URL + ")",
	})
	if err != nil {
		t.Fatal(err)
	}
	request(http.MethodPost, base+"/workspace/documents", string(payload), 200)
	request(http.MethodPost, base+"/generation/selected-assets", `{"mediaAssetId":"`+asset.ID+`","resourceType":"scene","resourceTitle":"Selected scene"}`, 200)
	before := request(http.MethodGet, base+"/workspace/documents", "", 200)
	for _, path := range []string{"/api/v1/media-assets", base + "/media-assets"} {
		var envelope struct {
			Data servicemedia.MediaAssetsResponse `json:"data"`
		}
		if err := json.Unmarshal([]byte(request(http.MethodGet, path+"?includeUsage=true", "", 200)), &envelope); err != nil {
			t.Fatal(err)
		}
		if len(envelope.Data.Assets) != 1 || envelope.Data.Assets[0].Usage == nil ||
			!envelope.Data.Assets[0].Usage.Selected || !envelope.Data.Assets[0].Usage.Reference || envelope.Data.Assets[0].Usage.Candidate {
			t.Fatalf("wrong real selection/document usage: %+v", envelope.Data.Assets)
		}
		envelope.Data = servicemedia.MediaAssetsResponse{}
		if err := json.Unmarshal([]byte(request(http.MethodGet, path, "", 200)), &envelope); err != nil {
			t.Fatal(err)
		}
		if envelope.Data.Assets[0].Usage != nil {
			t.Fatal("default response gained usage")
		}
		request(http.MethodGet, path+"?includeUsage=invalid", "", 400)
	}
	for _, path := range []string{"/api/v1/media-assets/" + asset.ID + "/references", base + "/media-assets/" + asset.ID + "/references"} {
		var envelope struct {
			Data servicemedia.MediaAssetReferencesResponse `json:"data"`
		}
		body := request(http.MethodGet, path, "", 200)
		if err := json.Unmarshal([]byte(body), &envelope); err != nil {
			t.Fatal(err)
		}
		if len(envelope.Data.References) != 2 {
			t.Fatalf("expected document and selection references: %s", body)
		}
		var document, selection bool
		for _, ref := range envelope.Data.References {
			if ref.ProjectID != project.ID || ref.ProjectName != project.Name {
				t.Fatalf("wrong project: %#v", ref)
			}
			if ref.Source == "document" && ref.DocumentID == "reference-document" && ref.ResourceTitle == "Referenced document" {
				document = true
			}
			if ref.Source == "selection" {
				selection = true
			}
		}
		if !document || !selection {
			t.Fatalf("missing source identities: %s", body)
		}
	}
	after := request(http.MethodGet, base+"/workspace/documents", "", 200)
	if before != after {
		t.Fatal("reference lookup changed persisted document state")
	}
	request(http.MethodGet, "/api/v1/media-assets/missing/references", "", 404)
}
