package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/mediago-dev/mediago-drama/services/server/internal/repository"
	settings "github.com/mediago-dev/mediago-drama/services/server/internal/service/settings"
	"github.com/mediago-dev/mediago-drama/services/server/internal/testutil"
)

func TestCustomProviderHTTPContract(t *testing.T) {
	gin.SetMode(gin.TestMode)
	path := filepath.Join(t.TempDir(), "settings.db")
	store, err := repository.NewAppSettingRepository(path)
	if err != nil {
		t.Fatal(err)
	}
	db, err := repository.OpenGormSQLite(path)
	if err != nil {
		t.Fatal(err)
	}
	testutil.CloseDB(t, db)
	handler := NewSettings(settings.NewSettingsWithStores(repository.NewAPIKeyStore(path), nil, store))
	router := gin.New()
	router.GET("/providers", handler.HandleCustomProviders)
	router.POST("/providers", handler.HandleSaveCustomProvider)
	router.PUT("/providers/:id", handler.HandleSaveCustomProvider)
	router.DELETE("/providers/:id", handler.HandleDeleteCustomProvider)
	router.POST("/validate", handler.HandleValidateCustomProvider)
	router.PUT("/providers/:id/api-key", handler.HandleCustomProviderKey)
	request := func(method, path, body string, status int) []byte {
		t.Helper()
		recorder := httptest.NewRecorder()
		req := httptest.NewRequest(method, path, strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(recorder, req)
		if recorder.Code != status {
			t.Fatalf("%s %s: %d %s", method, path, recorder.Code, recorder.Body.String())
		}
		if bytes.Contains(recorder.Body.Bytes(), []byte("top-secret-key")) {
			t.Fatal("credential exposed")
		}
		return recorder.Body.Bytes()
	}
	definition := `{"schemaVersion":1,"id":"http-test","name":"HTTP test","baseURL":"https://example.com/v1","enabled":true,"models":[{"id":"model","name":"Model","kind":"text","protocol":"openai-completions"}]}`
	request(http.MethodPost, "/validate", strings.Replace(definition, `"schemaVersion":1`, `"schemaVersion":2`, 1), 400)
	request(http.MethodPost, "/validate", strings.Replace(definition, `"schemaVersion":1`, `"apiKey":"top-secret-key","schemaVersion":1`, 1), 400)
	request(http.MethodPost, "/validate", definition+" {}", 400)
	raw := request(http.MethodPost, "/providers", `{"definition":`+definition+`,"apiKey":"top-secret-key"}`, 200)
	var result struct {
		Data settings.CustomProvider `json:"data"`
	}
	if err := json.Unmarshal(raw, &result); err != nil {
		t.Fatal(err)
	}
	request(http.MethodPost, "/providers", `{"definition":`+definition+`}`, 409)
	request(http.MethodPut, "/providers/http-test", `{"definition":`+definition+`,"revision":"old"}`, 409)
	request(http.MethodPut, "/providers/http-test/api-key", `{"revision":"old","apiKey":"replacement"}`, 409)
	request(http.MethodGet, "/providers", "", 200)
	request(http.MethodDelete, "/providers/http-test?revision="+result.Data.Revision, "", 200)
	request(http.MethodDelete, "/providers/http-test?revision="+result.Data.Revision, "", 404)
}
