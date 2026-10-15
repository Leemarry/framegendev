package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ErrLibraryFolderConflict identifies an existing sibling with the same name.
var ErrLibraryFolderConflict = errors.New("library folder name already exists")

// ErrLibraryFolderNotEmpty identifies a folder that still owns media or child folders.
var ErrLibraryFolderNotEmpty = errors.New("library folder is not empty")

// CheckLibraryScope verifies that a non-global library belongs to an existing project.
func (repo *MediaAssetRepository) CheckLibraryScope(ctx context.Context, projectID string) error {
	if projectID == "" {
		return nil
	}
	var project domain.WorkspaceProjectModel
	if err := repo.db.WithContext(ctx).Select("id").First(&project, "id = ?", projectID).Error; err != nil {
		return fmt.Errorf("checking library scope: %w", err)
	}
	return nil
}

// ListLibraryFolders returns folders owned by exactly one library scope.
func (repo *MediaAssetRepository) ListLibraryFolders(ctx context.Context, projectID string) ([]domain.AssetLibraryFolderModel, error) {
	folders := []domain.AssetLibraryFolderModel{}
	if err := repo.db.WithContext(ctx).Where("project_id = ?", projectID).Order("name, id").Find(&folders).Error; err != nil {
		return nil, fmt.Errorf("listing library folders: %w", err)
	}
	return folders, nil
}

// GetLibraryFolder returns a folder only when the requested scope owns it.
func (repo *MediaAssetRepository) GetLibraryFolder(ctx context.Context, id, projectID string) (domain.AssetLibraryFolderModel, error) {
	var folder domain.AssetLibraryFolderModel
	if err := repo.db.WithContext(ctx).First(&folder, "id = ? AND project_id = ?", id, projectID).Error; err != nil {
		return folder, fmt.Errorf("getting library folder: %w", err)
	}
	return folder, nil
}

// CreateLibraryFolder inserts a folder while enforcing sibling name uniqueness.
func (repo *MediaAssetRepository) CreateLibraryFolder(ctx context.Context, folder *domain.AssetLibraryFolderModel) error {
	// Keep parent/project existence and insertion in one snapshot during project deletion.
	return repo.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		scoped := NewMediaAssetRepositoryFromDB(tx)
		if err := scoped.CheckLibraryScope(ctx, folder.ProjectID); err != nil {
			return err
		}
		if folder.ParentID != "" {
			if _, err := scoped.GetLibraryFolder(ctx, folder.ParentID, folder.ProjectID); err != nil {
				return err
			}
		}
		result := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(folder)
		if result.Error != nil {
			return fmt.Errorf("creating library folder: %w", result.Error)
		}
		if result.RowsAffected == 0 {
			return ErrLibraryFolderConflict
		}
		return nil
	})
}

// RenameLibraryFolder changes a name only when no sibling already uses it.
func (repo *MediaAssetRepository) RenameLibraryFolder(ctx context.Context, folder domain.AssetLibraryFolderModel, name string) error {
	siblings := repo.db.Model(&domain.AssetLibraryFolderModel{}).Select("1").
		Where("project_id = ? AND parent_id = ? AND name = ? AND id <> ?", folder.ProjectID, folder.ParentID, name, folder.ID)
	result := repo.db.WithContext(ctx).Model(&domain.AssetLibraryFolderModel{}).
		Where("id = ? AND NOT EXISTS (?)", folder.ID, siblings).
		Updates(map[string]any{"name": name, "updated_at": time.Now().UTC()})
	if result.Error != nil {
		return fmt.Errorf("renaming library folder: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrLibraryFolderConflict
	}
	return nil
}

// DeleteLibraryFolder removes an empty logical folder from one library scope.
func (repo *MediaAssetRepository) DeleteLibraryFolder(ctx context.Context, id, projectID string) error {
	return repo.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var folder domain.AssetLibraryFolderModel
		if err := tx.Where("id = ? AND project_id = ?", strings.TrimSpace(id), projectID).First(&folder).Error; err != nil {
			if IsRecordNotFound(err) {
				return ErrRecordNotFound
			}
			return fmt.Errorf("getting library folder for deletion: %w", err)
		}

		var mediaCount int64
		if err := tx.Model(&domain.AssetModel{}).
			Where("library_folder_id = ? AND COALESCE(project_id, '') = ?", folder.ID, projectID).
			Count(&mediaCount).Error; err != nil {
			return fmt.Errorf("counting library folder media: %w", err)
		}
		var childCount int64
		if err := tx.Model(&domain.AssetLibraryFolderModel{}).
			Where("project_id = ? AND parent_id = ?", projectID, folder.ID).
			Count(&childCount).Error; err != nil {
			return fmt.Errorf("counting library folder children: %w", err)
		}
		if mediaCount > 0 || childCount > 0 {
			return ErrLibraryFolderNotEmpty
		}
		if result := tx.Delete(&domain.AssetLibraryFolderModel{}, "id = ? AND project_id = ?", folder.ID, projectID); result.Error != nil {
			return fmt.Errorf("deleting library folder: %w", result.Error)
		} else if result.RowsAffected == 0 {
			return ErrRecordNotFound
		}
		return nil
	})
}
