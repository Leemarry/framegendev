package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	"gorm.io/gorm"
)

// WorkflowTemplateRepository persists the global workflow template library.
type WorkflowTemplateRepository struct {
	db *gorm.DB
}

// NewWorkflowTemplateRepository returns a template repository backed by db.
func NewWorkflowTemplateRepository(db *gorm.DB) *WorkflowTemplateRepository {
	return &WorkflowTemplateRepository{db: db}
}

// GetByID returns one template or ErrRecordNotFound.
func (repo *WorkflowTemplateRepository) GetByID(ctx context.Context, id string) (*domain.WorkflowTemplate, error) {
	var model domain.WorkflowTemplateModel
	err := repo.db.WithContext(ctx).
		Where("id = ?", strings.TrimSpace(id)).
		First(&model).Error
	if IsRecordNotFound(err) {
		return nil, ErrRecordNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("getting workflow template %s: %w", id, err)
	}

	template, err := workflowTemplateFromModel(model)
	if err != nil {
		return nil, err
	}
	return &template, nil
}

// List returns templates, optionally filtered by category, most used first.
func (repo *WorkflowTemplateRepository) List(ctx context.Context, category string) ([]*domain.WorkflowTemplate, error) {
	query := repo.db.WithContext(ctx)
	if category = strings.TrimSpace(category); category != "" {
		query = query.Where("category = ?", category)
	}

	models := []domain.WorkflowTemplateModel{}
	if err := query.Order("category ASC, usage_count DESC, updated_at DESC").Find(&models).Error; err != nil {
		return nil, fmt.Errorf("listing workflow templates: %w", err)
	}

	templates := make([]*domain.WorkflowTemplate, 0, len(models))
	for _, model := range models {
		template, err := workflowTemplateFromModel(model)
		if err != nil {
			return nil, err
		}
		templates = append(templates, &template)
	}
	return templates, nil
}

func workflowTemplateFromModel(model domain.WorkflowTemplateModel) (domain.WorkflowTemplate, error) {
	graph := domain.EmptyGraphData()
	if strings.TrimSpace(model.GraphDataJSON) != "" {
		if err := json.Unmarshal([]byte(model.GraphDataJSON), &graph); err != nil {
			return domain.WorkflowTemplate{}, fmt.Errorf("decoding workflow template graph %s: %w", model.ID, err)
		}
	}
	graph.Normalize()

	return domain.WorkflowTemplate{
		ID:           model.ID,
		Name:         model.Name,
		Description:  model.Description,
		Category:     model.Category,
		ThumbnailURL: cloneStringPointer(model.ThumbnailURL),
		GraphData:    graph,
		UsageCount:   model.UsageCount,
		CreatedBy:    cloneStringPointer(model.CreatedBy),
		CreatedAt:    model.CreatedAt,
		UpdatedAt:    model.UpdatedAt,
	}, nil
}
