package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/mediago-dev/mediago-drama/services/server/internal/service/workflow"
)

func TestWorkflowExecutionDoesNotFabricateSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler := NewWorkflowExecutionHandler(&workflow.ExecutionService{})
	for _, tc := range []struct {
		name, method, path, body string
		handle                   gin.HandlerFunc
		status                   int
	}{
		{"start", http.MethodPost, "/workflows/:id/execute", `{}`, handler.ExecuteWorkflow, http.StatusNotImplemented},
		{"empty start", http.MethodPost, "/workflows/:id/execute", "", handler.ExecuteWorkflow, http.StatusNotImplemented},
		{"invalid JSON", http.MethodPost, "/workflows/:id/execute", `{`, handler.ExecuteWorkflow, http.StatusBadRequest},
		{"read", http.MethodGet, "/workflows/:id/executions/:execId", "", handler.GetExecution, http.StatusNotImplemented},
		{"cancel", http.MethodDelete, "/workflows/:id/executions/:execId", "", handler.CancelExecution, http.StatusNotImplemented},
		{"retry", http.MethodPost, "/workflows/:id/executions/:execId/retry", `{}`, handler.RetryExecution, http.StatusNotImplemented},
	} {
		t.Run(tc.name, func(t *testing.T) {
			router := gin.New()
			router.Handle(tc.method, tc.path, tc.handle)
			path := strings.ReplaceAll(strings.ReplaceAll(tc.path, ":id", "workflow"), ":execId", "execution")
			request := httptest.NewRequest(tc.method, path, strings.NewReader(tc.body))
			request.Header.Set("Content-Type", "application/json")
			recorder := httptest.NewRecorder()
			router.ServeHTTP(recorder, request)
			if recorder.Code != tc.status || !strings.Contains(recorder.Body.String(), `"success":false`) {
				t.Fatalf("status=%d body=%s", recorder.Code, recorder.Body.String())
			}
		})
	}
}
