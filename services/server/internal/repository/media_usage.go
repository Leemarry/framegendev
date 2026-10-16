package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
)

// ListMediaAssetUsage aggregates indexed relationships for visible physical media.
// Empty project scope counts all uses of global assets; a project counts its own uses.
func (repo *MediaAssetRepository) ListMediaAssetUsage(ctx context.Context, projectID string) ([]domain.MediaAssetUsage, error) {
	rows := []domain.MediaAssetUsage{}
	err := repo.db.WithContext(ctx).Raw(`
SELECT a.id AS asset_id,
  (EXISTS (SELECT 1 FROM project_selected_assets s WHERE s.asset_id = a.id
    AND s.deleted_at IS NULL AND (@scope = '' OR s.project_id = @scope))
   OR EXISTS (SELECT 1 FROM generation_task_assets o JOIN generation_tasks t ON t.id = o.task_id
    WHERE o.asset_id = a.id AND o.selected = 1 AND (@scope = '' OR t.project_id = @scope)
    AND NOT EXISTS (SELECT 1 FROM generation_task_deleted_slots d WHERE d.task_id = o.task_id AND d.slot_index = o.slot_index))) AS selected,
  EXISTS (SELECT 1 FROM generation_task_assets o JOIN generation_tasks t ON t.id = o.task_id
    WHERE o.asset_id = a.id AND o.selected = 0 AND (@scope = '' OR t.project_id = @scope)
    AND NOT EXISTS (SELECT 1 FROM generation_task_deleted_slots d WHERE d.task_id = o.task_id AND d.slot_index = o.slot_index)) AS candidate,
  EXISTS (SELECT 1 FROM project_reference_assets r WHERE r.asset_id = a.id
    AND (@scope = '' OR r.project_id = @scope)) AS reference
FROM assets a WHERE a.project_id IS NULL OR a.project_id = NULLIF(@scope, '')`,
		sql.Named("scope", domain.CleanProjectID(projectID))).Scan(&rows).Error
	if err != nil {
		return nil, fmt.Errorf("listing media usage: %w", err)
	}
	return rows, nil
}

// ListMediaUsageInputs returns scoped input references for one batch URL/ID resolution.
func (repo *MediaAssetRepository) ListMediaUsageInputs(ctx context.Context, projectID string) ([]domain.GenerationTaskReferenceModel, error) {
	rows := []domain.GenerationTaskReferenceModel{}
	query := repo.db.WithContext(ctx).Model(&domain.GenerationTaskReferenceModel{}).
		Select("generation_task_references.*").
		Joins("JOIN generation_tasks t ON t.id = generation_task_references.task_id").
		Where("t.provider <> ?", "media-library")
	if projectID = domain.CleanProjectID(projectID); projectID != "" {
		query = query.Where("t.project_id = ?", projectID)
	}
	if err := query.Find(&rows).Error; err != nil {
		return nil, fmt.Errorf("listing media input usage: %w", err)
	}
	return rows, nil
}
