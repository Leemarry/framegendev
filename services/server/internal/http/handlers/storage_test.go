package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/mediago-dev/mediago-drama/services/server/internal/http/response"
	servicedocument "github.com/mediago-dev/mediago-drama/services/server/internal/service/document"
)

type storageProjectSourceFixture struct {
	root     string
	projects []servicedocument.ProjectStorageRoot
	err      error
}

func (fixture storageProjectSourceFixture) Dir() string { return fixture.root }
func (fixture storageProjectSourceFixture) ListRegisteredProjectStorageRoots() ([]servicedocument.ProjectStorageRoot, error) {
	return fixture.projects, fixture.err
}

func TestStorageRoutesRequireCurrentPreviewAndReturnPerFileCleanup(t *testing.T) {
	gin.SetMode(gin.TestMode)
	root := t.TempDir()
	project := filepath.Join(root, "project")
	posterRoot := filepath.Join(project, ".mediago-drama", "cache", "media-posters")
	if err := os.MkdirAll(posterRoot, 0o700); err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"one.poster.jpg", "two.poster.jpg"} {
		if err := os.WriteFile(filepath.Join(posterRoot, name), []byte("poster"), 0o600); err != nil {
			t.Fatal(err)
		}
	}
	sourceFile := filepath.Join(project, "source.keep")
	if err := os.WriteFile(sourceFile, []byte("source"), 0o600); err != nil {
		t.Fatal(err)
	}
	engine := gin.New()
	handler := NewStorage(storageProjectSourceFixture{
		root:     root,
		projects: []servicedocument.ProjectStorageRoot{{ID: "p1", Path: project}},
	})
	engine.GET("/storage/statistics", handler.HandleStatistics)
	engine.POST("/storage/poster-cache/preview", handler.HandlePosterPreview)
	engine.POST("/storage/poster-cache/cleanup", handler.HandlePosterCleanup)

	statistics := performStorageRequest(t, engine, http.MethodGet, "/storage/statistics", "")
	if statistics.Code != http.StatusOK || bytes.Contains(statistics.Body.Bytes(), []byte(filepath.Clean(project))) {
		t.Fatalf("statistics response = %d %s; it must not expose project paths", statistics.Code, statistics.Body.String())
	}
	preview := performStorageRequest(t, engine, http.MethodPost, "/storage/poster-cache/preview", "{}")
	var previewEnvelope response.Envelope
	if err := json.Unmarshal(preview.Body.Bytes(), &previewEnvelope); err != nil {
		t.Fatal(err)
	}
	var firstPayload struct {
		Candidates []struct {
			ID string `json:"id"`
		} `json:"candidates"`
	}
	if err := json.Unmarshal(previewEnvelope.Data, &firstPayload); err != nil || len(firstPayload.Candidates) != 2 {
		t.Fatalf("preview data = %s, err = %v", previewEnvelope.Data, err)
	}
	secondPreview := performStorageRequest(t, engine, http.MethodPost, "/storage/poster-cache/preview", "{}")
	var secondEnvelope response.Envelope
	if err := json.Unmarshal(secondPreview.Body.Bytes(), &secondEnvelope); err != nil {
		t.Fatal(err)
	}
	var secondPayload struct {
		Candidates []struct {
			ID string `json:"id"`
		} `json:"candidates"`
	}
	if err := json.Unmarshal(secondEnvelope.Data, &secondPayload); err != nil || len(secondPayload.Candidates) != 2 {
		t.Fatalf("second preview data = %s, err = %v", secondEnvelope.Data, err)
	}
	cleanupBody, err := json.Marshal(map[string][]string{"ids": {firstPayload.Candidates[0].ID, secondPayload.Candidates[1].ID}})
	if err != nil {
		t.Fatal(err)
	}
	partial := performStorageRequest(t, engine, http.MethodPost, "/storage/poster-cache/cleanup", string(cleanupBody))
	if partial.Code != http.StatusOK || !bytes.Contains(partial.Body.Bytes(), []byte(`"removed":1`)) || !bytes.Contains(partial.Body.Bytes(), []byte(`"skipped":1`)) {
		t.Fatalf("partial cleanup response = %d %s, want one removed and one stale skipped", partial.Code, partial.Body.String())
	}
	invalid := performStorageRequest(t, engine, http.MethodPost, "/storage/poster-cache/cleanup", `{"ids":[]}`)
	if invalid.Code != http.StatusBadRequest {
		t.Fatalf("empty cleanup request status = %d, want 400", invalid.Code)
	}
	entries, err := os.ReadDir(posterRoot)
	if err != nil || len(entries) != 1 {
		t.Fatalf("poster files after cleanup = %d, err=%v; want one retained file", len(entries), err)
	}
	if _, err := os.Stat(sourceFile); err != nil {
		t.Fatalf("cleanup changed source file: %v", err)
	}
}

func performStorageRequest(t *testing.T, handler http.Handler, method, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	request := httptest.NewRequest(method, path, bytes.NewBufferString(body))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)
	return recorder
}
