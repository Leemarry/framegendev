package handlers

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	"github.com/mediago-dev/mediago-drama/services/server/internal/http/dto"
	workflowservice "github.com/mediago-dev/mediago-drama/services/server/internal/service/workflow"
)

type fakeWorkflowHandlerService struct {
	created      dto.CreateWorkflowRequest
	createResult dto.WorkflowDocument
	createErr    error

	updateID     string
	updated      dto.UpdateWorkflowRequest
	updateResult dto.WorkflowDocument
	updateErr    error

	getID     string
	getResult dto.WorkflowDocument
	getErr    error

	listQuery  [3]string
	listResult dto.WorkflowListResponse
	listErr    error

	deletedID string
	deleteErr error

	category        string
	templatesResult dto.WorkflowTemplateListResponse
	templatesErr    error
}

func (service *fakeWorkflowHandlerService) CreateWorkflow(_ context.Context, request dto.CreateWorkflowRequest) (dto.WorkflowDocument, error) {
	service.created = request
	return service.createResult, service.createErr
}

func (service *fakeWorkflowHandlerService) GetWorkflow(_ context.Context, id string) (dto.WorkflowDocument, error) {
	service.getID = id
	return service.getResult, service.getErr
}

func (service *fakeWorkflowHandlerService) ListWorkflows(_ context.Context, projectID string, shotName string, documentID string) (dto.WorkflowListResponse, error) {
	service.listQuery = [3]string{projectID, shotName, documentID}
	return service.listResult, service.listErr
}

func (service *fakeWorkflowHandlerService) UpdateWorkflow(_ context.Context, id string, request dto.UpdateWorkflowRequest) (dto.WorkflowDocument, error) {
	service.updateID = id
	service.updated = request
	return service.updateResult, service.updateErr
}

func (service *fakeWorkflowHandlerService) DeleteWorkflow(_ context.Context, id string) error {
	service.deletedID = id
	return service.deleteErr
}

func (service *fakeWorkflowHandlerService) ListTemplates(_ context.Context, category string) (dto.WorkflowTemplateListResponse, error) {
	service.category = category
	return service.templatesResult, service.templatesErr
}

func TestHandleCreateWorkflow(t *testing.T) {
	gin.SetMode(gin.ReleaseMode)
	service := &fakeWorkflowHandlerService{
		createResult: dto.WorkflowDocument{ID: "wf-1", Name: "方案1", SchemaVersion: 4},
	}
	router := gin.New()
	router.POST("/workflows", NewWorkflows(service).HandleCreateWorkflow)

	request := httptest.NewRequest(http.MethodPost, "/workflows", strings.NewReader(`{
		"projectId":"proj-1",
		"documentId":"doc-1",
		"shotName":"shot-001",
		"name":"方案1",
		"templateRef":"tpl-1"
	}`))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200: %s", response.Code, response.Body.String())
	}
	if service.created.ProjectID != "proj-1" || service.created.TemplateRef != "tpl-1" {
		t.Fatalf("request = %+v, want decoded create payload", service.created)
	}
	if !strings.Contains(response.Body.String(), `"id":"wf-1"`) {
		t.Fatalf("body = %s, want workflow document", response.Body.String())
	}
}

func TestHandleCreateWorkflowValidation(t *testing.T) {
	gin.SetMode(gin.ReleaseMode)
	service := &fakeWorkflowHandlerService{
		createErr: &workflowservice.ValidationError{Message: "工作流名称不能为空"},
	}
	router := gin.New()
	router.POST("/workflows", NewWorkflows(service).HandleCreateWorkflow)

	request := httptest.NewRequest(http.MethodPost, "/workflows", strings.NewReader(`{}`))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	if response.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400: %s", response.Code, response.Body.String())
	}
	if body := response.Body.String(); !strings.Contains(body, "工作流名称不能为空") || !strings.Contains(body, `"success":false`) {
		t.Fatalf("body = %s, want validation error envelope", body)
	}
}

func TestHandleGetWorkflowNotFound(t *testing.T) {
	gin.SetMode(gin.ReleaseMode)
	service := &fakeWorkflowHandlerService{
		getErr: fmt.Errorf("getting workflow wf-missing: %w", workflowservice.ErrWorkflowNotFound),
	}
	router := gin.New()
	router.GET("/workflows/:id", NewWorkflows(service).HandleGetWorkflow)

	request := httptest.NewRequest(http.MethodGet, "/workflows/wf-missing", nil)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	if response.Code != http.StatusNotFound || !strings.Contains(response.Body.String(), "工作流不存在") {
		t.Fatalf("status = %d body = %s, want 404", response.Code, response.Body.String())
	}
	if service.getID != "wf-missing" {
		t.Fatalf("getID = %q, want wf-missing", service.getID)
	}
}

func TestHandleListWorkflows(t *testing.T) {
	gin.SetMode(gin.ReleaseMode)
	service := &fakeWorkflowHandlerService{
		listResult: dto.WorkflowListResponse{Workflows: []dto.WorkflowSummary{{ID: "wf-1", NodeCount: 2}}},
	}
	router := gin.New()
	router.GET("/workflows", NewWorkflows(service).HandleListWorkflows)

	request := httptest.NewRequest(http.MethodGet, "/workflows?projectId=proj-1&shotName=shot-001&documentId=doc-1", nil)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200: %s", response.Code, response.Body.String())
	}
	if service.listQuery != [3]string{"proj-1", "shot-001", "doc-1"} {
		t.Fatalf("query = %v, want forwarded filters", service.listQuery)
	}
	if !strings.Contains(response.Body.String(), `"nodeCount":2`) {
		t.Fatalf("body = %s, want node count", response.Body.String())
	}
}

func TestHandleUpdateWorkflowDecodesGraph(t *testing.T) {
	gin.SetMode(gin.ReleaseMode)
	service := &fakeWorkflowHandlerService{
		updateResult: dto.WorkflowDocument{ID: "wf-1", Name: "新名称", SchemaVersion: 4},
	}
	router := gin.New()
	router.PUT("/workflows/:id", NewWorkflows(service).HandleUpdateWorkflow)

	request := httptest.NewRequest(http.MethodPut, "/workflows/wf-1", strings.NewReader(`{
		"name":"新名称",
		"graphData":{
			"schemaVersion":4,
			"nodes":[],
			"edges":[],
			"viewport":{"x":12,"y":34,"zoom":1}
		}
	}`))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200: %s", response.Code, response.Body.String())
	}
	if service.updateID != "wf-1" || service.updated.Name == nil || *service.updated.Name != "新名称" {
		t.Fatalf("update = %+v id = %q, want decoded name", service.updated, service.updateID)
	}
	if service.updated.GraphData == nil || service.updated.GraphData.Viewport.X != 12 {
		t.Fatalf("graphData = %+v, want decoded viewport", service.updated.GraphData)
	}
}

func TestHandleDeleteWorkflow(t *testing.T) {
	gin.SetMode(gin.ReleaseMode)
	service := &fakeWorkflowHandlerService{}
	router := gin.New()
	router.DELETE("/workflows/:id", NewWorkflows(service).HandleDeleteWorkflow)

	request := httptest.NewRequest(http.MethodDelete, "/workflows/wf-1", nil)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	if response.Code != http.StatusOK || service.deletedID != "wf-1" {
		t.Fatalf("status = %d id = %q, want 200 and wf-1", response.Code, service.deletedID)
	}
	if !strings.Contains(response.Body.String(), `"deleted":true`) {
		t.Fatalf("body = %s, want deletion envelope", response.Body.String())
	}
}

func TestHandleListWorkflowTemplates(t *testing.T) {
	gin.SetMode(gin.ReleaseMode)
	service := &fakeWorkflowHandlerService{
		templatesResult: dto.WorkflowTemplateListResponse{
			Templates: []dto.WorkflowTemplateSummary{{ID: "tpl-1", Name: "内置", Category: domain.WorkflowTemplateCategoryBuiltin}},
		},
	}
	router := gin.New()
	router.GET("/workflow-templates", NewWorkflows(service).HandleListWorkflowTemplates)

	request := httptest.NewRequest(http.MethodGet, "/workflow-templates?category=builtin", nil)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	if response.Code != http.StatusOK || service.category != "builtin" {
		t.Fatalf("status = %d category = %q, want 200 and builtin", response.Code, service.category)
	}
	if !strings.Contains(response.Body.String(), "tpl-1") {
		t.Fatalf("body = %s, want template list", response.Body.String())
	}
}
