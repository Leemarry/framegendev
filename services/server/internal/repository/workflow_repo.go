package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	"gorm.io/gorm"
)

// WorkflowRepository persists workflow documents in the workspace database.
type WorkflowRepository struct {
	db *gorm.DB
}

// NewWorkflowRepository returns a workflow repository backed by db.
func NewWorkflowRepository(db *gorm.DB) *WorkflowRepository {
	return &WorkflowRepository{db: db}
}

// Create inserts a workflow document and returns the stored record.
func (repo *WorkflowRepository) Create(ctx context.Context, workflow *domain.Workflow) (*domain.Workflow, error) {
	if workflow == nil {
		return nil, errors.New("workflow is nil")
	}

	model, err := workflowModelFromEntity(workflow)
	if err != nil {
		return nil, err
	}
	if model.CreatedAt.IsZero() {
		model.CreatedAt = time.Now().UTC()
	}
	if model.UpdatedAt.IsZero() {
		model.UpdatedAt = model.CreatedAt
	}
	if err := repo.db.WithContext(ctx).Create(&model).Error; err != nil {
		return nil, fmt.Errorf("creating workflow %s: %w", model.ID, err)
	}

	stored, err := workflowEntityFromModel(model)
	if err != nil {
		return nil, err
	}
	return &stored, nil
}

// GetByID returns one workflow document or ErrRecordNotFound.
func (repo *WorkflowRepository) GetByID(ctx context.Context, id string) (*domain.Workflow, error) {
	var model domain.WorkflowModel
	err := repo.db.WithContext(ctx).
		Where("id = ?", strings.TrimSpace(id)).
		First(&model).Error
	if IsRecordNotFound(err) {
		return nil, ErrRecordNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("getting workflow %s: %w", id, err)
	}

	workflow, err := workflowEntityFromModel(model)
	if err != nil {
		return nil, err
	}
	return &workflow, nil
}

// List returns project workflows ordered by most recently updated.
func (repo *WorkflowRepository) List(ctx context.Context, projectID string, shotName string, documentID string) ([]*domain.Workflow, error) {
	query := repo.db.WithContext(ctx).
		Where("project_id = ?", strings.TrimSpace(projectID))
	if shotName = strings.TrimSpace(shotName); shotName != "" {
		query = query.Where("shot_name = ?", shotName)
	}
	if documentID = strings.TrimSpace(documentID); documentID != "" {
		query = query.Where("document_id = ?", documentID)
	}

	models := []domain.WorkflowModel{}
	if err := query.Order("updated_at DESC, created_at DESC").Find(&models).Error; err != nil {
		return nil, fmt.Errorf("listing workflows for project %s: %w", projectID, err)
	}

	workflows := make([]*domain.Workflow, 0, len(models))
	for _, model := range models {
		workflow, err := workflowEntityFromModel(model)
		if err != nil {
			return nil, err
		}
		workflows = append(workflows, &workflow)
	}
	return workflows, nil
}

// Update persists mutable workflow fields and returns the stored record.
func (repo *WorkflowRepository) Update(ctx context.Context, workflow *domain.Workflow) (*domain.Workflow, error) {
	if workflow == nil {
		return nil, errors.New("workflow is nil")
	}

	model, err := workflowModelFromEntity(workflow)
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	result := repo.db.WithContext(ctx).
		Model(&domain.WorkflowModel{}).
		Where("id = ?", model.ID).
		Updates(map[string]any{
			"name":           model.Name,
			"description":    model.Description,
			"graph_data":     model.GraphDataJSON,
			"template_ref":   model.TemplateRef,
			"schema_version": model.SchemaVersion,
			"updated_at":     now,
		})
	if result.Error != nil {
		return nil, fmt.Errorf("updating workflow %s: %w", model.ID, result.Error)
	}
	if result.RowsAffected == 0 {
		return nil, ErrRecordNotFound
	}

	workflow.UpdatedAt = now
	updated := *workflow
	return &updated, nil
}

// Delete removes a workflow document or returns ErrRecordNotFound.
func (repo *WorkflowRepository) Delete(ctx context.Context, id string) error {
	result := repo.db.WithContext(ctx).
		Where("id = ?", strings.TrimSpace(id)).
		Delete(&domain.WorkflowModel{})
	if result.Error != nil {
		return fmt.Errorf("deleting workflow %s: %w", id, result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrRecordNotFound
	}
	return nil
}

// ProjectExists reports whether the workflow owner project exists.
func (repo *WorkflowRepository) ProjectExists(ctx context.Context, projectID string) (bool, error) {
	var count int64
	err := repo.db.WithContext(ctx).
		Model(&domain.WorkspaceProjectModel{}).
		Where("id = ?", strings.TrimSpace(projectID)).
		Count(&count).Error
	if err != nil {
		return false, fmt.Errorf("checking project %s: %w", projectID, err)
	}
	return count > 0, nil
}

func workflowModelFromEntity(workflow *domain.Workflow) (domain.WorkflowModel, error) {
	graph := workflow.GraphData.Clone()
	graph.Normalize()
	graphJSON, err := json.Marshal(graph)
	if err != nil {
		return domain.WorkflowModel{}, fmt.Errorf("encoding workflow graph: %w", err)
	}

	return domain.WorkflowModel{
		ID:            workflow.ID,
		ProjectID:     workflow.ProjectID,
		DocumentID:    workflow.DocumentID,
		ShotName:      workflow.ShotName,
		Name:          workflow.Name,
		Description:   workflow.Description,
		SchemaVersion: workflow.SchemaVersion,
		GraphDataJSON: string(graphJSON),
		TemplateRef:   cloneStringPointer(workflow.TemplateRef),
		CreatedAt:     workflow.CreatedAt,
		UpdatedAt:     workflow.UpdatedAt,
	}, nil
}

func workflowEntityFromModel(model domain.WorkflowModel) (domain.Workflow, error) {
	graph := domain.EmptyGraphData()
	if strings.TrimSpace(model.GraphDataJSON) != "" {
		if err := json.Unmarshal([]byte(model.GraphDataJSON), &graph); err != nil {
			return domain.Workflow{}, fmt.Errorf("decoding workflow graph %s: %w", model.ID, err)
		}
	}
	graph.Normalize()

	return domain.Workflow{
		ID:            model.ID,
		ProjectID:     model.ProjectID,
		DocumentID:    model.DocumentID,
		ShotName:      model.ShotName,
		Name:          model.Name,
		Description:   model.Description,
		SchemaVersion: model.SchemaVersion,
		GraphData:     graph,
		TemplateRef:   cloneStringPointer(model.TemplateRef),
		CreatedAt:     model.CreatedAt,
		UpdatedAt:     model.UpdatedAt,
	}, nil
}

func cloneStringPointer(value *string) *string {
	if value == nil {
		return nil
	}
	cloned := *value
	return &cloned
}
