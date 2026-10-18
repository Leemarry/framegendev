package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	"gorm.io/gorm"
)

// WorkflowAssetRepository manages workflow asset tracking.
type WorkflowAssetRepository struct {
	db *gorm.DB
}

// NewWorkflowAssetRepository returns a workflow asset repository.
func NewWorkflowAssetRepository(db *gorm.DB) *WorkflowAssetRepository {
	return &WorkflowAssetRepository{db: db}
}

// CreateAsset records a new workflow asset.
func (repo *WorkflowAssetRepository) CreateAsset(ctx context.Context, asset domain.WorkflowAsset) (domain.WorkflowAsset, error) {
	if asset.ID == "" {
		asset.ID = uuid.NewString()
	}
	model := repo.toModel(asset)
	if err := repo.db.WithContext(ctx).Create(&model).Error; err != nil {
		return domain.WorkflowAsset{}, fmt.Errorf("creating workflow asset: %w", err)
	}
	return repo.toDomain(model), nil
}

// ListAssetsByWorkflow returns all assets for a workflow.
func (repo *WorkflowAssetRepository) ListAssetsByWorkflow(ctx context.Context, workflowID string) ([]domain.WorkflowAsset, error) {
	var models []domain.WorkflowAssetModel
	err := repo.db.WithContext(ctx).
		Where("workflow_id = ?", workflowID).
		Order("created_at DESC").
		Find(&models).Error
	if err != nil {
		return nil, fmt.Errorf("listing workflow assets: %w", err)
	}
	assets := make([]domain.WorkflowAsset, len(models))
	for i, model := range models {
		assets[i] = repo.toDomain(model)
	}
	return assets, nil
}

// ListAssetsByNode returns all assets for a specific node.
func (repo *WorkflowAssetRepository) ListAssetsByNode(ctx context.Context, workflowID string, nodeID string) ([]domain.WorkflowAsset, error) {
	var models []domain.WorkflowAssetModel
	err := repo.db.WithContext(ctx).
		Where("workflow_id = ? AND node_id = ?", workflowID, nodeID).
		Order("created_at DESC").
		Find(&models).Error
	if err != nil {
		return nil, fmt.Errorf("listing workflow node assets: %w", err)
	}
	assets := make([]domain.WorkflowAsset, len(models))
	for i, model := range models {
		assets[i] = repo.toDomain(model)
	}
	return assets, nil
}

// DeleteAsset deletes a single asset record by ID.
func (repo *WorkflowAssetRepository) DeleteAsset(ctx context.Context, id string) error {
	result := repo.db.WithContext(ctx).Delete(&domain.WorkflowAssetModel{}, "id = ?", id)
	if result.Error != nil {
		return fmt.Errorf("deleting workflow asset: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrRecordNotFound
	}
	return nil
}

// DeleteAssetsByNode deletes all asset records for a node.
func (repo *WorkflowAssetRepository) DeleteAssetsByNode(ctx context.Context, workflowID string, nodeID string) error {
	err := repo.db.WithContext(ctx).
		Where("workflow_id = ? AND node_id = ?", workflowID, nodeID).
		Delete(&domain.WorkflowAssetModel{}).Error
	if err != nil {
		return fmt.Errorf("deleting workflow node assets: %w", err)
	}
	return nil
}

// DeleteAssetsByWorkflow deletes all asset records for a workflow.
func (repo *WorkflowAssetRepository) DeleteAssetsByWorkflow(ctx context.Context, workflowID string) error {
	err := repo.db.WithContext(ctx).
		Where("workflow_id = ?", workflowID).
		Delete(&domain.WorkflowAssetModel{}).Error
	if err != nil {
		return fmt.Errorf("deleting workflow assets: %w", err)
	}
	return nil
}

func (repo *WorkflowAssetRepository) toDomain(model domain.WorkflowAssetModel) domain.WorkflowAsset {
	return domain.WorkflowAsset{
		ID:         model.ID,
		WorkflowID: model.WorkflowID,
		NodeID:     model.NodeID,
		AssetPath:  model.AssetPath,
		AssetType:  model.AssetType,
		SizeBytes:  model.SizeBytes,
		CreatedAt:  model.CreatedAt,
	}
}

func (repo *WorkflowAssetRepository) toModel(asset domain.WorkflowAsset) domain.WorkflowAssetModel {
	return domain.WorkflowAssetModel{
		ID:         asset.ID,
		WorkflowID: asset.WorkflowID,
		NodeID:     asset.NodeID,
		AssetPath:  asset.AssetPath,
		AssetType:  asset.AssetType,
		SizeBytes:  asset.SizeBytes,
		CreatedAt:  asset.CreatedAt,
	}
}
