package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestAssetCatalogRejectsInvalidPaginationParameters(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/assets", NewMediaAssets(nil).HandleAssetCatalogAssets)
	for _, path := range []string{"/assets?limit=0", "/assets?limit=201", "/assets?cursor=broken"} {
		recorder := httptest.NewRecorder()
		router.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, path, nil))
		if recorder.Code != http.StatusBadRequest {
			t.Errorf("GET %s status = %d, want %d", path, recorder.Code, http.StatusBadRequest)
		}
	}
}
