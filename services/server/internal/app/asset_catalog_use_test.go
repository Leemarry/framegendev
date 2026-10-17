package app

import (
	"encoding/json"
	"net/http"
	"path/filepath"
	"testing"

	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	"github.com/mediago-dev/mediago-drama/services/server/internal/repository"
	"github.com/mediago-dev/mediago-drama/services/server/internal/testutil"
	servicemedia "github.com/mediago-dev/mediago-drama/services/server/internal/service/media"
)

func TestAssetCatalogUseEndpointSavesIntoTargetProject(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "settings.db")
	handler := newTestHandler(t, dbPath)
	target, _ := createExternalProjectForTest(t, handler, "Use target")
	source := uploadImageAssetForTest(t, handler, "", "use-source.png")

	db, err := repository.OpenGormSQLite(testWorkspaceDBPathForSettings(dbPath))
	if err != nil {
		t.Fatalf("OpenGormSQLite() error = %v", err)
	}
	testutil.CloseDB(t, db)
	if err := db.Create(&domain.DocumentSectionModel{
		ProjectID:  target.ID,
		SectionID:  "section-use",
		DocumentID: "document-use",
		Type:       "storyboard",
		Title:      "开场分镜",
		Status:     "active",
	}).Error; err != nil {
		t.Fatalf("creating section: %v", err)
	}

	payload := func(operationID string) string {
		encoded, err := json.Marshal(map[string]any{
			"operationId": operationID,
			"projectId":   target.ID,
			"target":      map[string]string{"documentId": "document-use", "sectionId": "section-use"},
			"assetIds":    []string{source.ID},
		})
		if err != nil {
			t.Fatalf("encoding payload: %v", err)
		}
		return string(encoded)
	}

	post := func(path string, body string, status int) servicemedia.AssetCatalogUseResponse {
		t.Helper()
		response := requestJSON(t, handler, http.MethodPost, path, body)
		defer response.Body.Close()
		content := readBody(t, response.Body)
		if response.StatusCode != status {
			t.Fatalf("POST %s: %d want %d: %s", path, response.StatusCode, status, content)
		}
		if status != http.StatusOK {
			return servicemedia.AssetCatalogUseResponse{}
		}
		var envelope struct {
			Data servicemedia.AssetCatalogUseResponse `json:"data"`
		}
		if err := json.Unmarshal([]byte(content), &envelope); err != nil {
			t.Fatalf("decoding use response: %v", err)
		}
		return envelope.Data
	}

	first := post("/api/v1/asset-catalog/use", payload("op-api-first"), http.StatusOK)
	if len(first.Items) != 1 {
		t.Fatalf("use response = %+v, want one item", first.Items)
	}
	if first.Items[0].Error != "" || !first.Items[0].Added || first.Items[0].SourceID != source.ID {
		t.Fatalf("use item = %+v, want a saved candidate", first.Items[0])
	}
	copiedID := first.Items[0].AssetID
	if copiedID == "" || copiedID == source.ID {
		t.Fatalf("use item asset id = %q, want a project copy", copiedID)
	}

	response := requestJSON(t, handler, http.MethodGet, "/api/v1/projects/"+target.ID+"/media-assets", "")
	projectAssets := readBody(t, response.Body)
	response.Body.Close()
	var projectEnvelope struct {
		Data servicemedia.MediaAssetsResponse `json:"data"`
	}
	if err := json.Unmarshal([]byte(projectAssets), &projectEnvelope); err != nil {
		t.Fatalf("decoding project assets: %v", err)
	}
	owned := 0
	for _, asset := range projectEnvelope.Data.Assets {
		if asset.ProjectID == target.ID {
			owned++
			if asset.ID != copiedID {
				t.Fatalf("project asset = %+v, want the copy %s", asset, copiedID)
			}
		}
	}
	if owned != 1 {
		t.Fatalf("project assets = %s, want exactly one owned copy", projectAssets)
	}

	response = requestJSON(t, handler, http.MethodGet, "/api/v1/projects/"+target.ID+"/generation/selected-assets", "")
	selected := readBody(t, response.Body)
	response.Body.Close()
	var selectedEnvelope struct {
		Data struct {
			Assets []struct {
				MediaAssetID string `json:"mediaAssetId"`
				ResourceID   string `json:"resourceId"`
			} `json:"assets"`
		} `json:"data"`
	}
	if err := json.Unmarshal([]byte(selected), &selectedEnvelope); err != nil {
		t.Fatalf("decoding selected assets: %v", err)
	}
	found := false
	for _, asset := range selectedEnvelope.Data.Assets {
		if asset.MediaAssetID == copiedID && asset.ResourceID == "section-use" {
			found = true
		}
	}
	if !found {
		t.Fatalf("selected assets = %s, want the section candidate", selected)
	}

	replay := post("/api/v1/asset-catalog/use", payload("op-api-first"), http.StatusOK)
	if len(replay.Items) != 1 || replay.Items[0].AssetID != copiedID || !replay.Items[0].Added {
		t.Fatalf("replay = %+v, want the first response", replay.Items)
	}

	scoped := post("/api/v1/projects/"+target.ID+"/asset-catalog/use", payload("op-api-scoped"), http.StatusOK)
	if len(scoped.Items) != 1 || scoped.Items[0].AssetID != copiedID || scoped.Items[0].Error != "" {
		t.Fatalf("project scoped use = %+v, want the same copy", scoped.Items)
	}

	post("/api/v1/asset-catalog/use", `{"projectId":"`+target.ID+`","assetIds":["x"]}`, http.StatusBadRequest)
	post("/api/v1/asset-catalog/use", `{"operationId":"op-api-unknown-section","projectId":"`+target.ID+`","target":{"documentId":"document-use","sectionId":"section-missing"},"assetIds":["`+source.ID+`"]}`, http.StatusNotFound)
}
