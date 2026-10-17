package repository

import (
	"fmt"
	"strings"
	"time"

	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// MediaAssetRepository persists local media asset metadata.
type MediaAssetRepository struct {
	db *gorm.DB
}

// NewMediaAssetRepository opens the workspace database via the central workspace schema owner.
func NewMediaAssetRepository(dbPath string) (*MediaAssetRepository, error) {
	db, err := OpenWorkspaceDB(dbPath)
	if err != nil {
		return nil, fmt.Errorf("opening media asset repository database: %w", err)
	}
	return NewMediaAssetRepositoryFromDB(db), nil
}

// NewMediaAssetRepositoryFromDB creates a repository from an existing workspace DB.
func NewMediaAssetRepositoryFromDB(db *gorm.DB) *MediaAssetRepository {
	return &MediaAssetRepository{db: db}
}

// ListMediaAssets returns all visible media assets ordered by update time.
func (repo *MediaAssetRepository) ListMediaAssets(projectID string) ([]domain.AssetModel, error) {
	projectID = domain.CleanProjectID(projectID)
	models := []domain.AssetModel{}
	query := repo.db.Where("trashed_at IS NULL").Order("updated_at DESC")
	if projectID == "" {
		query = query.Where("project_id IS NULL")
	} else {
		query = query.Where("project_id IS NULL OR project_id = ?", projectID)
	}
	if err := query.Find(&models).Error; err != nil {
		return nil, fmt.Errorf("listing media assets: %w", err)
	}
	return models, nil
}

// ListAllMediaAssets returns every media asset ordered by update time.
func (repo *MediaAssetRepository) ListAllMediaAssets() ([]domain.AssetModel, error) {
	models := []domain.AssetModel{}
	if err := repo.db.Where("trashed_at IS NULL").Order("updated_at DESC").Find(&models).Error; err != nil {
		return nil, fmt.Errorf("listing all media assets: %w", err)
	}
	return models, nil
}

// ListMediaAssetsInScope returns media assets owned by exactly one library
// scope: global rows for an empty project ID, project rows otherwise. Physical
// library paths are only comparable within one scope, so scanning must not
// widen the result the way ListMediaAssets does.
func (repo *MediaAssetRepository) ListMediaAssetsInScope(projectID string) ([]domain.AssetModel, error) {
	projectID = domain.CleanProjectID(projectID)
	models := []domain.AssetModel{}
	query := repo.db.Where("trashed_at IS NULL").Order("updated_at DESC")
	if projectID == "" {
		query = query.Where("project_id IS NULL")
	} else {
		query = query.Where("project_id = ?", projectID)
	}
	if err := query.Find(&models).Error; err != nil {
		return nil, fmt.Errorf("listing media assets in scope: %w", err)
	}
	return models, nil
}

// GetMediaAsset returns a media asset by ID.
func (repo *MediaAssetRepository) GetMediaAsset(id string) (domain.AssetModel, error) {
	var model domain.AssetModel
	err := repo.db.First(&model, "id = ?", strings.TrimSpace(id)).Error
	if IsRecordNotFound(err) {
		return domain.AssetModel{}, ErrRecordNotFound
	}
	if err != nil {
		return domain.AssetModel{}, fmt.Errorf("getting media asset: %w", err)
	}
	return model, nil
}

// ListProjectSelectedAssetReferences returns project selection rows that reference one media asset.
func (repo *MediaAssetRepository) ListProjectSelectedAssetReferences(assetID string) ([]domain.ProjectSelectedAssetModel, error) {
	models := []domain.ProjectSelectedAssetModel{}
	if err := repo.db.Where("asset_id = ?", strings.TrimSpace(assetID)).
		Order("updated_at DESC").
		Find(&models).Error; err != nil {
		return nil, fmt.Errorf("listing project selected asset references: %w", err)
	}
	return models, nil
}

// FindMediaAssetBySourceURL returns the latest media asset for a source URL.
func (repo *MediaAssetRepository) FindMediaAssetBySourceURL(sourceURL string) (domain.AssetModel, error) {
	var model domain.AssetModel
	err := repo.db.Where("source_url = ?", strings.TrimSpace(sourceURL)).
		Order("updated_at DESC").
		First(&model).Error
	if IsRecordNotFound(err) {
		return domain.AssetModel{}, ErrRecordNotFound
	}
	if err != nil {
		return domain.AssetModel{}, fmt.Errorf("finding media asset by source URL: %w", err)
	}
	return model, nil
}

// FindMediaAssetBySourceURLAndScope returns the latest media asset for a source URL in one generation scope.
func (repo *MediaAssetRepository) FindMediaAssetBySourceURLAndScope(sourceURL string, projectID string, source string, conversationID string) (domain.AssetModel, error) {
	var model domain.AssetModel
	err := repo.db.Where(
		"source_url = ? AND COALESCE(project_id, '') = ? AND source = ?",
		strings.TrimSpace(sourceURL),
		domain.CleanProjectID(projectID),
		strings.TrimSpace(source),
	).
		Order("updated_at DESC").
		First(&model).Error
	if IsRecordNotFound(err) {
		return domain.AssetModel{}, ErrRecordNotFound
	}
	if err != nil {
		return domain.AssetModel{}, fmt.Errorf("finding media asset by source URL and scope: %w", err)
	}
	return model, nil
}

// FindMediaAssetByContentHashAndScope returns the latest generated asset with identical content in one generation scope.
func (repo *MediaAssetRepository) FindMediaAssetByContentHashAndScope(contentHash string, kind string, projectID string, source string, conversationID string) (domain.AssetModel, error) {
	var model domain.AssetModel
	err := repo.db.Where(
		"content_hash = ? AND kind = ? AND COALESCE(project_id, '') = ? AND source = ?",
		strings.TrimSpace(contentHash),
		strings.TrimSpace(kind),
		domain.CleanProjectID(projectID),
		strings.TrimSpace(source),
	).
		Order("updated_at DESC").
		First(&model).Error
	if IsRecordNotFound(err) {
		return domain.AssetModel{}, ErrRecordNotFound
	}
	if err != nil {
		return domain.AssetModel{}, fmt.Errorf("finding media asset by content hash and scope: %w", err)
	}
	return model, nil
}

// FindMediaAssetByContentHashKindInScope returns the latest asset with identical
// content in one library scope, regardless of how it was created.
func (repo *MediaAssetRepository) FindMediaAssetByContentHashKindInScope(contentHash string, kind string, projectID string) (domain.AssetModel, error) {
	var model domain.AssetModel
	err := repo.db.Where(
		"content_hash = ? AND kind = ? AND COALESCE(project_id, '') = ? AND trashed_at IS NULL",
		strings.TrimSpace(contentHash),
		strings.TrimSpace(kind),
		domain.CleanProjectID(projectID),
	).
		Order("updated_at DESC").
		First(&model).Error
	if IsRecordNotFound(err) {
		return domain.AssetModel{}, ErrRecordNotFound
	}
	if err != nil {
		return domain.AssetModel{}, fmt.Errorf("finding media asset by content hash in scope: %w", err)
	}
	return model, nil
}

// GetDocumentSection returns one persisted section of a project document.
func (repo *MediaAssetRepository) GetDocumentSection(projectID string, documentID string, sectionID string) (domain.DocumentSectionModel, error) {
	var model domain.DocumentSectionModel
	err := repo.db.Where(
		"project_id = ? AND document_id = ? AND section_id = ?",
		domain.CleanProjectID(projectID),
		strings.TrimSpace(documentID),
		strings.TrimSpace(sectionID),
	).First(&model).Error
	if IsRecordNotFound(err) {
		return domain.DocumentSectionModel{}, ErrRecordNotFound
	}
	if err != nil {
		return domain.DocumentSectionModel{}, fmt.Errorf("getting document section: %w", err)
	}
	return model, nil
}

// EnsureProjectSelectedAssetCandidate records a section candidate once, keeping
// existing selections untouched on replays.
func (repo *MediaAssetRepository) EnsureProjectSelectedAssetCandidate(candidate domain.ProjectSelectedAssetModel) (bool, error) {
	projectID := domain.CleanProjectID(candidate.ProjectID)
	resourceID := strings.TrimSpace(domain.StringValue(candidate.ResourceID))
	assetID := strings.TrimSpace(candidate.AssetID)
	if projectID == "" || resourceID == "" || assetID == "" {
		return false, nil
	}

	var count int64
	if err := repo.db.Model(&domain.ProjectSelectedAssetModel{}).
		Where(
			"project_id = ? AND resource_type = ? AND resource_id = ? AND asset_id = ? AND deleted_at IS NULL",
			projectID,
			strings.TrimSpace(candidate.ResourceType),
			resourceID,
			assetID,
		).
		Count(&count).Error; err != nil {
		return false, fmt.Errorf("checking project selected asset candidate: %w", err)
	}
	if count > 0 {
		return false, nil
	}

	candidate.ProjectID = projectID
	if err := repo.db.Create(&candidate).Error; err != nil {
		return false, fmt.Errorf("creating project selected asset candidate: %w", err)
	}
	return true, nil
}

// GetAssetCatalogOperation returns the stored result of one idempotent write.
func (repo *MediaAssetRepository) GetAssetCatalogOperation(operationID string) (domain.AssetCatalogOperationModel, error) {
	var model domain.AssetCatalogOperationModel
	err := repo.db.Where("operation_id = ?", strings.TrimSpace(operationID)).First(&model).Error
	if IsRecordNotFound(err) {
		return domain.AssetCatalogOperationModel{}, ErrRecordNotFound
	}
	if err != nil {
		return domain.AssetCatalogOperationModel{}, fmt.Errorf("getting asset catalog operation: %w", err)
	}
	return model, nil
}

// CreateAssetCatalogOperation stores one operation result, ignoring replays of
// the same operation ID so the first response keeps winning.
func (repo *MediaAssetRepository) CreateAssetCatalogOperation(model domain.AssetCatalogOperationModel) error {
	if err := repo.db.
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "operation_id"}},
			DoNothing: true,
		}).
		Create(&model).Error; err != nil {
		return fmt.Errorf("creating asset catalog operation: %w", err)
	}
	return nil
}

// CreateMediaAsset inserts a media asset.
func (repo *MediaAssetRepository) CreateMediaAsset(model domain.AssetModel) error {
	model.ProjectID = domain.StringPtr(domain.CleanProjectID(domain.StringValue(model.ProjectID)))
	if err := repo.db.Create(&model).Error; err != nil {
		return fmt.Errorf("creating media asset: %w", err)
	}
	return nil
}

// DeleteMediaAsset deletes a media asset by ID.
func (repo *MediaAssetRepository) DeleteMediaAsset(id string) (bool, error) {
	result := repo.db.Delete(&domain.AssetModel{}, "id = ?", strings.TrimSpace(id))
	if result.Error != nil {
		return false, fmt.Errorf("deleting media asset: %w", result.Error)
	}
	return result.RowsAffected > 0, nil
}

// TrashMediaAsset moves a media asset to the trash without touching its files.
func (repo *MediaAssetRepository) TrashMediaAsset(id string, trashedAt time.Time) (bool, error) {
	result := repo.db.Model(&domain.AssetModel{}).
		Where("id = ? AND trashed_at IS NULL", strings.TrimSpace(id)).
		Updates(map[string]any{"trashed_at": trashedAt, "updated_at": trashedAt})
	if result.Error != nil {
		return false, fmt.Errorf("trashing media asset: %w", result.Error)
	}
	return result.RowsAffected > 0, nil
}

// RestoreMediaAsset returns a trashed media asset to the library.
func (repo *MediaAssetRepository) RestoreMediaAsset(id string, restoredAt time.Time) (bool, error) {
	result := repo.db.Model(&domain.AssetModel{}).
		Where("id = ? AND trashed_at IS NOT NULL", strings.TrimSpace(id)).
		Updates(map[string]any{"trashed_at": nil, "updated_at": restoredAt})
	if result.Error != nil {
		return false, fmt.Errorf("restoring media asset: %w", result.Error)
	}
	return result.RowsAffected > 0, nil
}

// ListTrashedMediaAssets returns trashed rows ordered by the newest removal.
func (repo *MediaAssetRepository) ListTrashedMediaAssets(projectID string) ([]domain.AssetModel, error) {
	projectID = domain.CleanProjectID(projectID)
	models := []domain.AssetModel{}
	query := repo.db.Where("trashed_at IS NOT NULL").Order("trashed_at DESC")
	if projectID == "" {
		query = query.Where("project_id IS NULL")
	} else {
		query = query.Where("project_id IS NULL OR project_id = ?", projectID)
	}
	if err := query.Find(&models).Error; err != nil {
		return nil, fmt.Errorf("listing trashed media assets: %w", err)
	}
	return models, nil
}

// UpdateMediaAssetFilename updates the display filename and timestamp.
func (repo *MediaAssetRepository) UpdateMediaAssetFilename(id string, filename string, updatedAt string) error {
	err := repo.db.Model(&domain.AssetModel{}).
		Where("id = ?", strings.TrimSpace(id)).
		Updates(map[string]any{
			"filename":   strings.TrimSpace(filename),
			"updated_at": domain.TimeFromString(updatedAt),
		}).Error
	if err != nil {
		return fmt.Errorf("updating media asset filename: %w", err)
	}
	return nil
}

// UpdateMediaAssetMetadata updates derived media metadata and poster fields.
func (repo *MediaAssetRepository) UpdateMediaAssetMetadata(id string, updates map[string]any) error {
	if len(updates) == 0 {
		return nil
	}
	err := repo.db.Model(&domain.AssetModel{}).
		Where("id = ?", strings.TrimSpace(id)).
		Updates(updates).Error
	if err != nil {
		return fmt.Errorf("updating media asset metadata: %w", err)
	}
	return nil
}

// UpdateMediaAssetStorage updates the physical storage metadata for an asset.
func (repo *MediaAssetRepository) UpdateMediaAssetStorage(id string, updates map[string]any) error {
	if len(updates) == 0 {
		return nil
	}
	err := repo.db.Model(&domain.AssetModel{}).
		Where("id = ?", strings.TrimSpace(id)).
		Updates(updates).Error
	if err != nil {
		return fmt.Errorf("updating media asset storage: %w", err)
	}
	return nil
}
