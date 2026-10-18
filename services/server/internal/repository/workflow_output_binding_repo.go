package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	"gorm.io/gorm"
)

// WorkflowOutputBindingRepository manages workflow output bindings.
type WorkflowOutputBindingRepository struct {
	db *gorm.DB
}

// NewWorkflowOutputBindingRepository returns a workflow output binding repository.
func NewWorkflowOutputBindingRepository(db *gorm.DB) *WorkflowOutputBindingRepository {
	return &WorkflowOutputBindingRepository{db: db}
}

// CreateBinding creates a new workflow output binding.
func (repo *WorkflowOutputBindingRepository) CreateBinding(ctx context.Context, binding domain.WorkflowOutputBinding) (domain.WorkflowOutputBinding, error) {
	if binding.ID == "" {
		binding.ID = uuid.NewString()
	}
	model := repo.toModel(binding)
	if err := repo.db.WithContext(ctx).Create(&model).Error; err != nil {
		return domain.WorkflowOutputBinding{}, fmt.Errorf("creating workflow output binding: %w", err)
	}
	return repo.toDomain(model), nil
}

// ListBindingsByWorkflow returns all output bindings for a workflow, ordered by sort_order.
func (repo *WorkflowOutputBindingRepository) ListBindingsByWorkflow(ctx context.Context, workflowID string) ([]domain.WorkflowOutputBinding, error) {
	var models []domain.WorkflowOutputBindingModel
	err := repo.db.WithContext(ctx).
		Where("workflow_id = ?", workflowID).
		Order("sort_order ASC, created_at ASC").
		Find(&models).Error
	if err != nil {
		return nil, fmt.Errorf("listing workflow output bindings: %w", err)
	}
	bindings := make([]domain.WorkflowOutputBinding, len(models))
	for i, model := range models {
		bindings[i] = repo.toDomain(model)
	}
	return bindings, nil
}

// GetBindingByID retrieves a single binding by ID.
func (repo *WorkflowOutputBindingRepository) GetBindingByID(ctx context.Context, id string) (domain.WorkflowOutputBinding, error) {
	var model domain.WorkflowOutputBindingModel
	err := repo.db.WithContext(ctx).Where("id = ?", id).First(&model).Error
	if err != nil {
		if IsRecordNotFound(err) {
			return domain.WorkflowOutputBinding{}, ErrRecordNotFound
		}
		return domain.WorkflowOutputBinding{}, fmt.Errorf("getting workflow output binding: %w", err)
	}
	return repo.toDomain(model), nil
}

// UpdateBinding updates an existing binding.
func (repo *WorkflowOutputBindingRepository) UpdateBinding(ctx context.Context, binding domain.WorkflowOutputBinding) error {
	model := repo.toModel(binding)
	result := repo.db.WithContext(ctx).
		Model(&domain.WorkflowOutputBindingModel{}).
		Where("id = ?", binding.ID).
		Updates(model)
	if result.Error != nil {
		return fmt.Errorf("updating workflow output binding: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrRecordNotFound
	}
	return nil
}

// DeleteBinding deletes a binding by ID.
func (repo *WorkflowOutputBindingRepository) DeleteBinding(ctx context.Context, id string) error {
	result := repo.db.WithContext(ctx).Delete(&domain.WorkflowOutputBindingModel{}, "id = ?", id)
	if result.Error != nil {
		return fmt.Errorf("deleting workflow output binding: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrRecordNotFound
	}
	return nil
}

// DeleteBindingsByWorkflow deletes all bindings for a workflow.
func (repo *WorkflowOutputBindingRepository) DeleteBindingsByWorkflow(ctx context.Context, workflowID string) error {
	err := repo.db.WithContext(ctx).
		Where("workflow_id = ?", workflowID).
		Delete(&domain.WorkflowOutputBindingModel{}).Error
	if err != nil {
		return fmt.Errorf("deleting workflow output bindings: %w", err)
	}
	return nil
}

// SetMainBinding sets one binding as main and clears all others for the same workflow.
func (repo *WorkflowOutputBindingRepository) SetMainBinding(ctx context.Context, workflowID string, bindingID string) error {
	return repo.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Clear all main flags for this workflow
		if err := tx.Model(&domain.WorkflowOutputBindingModel{}).
			Where("workflow_id = ?", workflowID).
			Update("is_main", false).Error; err != nil {
			return fmt.Errorf("clearing main flags: %w", err)
		}
		// Set the specified binding as main
		result := tx.Model(&domain.WorkflowOutputBindingModel{}).
			Where("id = ? AND workflow_id = ?", bindingID, workflowID).
			Update("is_main", true)
		if result.Error != nil {
			return fmt.Errorf("setting main binding: %w", result.Error)
		}
		if result.RowsAffected == 0 {
			return ErrRecordNotFound
		}
		return nil
	})
}

func (repo *WorkflowOutputBindingRepository) toDomain(model domain.WorkflowOutputBindingModel) domain.WorkflowOutputBinding {
	return domain.WorkflowOutputBinding{
		ID:          model.ID,
		WorkflowID:  model.WorkflowID,
		NodeID:      model.NodeID,
		SegmentName: model.SegmentName,
		DisplayName: model.DisplayName,
		SortOrder:   model.SortOrder,
		IsMain:      model.IsMain,
		CreatedAt:   model.CreatedAt,
		UpdatedAt:   model.UpdatedAt,
	}
}

func (repo *WorkflowOutputBindingRepository) toModel(binding domain.WorkflowOutputBinding) domain.WorkflowOutputBindingModel {
	return domain.WorkflowOutputBindingModel{
		ID:          binding.ID,
		WorkflowID:  binding.WorkflowID,
		NodeID:      binding.NodeID,
		SegmentName: binding.SegmentName,
		DisplayName: binding.DisplayName,
		SortOrder:   binding.SortOrder,
		IsMain:      binding.IsMain,
		CreatedAt:   binding.CreatedAt,
		UpdatedAt:   binding.UpdatedAt,
	}
}
