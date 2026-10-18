// Package workflow implements workflow document and template business rules.
package workflow

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	"github.com/mediago-dev/mediago-drama/services/server/internal/http/dto"
	"github.com/mediago-dev/mediago-drama/services/server/internal/repository"
	serviceshared "github.com/mediago-dev/mediago-drama/services/server/internal/service/shared"
)

// Workflow service sentinel errors mapped to HTTP status codes by handlers.
var (
	// ErrWorkflowNotFound reports a missing workflow document.
	ErrWorkflowNotFound = errors.New("workflow not found")
	// ErrTemplateNotFound reports a missing template reference.
	ErrTemplateNotFound = errors.New("workflow template not found")
	// ErrProjectNotFound reports a missing owner project.
	ErrProjectNotFound = errors.New("project not found")
)

// ValidationError marks a client-supplied value that failed validation.
type ValidationError struct {
	Message string
}

// Error returns the user-facing validation message.
func (err *ValidationError) Error() string {
	return err.Message
}

// WorkflowStore is the persistence boundary required by the workflow service.
type WorkflowStore interface {
	Create(ctx context.Context, workflow *domain.Workflow) (*domain.Workflow, error)
	GetByID(ctx context.Context, id string) (*domain.Workflow, error)
	List(ctx context.Context, projectID string, shotName string, documentID string) ([]*domain.Workflow, error)
	Update(ctx context.Context, workflow *domain.Workflow) (*domain.Workflow, error)
	Delete(ctx context.Context, id string) error
	ProjectExists(ctx context.Context, projectID string) (bool, error)
}

// TemplateStore is the persistence boundary for the template library.
type TemplateStore interface {
	GetByID(ctx context.Context, id string) (*domain.WorkflowTemplate, error)
	List(ctx context.Context, category string) ([]*domain.WorkflowTemplate, error)
}

// Service owns workflow document lifecycle and template fork rules.
type Service struct {
	workflows WorkflowStore
	templates TemplateStore
	initErr   error
	newID     func() string
	now       func() time.Time
}

// NewService returns a workflow service. initErr is surfaced by every call so
// a partially initialized server fails loudly instead of serving blank data.
func NewService(workflows WorkflowStore, templates TemplateStore, initErr error) *Service {
	service := &Service{
		workflows: workflows,
		templates: templates,
		initErr:   initErr,
		newID: func() string {
			return serviceshared.MustRandomID("wf")
		},
		now: time.Now,
	}
	if service.initErr == nil && (workflows == nil || templates == nil) {
		service.initErr = errors.New("workflow repository is nil")
	}
	return service
}

// CreateWorkflow creates a blank workflow or a copy of a referenced template.
func (service *Service) CreateWorkflow(ctx context.Context, request dto.CreateWorkflowRequest) (dto.WorkflowDocument, error) {
	if err := service.ready(); err != nil {
		return dto.WorkflowDocument{}, err
	}

	projectID := strings.TrimSpace(request.ProjectID)
	documentID := strings.TrimSpace(request.DocumentID)
	shotName := strings.TrimSpace(request.ShotName)
	name := strings.TrimSpace(request.Name)
	switch {
	case projectID == "":
		return dto.WorkflowDocument{}, validationError("缺少 projectId")
	case documentID == "":
		return dto.WorkflowDocument{}, validationError("缺少 documentId")
	case shotName == "":
		return dto.WorkflowDocument{}, validationError("缺少 shotName")
	case name == "":
		return dto.WorkflowDocument{}, validationError("工作流名称不能为空")
	}

	exists, err := service.workflows.ProjectExists(ctx, projectID)
	if err != nil {
		return dto.WorkflowDocument{}, fmt.Errorf("checking project %s: %w", projectID, err)
	}
	if !exists {
		return dto.WorkflowDocument{}, fmt.Errorf("creating workflow: %w", ErrProjectNotFound)
	}

	templateRef := strings.TrimSpace(request.TemplateRef)
	graph := domain.EmptyGraphData()
	if templateRef != "" {
		template, err := service.templates.GetByID(ctx, templateRef)
		if err != nil {
			if repository.IsRecordNotFound(err) {
				return dto.WorkflowDocument{}, fmt.Errorf("loading template %s: %w", templateRef, ErrTemplateNotFound)
			}
			return dto.WorkflowDocument{}, fmt.Errorf("loading template %s: %w", templateRef, err)
		}
		graph = template.GraphData.Clone()
		graph.Normalize()
		if err := domain.ValidateGraphData(&graph); err != nil {
			return dto.WorkflowDocument{}, fmt.Errorf("template %s has an invalid graph: %w", templateRef, err)
		}
	}

	now := service.now().UTC()
	workflow := &domain.Workflow{
		ID:            service.newID(),
		ProjectID:     projectID,
		DocumentID:    documentID,
		ShotName:      shotName,
		Name:          name,
		Description:   strings.TrimSpace(request.Description),
		SchemaVersion: domain.WorkflowSchemaVersion4,
		GraphData:     graph,
		TemplateRef:   optionalString(templateRef),
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	stored, err := service.workflows.Create(ctx, workflow)
	if err != nil {
		return dto.WorkflowDocument{}, fmt.Errorf("creating workflow: %w", err)
	}
	return workflowDocumentFromDomain(*stored), nil
}

// GetWorkflow returns one workflow document.
func (service *Service) GetWorkflow(ctx context.Context, id string) (dto.WorkflowDocument, error) {
	if err := service.ready(); err != nil {
		return dto.WorkflowDocument{}, err
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return dto.WorkflowDocument{}, validationError("缺少工作流 ID")
	}

	workflow, err := service.workflows.GetByID(ctx, id)
	if err != nil {
		if repository.IsRecordNotFound(err) {
			return dto.WorkflowDocument{}, fmt.Errorf("getting workflow %s: %w", id, ErrWorkflowNotFound)
		}
		return dto.WorkflowDocument{}, fmt.Errorf("getting workflow %s: %w", id, err)
	}
	return workflowDocumentFromDomain(*workflow), nil
}

// ListWorkflows returns workflow summaries for one project.
func (service *Service) ListWorkflows(ctx context.Context, projectID string, shotName string, documentID string) (dto.WorkflowListResponse, error) {
	if err := service.ready(); err != nil {
		return dto.WorkflowListResponse{}, err
	}
	projectID = strings.TrimSpace(projectID)
	if projectID == "" {
		return dto.WorkflowListResponse{}, validationError("缺少 projectId")
	}

	workflows, err := service.workflows.List(ctx, projectID, shotName, documentID)
	if err != nil {
		return dto.WorkflowListResponse{}, fmt.Errorf("listing workflows for project %s: %w", projectID, err)
	}

	summaries := make([]dto.WorkflowSummary, 0, len(workflows))
	for _, workflow := range workflows {
		summaries = append(summaries, workflowSummaryFromDomain(*workflow))
	}
	return dto.WorkflowListResponse{Workflows: summaries}, nil
}

// UpdateWorkflow updates metadata and/or the canvas. Editing a template-backed
// canvas clears TemplateRef so the document becomes an independent fork.
func (service *Service) UpdateWorkflow(ctx context.Context, id string, request dto.UpdateWorkflowRequest) (dto.WorkflowDocument, error) {
	if err := service.ready(); err != nil {
		return dto.WorkflowDocument{}, err
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return dto.WorkflowDocument{}, validationError("缺少工作流 ID")
	}
	if request.Name == nil && request.Description == nil && request.GraphData == nil {
		return dto.WorkflowDocument{}, validationError("没有需要更新的字段")
	}

	workflow, err := service.workflows.GetByID(ctx, id)
	if err != nil {
		if repository.IsRecordNotFound(err) {
			return dto.WorkflowDocument{}, fmt.Errorf("updating workflow %s: %w", id, ErrWorkflowNotFound)
		}
		return dto.WorkflowDocument{}, fmt.Errorf("loading workflow %s: %w", id, err)
	}

	changed := false
	if request.Name != nil {
		name := strings.TrimSpace(*request.Name)
		if name == "" {
			return dto.WorkflowDocument{}, validationError("工作流名称不能为空")
		}
		if name != workflow.Name {
			workflow.Name = name
			changed = true
		}
	}
	if request.Description != nil {
		description := strings.TrimSpace(*request.Description)
		if description != workflow.Description {
			workflow.Description = description
			changed = true
		}
	}
	if request.GraphData != nil {
		graph := request.GraphData.Clone()
		graph.Normalize()
		if err := domain.ValidateGraphData(&graph); err != nil {
			return dto.WorkflowDocument{}, &ValidationError{Message: err.Error()}
		}
		if !domain.GraphsEqual(graph, workflow.GraphData) {
			workflow.GraphData = graph
			if workflow.TemplateRef != nil {
				workflow.TemplateRef = nil
			}
			changed = true
		}
	}

	if !changed {
		return workflowDocumentFromDomain(*workflow), nil
	}

	stored, err := service.workflows.Update(ctx, workflow)
	if err != nil {
		if repository.IsRecordNotFound(err) {
			return dto.WorkflowDocument{}, fmt.Errorf("updating workflow %s: %w", id, ErrWorkflowNotFound)
		}
		return dto.WorkflowDocument{}, fmt.Errorf("updating workflow %s: %w", id, err)
	}
	return workflowDocumentFromDomain(*stored), nil
}

// DeleteWorkflow removes one workflow document.
func (service *Service) DeleteWorkflow(ctx context.Context, id string) error {
	if err := service.ready(); err != nil {
		return err
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return validationError("缺少工作流 ID")
	}

	if err := service.workflows.Delete(ctx, id); err != nil {
		if repository.IsRecordNotFound(err) {
			return fmt.Errorf("deleting workflow %s: %w", id, ErrWorkflowNotFound)
		}
		return fmt.Errorf("deleting workflow %s: %w", id, err)
	}
	return nil
}

func (service *Service) ready() error {
	if service == nil {
		return errors.New("workflow service is nil")
	}
	if service.initErr != nil {
		return fmt.Errorf("workflow service unavailable: %w", service.initErr)
	}
	return nil
}

func validationError(format string, args ...any) error {
	return &ValidationError{Message: fmt.Sprintf(format, args...)}
}

func optionalString(value string) *string {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	return &value
}

func workflowDocumentFromDomain(workflow domain.Workflow) dto.WorkflowDocument {
	return dto.WorkflowDocument{
		ID:            workflow.ID,
		ProjectID:     workflow.ProjectID,
		DocumentID:    workflow.DocumentID,
		ShotName:      workflow.ShotName,
		Name:          workflow.Name,
		Description:   workflow.Description,
		SchemaVersion: workflow.SchemaVersion,
		GraphData:     workflow.GraphData,
		TemplateRef:   workflow.TemplateRef,
		CreatedAt:     domain.StringFromTime(workflow.CreatedAt),
		UpdatedAt:     domain.StringFromTime(workflow.UpdatedAt),
	}
}

func workflowSummaryFromDomain(workflow domain.Workflow) dto.WorkflowSummary {
	return dto.WorkflowSummary{
		ID:          workflow.ID,
		Name:        workflow.Name,
		ShotName:    workflow.ShotName,
		NodeCount:   workflow.NodeCount(),
		TemplateRef: workflow.TemplateRef,
		UpdatedAt:   domain.StringFromTime(workflow.UpdatedAt),
	}
}
