package workflow

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	"github.com/mediago-dev/mediago-drama/services/server/internal/http/dto"
	"github.com/mediago-dev/mediago-drama/services/server/internal/repository"
)

type fakeWorkflowStore struct {
	workflows     map[string]*domain.Workflow
	projectExists bool
	projectErr    error
	createErr     error
	updateErr     error
	deleteErr     error
	listErr       error
	updateCalls   int
	lastFilter    [3]string
}

func newFakeWorkflowStore() *fakeWorkflowStore {
	return &fakeWorkflowStore{
		workflows:     map[string]*domain.Workflow{},
		projectExists: true,
	}
}

func (store *fakeWorkflowStore) Create(_ context.Context, workflow *domain.Workflow) (*domain.Workflow, error) {
	if store.createErr != nil {
		return nil, store.createErr
	}
	stored := cloneWorkflow(workflow)
	store.workflows[stored.ID] = stored
	return cloneWorkflow(stored), nil
}

func (store *fakeWorkflowStore) GetByID(_ context.Context, id string) (*domain.Workflow, error) {
	workflow, ok := store.workflows[id]
	if !ok {
		return nil, repository.ErrRecordNotFound
	}
	return cloneWorkflow(workflow), nil
}

func (store *fakeWorkflowStore) List(_ context.Context, projectID string, shotName string, documentID string) ([]*domain.Workflow, error) {
	if store.listErr != nil {
		return nil, store.listErr
	}
	store.lastFilter = [3]string{projectID, shotName, documentID}

	result := make([]*domain.Workflow, 0, len(store.workflows))
	for _, workflow := range store.workflows {
		if workflow.ProjectID != projectID {
			continue
		}
		if shotName != "" && workflow.ShotName != shotName {
			continue
		}
		if documentID != "" && workflow.DocumentID != documentID {
			continue
		}
		result = append(result, cloneWorkflow(workflow))
	}
	return result, nil
}

func (store *fakeWorkflowStore) Update(_ context.Context, workflow *domain.Workflow) (*domain.Workflow, error) {
	if store.updateErr != nil {
		return nil, store.updateErr
	}
	store.updateCalls++
	if _, ok := store.workflows[workflow.ID]; !ok {
		return nil, repository.ErrRecordNotFound
	}
	stored := cloneWorkflow(workflow)
	store.workflows[stored.ID] = stored
	return cloneWorkflow(stored), nil
}

func (store *fakeWorkflowStore) Delete(_ context.Context, id string) error {
	if store.deleteErr != nil {
		return store.deleteErr
	}
	if _, ok := store.workflows[id]; !ok {
		return repository.ErrRecordNotFound
	}
	delete(store.workflows, id)
	return nil
}

func (store *fakeWorkflowStore) ProjectExists(_ context.Context, _ string) (bool, error) {
	return store.projectExists, store.projectErr
}

type fakeTemplateStore struct {
	templates    map[string]*domain.WorkflowTemplate
	listErr      error
	lastCategory string
}

func newFakeTemplateStore(templates ...*domain.WorkflowTemplate) *fakeTemplateStore {
	store := &fakeTemplateStore{templates: map[string]*domain.WorkflowTemplate{}}
	for _, template := range templates {
		store.templates[template.ID] = template
	}
	return store
}

func (store *fakeTemplateStore) GetByID(_ context.Context, id string) (*domain.WorkflowTemplate, error) {
	template, ok := store.templates[id]
	if !ok {
		return nil, repository.ErrRecordNotFound
	}
	cloned := *template
	cloned.GraphData = template.GraphData.Clone()
	return &cloned, nil
}

func (store *fakeTemplateStore) List(_ context.Context, category string) ([]*domain.WorkflowTemplate, error) {
	if store.listErr != nil {
		return nil, store.listErr
	}
	store.lastCategory = category

	result := make([]*domain.WorkflowTemplate, 0, len(store.templates))
	for _, template := range store.templates {
		if category != "" && template.Category != category {
			continue
		}
		cloned := *template
		cloned.GraphData = template.GraphData.Clone()
		result = append(result, &cloned)
	}
	return result, nil
}

func newTestService(workflows *fakeWorkflowStore, templates *fakeTemplateStore) *Service {
	service := NewService(workflows, templates, nil)
	service.newID = func() string { return "wf-test" }
	service.now = func() time.Time {
		return time.Date(2026, 10, 18, 10, 30, 0, 0, time.UTC)
	}
	return service
}

func TestCreateWorkflowBlank(t *testing.T) {
	workflows := newFakeWorkflowStore()
	service := newTestService(workflows, newFakeTemplateStore())

	document, err := service.CreateWorkflow(context.Background(), dto.CreateWorkflowRequest{
		ProjectID:  "proj-1",
		DocumentID: "doc-1",
		ShotName:   "shot-001",
		Name:       " 方案1 ",
	})
	if err != nil {
		t.Fatalf("CreateWorkflow() error = %v", err)
	}

	if document.ID != "wf-test" || document.Name != "方案1" {
		t.Fatalf("document = %+v, want trimmed name and generated id", document)
	}
	if document.SchemaVersion != domain.WorkflowSchemaVersion4 {
		t.Fatalf("schemaVersion = %d, want %d", document.SchemaVersion, domain.WorkflowSchemaVersion4)
	}
	if document.GraphData.Nodes == nil || document.GraphData.Edges == nil {
		t.Fatalf("graphData = %+v, want empty arrays", document.GraphData)
	}
	if len(document.GraphData.Nodes) != 0 || document.TemplateRef != nil {
		t.Fatalf("document = %+v, want blank graph without template ref", document)
	}
	if document.CreatedAt != "2026-10-18T10:30:00Z" {
		t.Fatalf("createdAt = %q, want deterministic timestamp", document.CreatedAt)
	}
	if workflows.workflows["wf-test"] == nil {
		t.Fatal("workflow was not persisted")
	}
}

func TestCreateWorkflowFromTemplate(t *testing.T) {
	templateStore := newFakeTemplateStore(&domain.WorkflowTemplate{
		ID:        "tpl-image-video",
		Name:      "通用图生视频",
		Category:  domain.WorkflowTemplateCategoryBuiltin,
		GraphData: graphWithNode("node-1"),
	})
	service := newTestService(newFakeWorkflowStore(), templateStore)

	document, err := service.CreateWorkflow(context.Background(), dto.CreateWorkflowRequest{
		ProjectID:   "proj-1",
		DocumentID:  "doc-1",
		ShotName:    "shot-001",
		Name:        "方案2",
		TemplateRef: "tpl-image-video",
	})
	if err != nil {
		t.Fatalf("CreateWorkflow() error = %v", err)
	}

	if document.TemplateRef == nil || *document.TemplateRef != "tpl-image-video" {
		t.Fatalf("templateRef = %v, want tpl-image-video", document.TemplateRef)
	}
	if document.GraphData.NodeCount() != 1 {
		t.Fatalf("nodeCount = %d, want copied template node", document.GraphData.NodeCount())
	}
}

func TestCreateWorkflowTemplateNotFound(t *testing.T) {
	service := newTestService(newFakeWorkflowStore(), newFakeTemplateStore())

	_, err := service.CreateWorkflow(context.Background(), dto.CreateWorkflowRequest{
		ProjectID:   "proj-1",
		DocumentID:  "doc-1",
		ShotName:    "shot-001",
		Name:        "方案2",
		TemplateRef: "tpl-missing",
	})
	if !errors.Is(err, ErrTemplateNotFound) {
		t.Fatalf("CreateWorkflow() error = %v, want ErrTemplateNotFound", err)
	}
}

func TestCreateWorkflowProjectNotFound(t *testing.T) {
	workflows := newFakeWorkflowStore()
	workflows.projectExists = false
	service := newTestService(workflows, newFakeTemplateStore())

	_, err := service.CreateWorkflow(context.Background(), dto.CreateWorkflowRequest{
		ProjectID:  "proj-missing",
		DocumentID: "doc-1",
		ShotName:   "shot-001",
		Name:       "方案1",
	})
	if !errors.Is(err, ErrProjectNotFound) {
		t.Fatalf("CreateWorkflow() error = %v, want ErrProjectNotFound", err)
	}
}

func TestCreateWorkflowValidation(t *testing.T) {
	valid := dto.CreateWorkflowRequest{
		ProjectID:  "proj-1",
		DocumentID: "doc-1",
		ShotName:   "shot-001",
		Name:       "方案1",
	}
	tests := []struct {
		name   string
		mutate func(*dto.CreateWorkflowRequest)
		want   string
	}{
		{name: "missing project", mutate: func(request *dto.CreateWorkflowRequest) { request.ProjectID = "  " }, want: "projectId"},
		{name: "missing document", mutate: func(request *dto.CreateWorkflowRequest) { request.DocumentID = "" }, want: "documentId"},
		{name: "missing shot", mutate: func(request *dto.CreateWorkflowRequest) { request.ShotName = "" }, want: "shotName"},
		{name: "blank name", mutate: func(request *dto.CreateWorkflowRequest) { request.Name = "  " }, want: "名称"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			request := valid
			test.mutate(&request)
			service := newTestService(newFakeWorkflowStore(), newFakeTemplateStore())

			_, err := service.CreateWorkflow(context.Background(), request)
			var validationErr *ValidationError
			if !errors.As(err, &validationErr) {
				t.Fatalf("CreateWorkflow() error = %v, want ValidationError", err)
			}
			if !strings.Contains(validationErr.Message, test.want) {
				t.Fatalf("message = %q, want %q", validationErr.Message, test.want)
			}
		})
	}
}

func TestUpdateWorkflowForksTemplateOnGraphChange(t *testing.T) {
	workflows := newFakeWorkflowStore()
	workflows.workflows["wf-1"] = &domain.Workflow{
		ID:            "wf-1",
		ProjectID:     "proj-1",
		DocumentID:    "doc-1",
		ShotName:      "shot-001",
		Name:          "模板方案",
		SchemaVersion: domain.WorkflowSchemaVersion4,
		GraphData:     domain.EmptyGraphData(),
		TemplateRef:   stringPointer("tpl-1"),
		UpdatedAt:     time.Date(2026, 10, 18, 9, 0, 0, 0, time.UTC),
	}
	service := newTestService(workflows, newFakeTemplateStore())
	graph := graphWithNode("node-1")

	document, err := service.UpdateWorkflow(context.Background(), "wf-1", dto.UpdateWorkflowRequest{
		GraphData: &graph,
	})
	if err != nil {
		t.Fatalf("UpdateWorkflow() error = %v", err)
	}

	if document.TemplateRef != nil {
		t.Fatalf("templateRef = %v, want nil after canvas edit", document.TemplateRef)
	}
	if workflows.workflows["wf-1"].TemplateRef != nil {
		t.Fatal("stored templateRef was not cleared")
	}
	if document.GraphData.NodeCount() != 1 {
		t.Fatalf("nodeCount = %d, want 1", document.GraphData.NodeCount())
	}
}

func TestUpdateWorkflowKeepsTemplateRefWhenGraphUnchanged(t *testing.T) {
	workflows := newFakeWorkflowStore()
	workflows.workflows["wf-1"] = &domain.Workflow{
		ID:            "wf-1",
		ProjectID:     "proj-1",
		DocumentID:    "doc-1",
		ShotName:      "shot-001",
		Name:          "模板方案",
		SchemaVersion: domain.WorkflowSchemaVersion4,
		GraphData:     graphWithNode("node-1"),
		TemplateRef:   stringPointer("tpl-1"),
	}
	service := newTestService(workflows, newFakeTemplateStore())
	graph := graphWithNode("node-1")

	document, err := service.UpdateWorkflow(context.Background(), "wf-1", dto.UpdateWorkflowRequest{
		GraphData: &graph,
	})
	if err != nil {
		t.Fatalf("UpdateWorkflow() error = %v", err)
	}

	if document.TemplateRef == nil || *document.TemplateRef != "tpl-1" {
		t.Fatalf("templateRef = %v, want kept tpl-1", document.TemplateRef)
	}
	if workflows.updateCalls != 0 {
		t.Fatalf("updateCalls = %d, want no write for an unchanged graph", workflows.updateCalls)
	}
}

func TestUpdateWorkflowRenameKeepsTemplateRef(t *testing.T) {
	workflows := newFakeWorkflowStore()
	workflows.workflows["wf-1"] = &domain.Workflow{
		ID:            "wf-1",
		ProjectID:     "proj-1",
		DocumentID:    "doc-1",
		ShotName:      "shot-001",
		Name:          "旧名称",
		SchemaVersion: domain.WorkflowSchemaVersion4,
		GraphData:     domain.EmptyGraphData(),
		TemplateRef:   stringPointer("tpl-1"),
	}
	service := newTestService(workflows, newFakeTemplateStore())
	name := "新名称"

	document, err := service.UpdateWorkflow(context.Background(), "wf-1", dto.UpdateWorkflowRequest{Name: &name})
	if err != nil {
		t.Fatalf("UpdateWorkflow() error = %v", err)
	}

	if document.Name != "新名称" || document.TemplateRef == nil {
		t.Fatalf("document = %+v, want renamed workflow that keeps its template ref", document)
	}
}

func TestUpdateWorkflowRejectsInvalidSchemaVersion(t *testing.T) {
	workflows := newFakeWorkflowStore()
	workflows.workflows["wf-1"] = &domain.Workflow{
		ID:            "wf-1",
		ProjectID:     "proj-1",
		SchemaVersion: domain.WorkflowSchemaVersion4,
		GraphData:     domain.EmptyGraphData(),
	}
	service := newTestService(workflows, newFakeTemplateStore())
	graph := graphWithNode("node-1")
	graph.SchemaVersion = 3

	_, err := service.UpdateWorkflow(context.Background(), "wf-1", dto.UpdateWorkflowRequest{GraphData: &graph})
	var validationErr *ValidationError
	if !errors.As(err, &validationErr) {
		t.Fatalf("UpdateWorkflow() error = %v, want ValidationError", err)
	}
	if workflows.updateCalls != 0 {
		t.Fatalf("updateCalls = %d, want no write", workflows.updateCalls)
	}
}

func TestUpdateWorkflowRequiresFields(t *testing.T) {
	service := newTestService(newFakeWorkflowStore(), newFakeTemplateStore())

	_, err := service.UpdateWorkflow(context.Background(), "wf-1", dto.UpdateWorkflowRequest{})
	var validationErr *ValidationError
	if !errors.As(err, &validationErr) {
		t.Fatalf("UpdateWorkflow() error = %v, want ValidationError", err)
	}
}

func TestListWorkflowsReturnsSummaries(t *testing.T) {
	workflows := newFakeWorkflowStore()
	workflows.workflows["wf-1"] = &domain.Workflow{
		ID:          "wf-1",
		ProjectID:   "proj-1",
		DocumentID:  "doc-1",
		ShotName:    "shot-001",
		Name:        "方案1",
		GraphData:   graphWithNode("node-1"),
		TemplateRef: stringPointer("tpl-1"),
		UpdatedAt:   time.Date(2026, 10, 18, 10, 30, 0, 0, time.UTC),
	}
	workflows.workflows["wf-2"] = &domain.Workflow{
		ID:         "wf-2",
		ProjectID:  "proj-1",
		DocumentID: "doc-1",
		ShotName:   "shot-001",
		Name:       "方案2",
		GraphData:  domain.EmptyGraphData(),
	}
	service := newTestService(workflows, newFakeTemplateStore())

	result, err := service.ListWorkflows(context.Background(), "proj-1", "shot-001", "doc-1")
	if err != nil {
		t.Fatalf("ListWorkflows() error = %v", err)
	}
	if len(result.Workflows) != 2 {
		t.Fatalf("workflows = %d, want 2", len(result.Workflows))
	}
	if workflows.lastFilter != [3]string{"proj-1", "shot-001", "doc-1"} {
		t.Fatalf("filter = %v, want forwarded query values", workflows.lastFilter)
	}

	counts := map[string]int{}
	for _, summary := range result.Workflows {
		counts[summary.ID] = summary.NodeCount
	}
	if counts["wf-1"] != 1 || counts["wf-2"] != 0 {
		t.Fatalf("node counts = %v, want 1 and 0", counts)
	}
}

func TestDeleteWorkflowNotFound(t *testing.T) {
	service := newTestService(newFakeWorkflowStore(), newFakeTemplateStore())

	err := service.DeleteWorkflow(context.Background(), "wf-missing")
	if !errors.Is(err, ErrWorkflowNotFound) {
		t.Fatalf("DeleteWorkflow() error = %v, want ErrWorkflowNotFound", err)
	}
}

func TestListTemplatesFiltersAndValidatesCategory(t *testing.T) {
	templateStore := newFakeTemplateStore(
		&domain.WorkflowTemplate{ID: "tpl-builtin", Name: "内置", Category: domain.WorkflowTemplateCategoryBuiltin, GraphData: domain.EmptyGraphData()},
		&domain.WorkflowTemplate{ID: "tpl-custom", Name: "自定义", Category: domain.WorkflowTemplateCategoryCustom, GraphData: domain.EmptyGraphData()},
	)
	service := newTestService(newFakeWorkflowStore(), templateStore)

	result, err := service.ListTemplates(context.Background(), "builtin")
	if err != nil {
		t.Fatalf("ListTemplates() error = %v", err)
	}
	if len(result.Templates) != 1 || result.Templates[0].ID != "tpl-builtin" {
		t.Fatalf("templates = %+v, want only the builtin template", result.Templates)
	}
	if templateStore.lastCategory != "builtin" {
		t.Fatalf("category = %q, want builtin", templateStore.lastCategory)
	}

	_, err = service.ListTemplates(context.Background(), "market")
	var validationErr *ValidationError
	if !errors.As(err, &validationErr) {
		t.Fatalf("ListTemplates() error = %v, want ValidationError", err)
	}
}

func TestServiceSurfacesInitializationError(t *testing.T) {
	service := NewService(nil, nil, errors.New("database unavailable"))

	_, err := service.ListWorkflows(context.Background(), "proj-1", "", "")
	if err == nil || !strings.Contains(err.Error(), "database unavailable") {
		t.Fatalf("ListWorkflows() error = %v, want initialization failure", err)
	}
}

func graphWithNode(id string) domain.GraphData {
	graph := domain.EmptyGraphData()
	graph.Nodes = append(graph.Nodes, json.RawMessage(`{"id":"`+id+`"}`))
	return graph
}

func stringPointer(value string) *string {
	return &value
}

func cloneWorkflow(workflow *domain.Workflow) *domain.Workflow {
	cloned := *workflow
	cloned.GraphData = workflow.GraphData.Clone()
	if workflow.TemplateRef != nil {
		cloned.TemplateRef = stringPointer(*workflow.TemplateRef)
	}
	return &cloned
}
