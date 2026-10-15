package media

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"unicode"
	"unicode/utf8"

	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	"github.com/mediago-dev/mediago-drama/services/server/internal/repository"
	"github.com/mediago-dev/mediago-drama/services/server/internal/service/shared"
)

// ErrLibraryFolderNotFound identifies a missing folder or library scope.
var ErrLibraryFolderNotFound = errors.New("library folder or scope not found")

// ErrLibraryFolderNotEmpty identifies a folder that cannot be safely deleted.
var ErrLibraryFolderNotEmpty = errors.New("library folder is not empty")

// LibraryFolderRequest supplies a display name and an optional parent for creation.
type LibraryFolderRequest struct {
	Name     string `json:"name"`
	ParentID string `json:"parentId"`
}

// ErrLibraryFolderCycle identifies a reparent move that would create a cycle
// (target parent is the folder itself or any descendant).
var ErrLibraryFolderCycle = errors.New("library folder reparent would create a cycle")

func libraryFolderError(err error) error {
	if repository.IsRecordNotFound(err) {
		return ErrLibraryFolderNotFound
	}
	if errors.Is(err, repository.ErrLibraryFolderConflict) {
		return fmt.Errorf("%w: folder name already exists", ErrInvalidMediaAssetUpdate)
	}
	if errors.Is(err, repository.ErrLibraryFolderNotEmpty) {
		return ErrLibraryFolderNotEmpty
	}
	if errors.Is(err, ErrLibraryFolderCycle) {
		return fmt.Errorf("%w: %w", ErrInvalidMediaAssetUpdate, ErrLibraryFolderCycle)
	}
	return err
}

func cleanLibraryFolderName(name string) (string, error) {
	name = strings.TrimSpace(name)
	if name == "" || name == "." || name == ".." || utf8.RuneCountInString(name) > 80 || strings.ContainsAny(name, `/\`) || strings.ContainsFunc(name, unicode.IsControl) {
		return "", fmt.Errorf("%w: folder name must contain 1-80 characters without path separators or control characters", ErrInvalidMediaAssetUpdate)
	}
	return name, nil
}

// ListLibraryFolders returns the logical folders of one existing library scope.
func (store *MediaAssets) ListLibraryFolders(ctx context.Context, projectID string) ([]domain.AssetLibraryFolderModel, error) {
	if store.initErr != nil {
		return nil, store.initErr
	}
	projectID = domain.CleanProjectID(projectID)
	if err := store.repo.CheckLibraryScope(ctx, projectID); err != nil {
		return nil, libraryFolderError(err)
	}
	return store.repo.ListLibraryFolders(ctx, projectID)
}

// CreateLibraryFolder creates a folder under a parent owned by the same scope.
func (store *MediaAssets) CreateLibraryFolder(ctx context.Context, projectID string, payload LibraryFolderRequest) (domain.AssetLibraryFolderModel, error) {
	if store.initErr != nil {
		return domain.AssetLibraryFolderModel{}, store.initErr
	}
	store.mu.Lock()
	defer store.mu.Unlock()
	projectID = domain.CleanProjectID(projectID)
	name, err := cleanLibraryFolderName(payload.Name)
	if err != nil {
		return domain.AssetLibraryFolderModel{}, err
	}
	parentID := strings.TrimSpace(payload.ParentID)
	id, err := shared.RandomID("library-folder")
	if err != nil {
		return domain.AssetLibraryFolderModel{}, err
	}
	folder := domain.AssetLibraryFolderModel{ID: id, ProjectID: projectID, ParentID: parentID, Name: name}
	if err = store.repo.CreateLibraryFolder(ctx, &folder); err != nil {
		return domain.AssetLibraryFolderModel{}, libraryFolderError(err)
	}
	return folder, nil
}

// RenameLibraryFolder changes a folder display name without changing its identity or parent.
func (store *MediaAssets) RenameLibraryFolder(ctx context.Context, projectID, id, name string) (domain.AssetLibraryFolderModel, error) {
	if store.initErr != nil {
		return domain.AssetLibraryFolderModel{}, store.initErr
	}
	store.mu.Lock()
	defer store.mu.Unlock()
	projectID = domain.CleanProjectID(projectID)
	folder, err := store.repo.GetLibraryFolder(ctx, strings.TrimSpace(id), projectID)
	if err != nil {
		return folder, libraryFolderError(err)
	}
	name, err = cleanLibraryFolderName(name)
	if err != nil {
		return folder, err
	}
	if err = store.repo.RenameLibraryFolder(ctx, folder, name); err != nil {
		return folder, libraryFolderError(err)
	}
	return store.repo.GetLibraryFolder(ctx, folder.ID, projectID)
}

// ReparentLibraryFolder moves a folder to a new parent (or to root) within its scope.
// It rejects cycles (target parent is self or any descendant) and sibling name collisions.
func (store *MediaAssets) ReparentLibraryFolder(ctx context.Context, projectID, id, newParentID string) (domain.AssetLibraryFolderModel, error) {
	if store.initErr != nil {
		return domain.AssetLibraryFolderModel{}, store.initErr
	}
	store.mu.Lock()
	defer store.mu.Unlock()
	projectID = domain.CleanProjectID(projectID)
	id = strings.TrimSpace(id)
	newParentID = strings.TrimSpace(newParentID)
	folder, err := store.repo.GetLibraryFolder(ctx, id, projectID)
	if err != nil {
		return folder, libraryFolderError(err)
	}
	// Short-circuit: no-op when same parent.
	if folder.ParentID == newParentID {
		return folder, nil
	}
	// Cycle check: target parent must not be the folder itself or any descendant.
	if newParentID != "" {
		if newParentID == folder.ID {
			return folder, libraryFolderError(ErrLibraryFolderCycle)
		}
		descendants, err := store.repo.ListDescendantFolderIDs(ctx, projectID, folder.ID)
		if err != nil {
			return folder, libraryFolderError(err)
		}
		for _, d := range descendants {
			if d == newParentID {
				return folder, libraryFolderError(ErrLibraryFolderCycle)
			}
		}
	}
	if err = store.repo.ReparentLibraryFolder(ctx, folder, newParentID); err != nil {
		return folder, libraryFolderError(err)
	}
	return store.repo.GetLibraryFolder(ctx, folder.ID, projectID)
}

// DeleteLibraryFolder removes an empty logical folder without touching media files.
func (store *MediaAssets) DeleteLibraryFolder(ctx context.Context, projectID, id string) error {
	if store.initErr != nil {
		return store.initErr
	}
	store.mu.Lock()
	defer store.mu.Unlock()
	if err := store.repo.DeleteLibraryFolder(ctx, strings.TrimSpace(id), domain.CleanProjectID(projectID)); err != nil {
		return libraryFolderError(err)
	}
	return nil
}
