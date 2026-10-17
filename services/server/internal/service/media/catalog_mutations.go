package media

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	"github.com/mediago-dev/mediago-drama/services/server/internal/repository"
	"github.com/mediago-dev/mediago-drama/services/server/internal/service/shared"
)

var (
	ErrAssetCatalogRevisionConflict = errors.New("asset revision conflict")
	ErrInvalidAssetCatalogMutation  = errors.New("invalid asset catalog mutation")
)

type AssetCatalogUpdateRequest struct {
	MediaAssetUpdateRequest
	ExpectedRevision string `json:"expectedRevision"`
	OperationID      string `json:"operationId"`
}

type AssetCatalogMutationRequest struct {
	ExpectedRevision string `json:"expectedRevision"`
	OperationID      string `json:"operationId"`
}

type AssetCatalogCopyRequest struct {
	ProjectID   string `json:"projectId"`
	OperationID string `json:"operationId"`
}

type assetCatalogMutationResult struct {
	Kind    string      `json:"kind"`
	Asset   *MediaAsset `json:"asset,omitempty"`
	Deleted bool        `json:"deleted,omitempty"`
}

// UpdateCatalog applies an optimistic, idempotent metadata update.
func (store *MediaAssets) UpdateCatalog(id, projectID string, request AssetCatalogUpdateRequest) (MediaAsset, bool, error) {
	if store.initErr != nil {
		return MediaAsset{}, false, store.initErr
	}
	request.OperationID = strings.TrimSpace(request.OperationID)
	request.ExpectedRevision = strings.TrimSpace(request.ExpectedRevision)
	if request.OperationID == "" || request.ExpectedRevision == "" {
		return MediaAsset{}, false, fmt.Errorf("%w: operationId and expectedRevision are required", ErrInvalidAssetCatalogMutation)
	}

	store.mu.Lock()
	defer store.mu.Unlock()
	if replayed, ok, err := store.replayCatalogMutation(request.OperationID, "asset"); err != nil || ok {
		return replayed.AssetValue(), ok, err
	}
	asset, found, err := store.updateLocked(id, projectID, request.MediaAssetUpdateRequest, request.ExpectedRevision)
	if err != nil || !found {
		return MediaAsset{}, found, err
	}
	if err := store.recordCatalogMutation(request.OperationID, assetCatalogMutationResult{Kind: "asset", Asset: &asset}); err != nil {
		return MediaAsset{}, false, err
	}
	return asset, true, nil
}

// DeleteCatalog permanently removes an asset only when its revision matches.
func (store *MediaAssets) DeleteCatalog(id, projectID string, request AssetCatalogMutationRequest) (bool, bool, error) {
	if store.initErr != nil {
		return false, false, store.initErr
	}
	if err := validateCatalogMutation(request); err != nil {
		return false, false, err
	}
	store.mu.Lock()
	defer store.mu.Unlock()
	if result, ok, err := store.replayCatalogMutation(request.OperationID, "delete"); err != nil || ok {
		return result.Deleted, ok, err
	}
	model, err := store.repo.GetMediaAsset(id)
	if repository.IsRecordNotFound(err) || (err == nil && domain.StringValue(model.ProjectID) != domain.CleanProjectID(projectID)) {
		return false, false, nil
	}
	if err != nil {
		return false, false, err
	}
	if domain.StringFromTime(model.UpdatedAt) != request.ExpectedRevision {
		return false, false, ErrAssetCatalogRevisionConflict
	}
	deleted, err := store.repo.DeleteMediaAssetIfRevision(id, model.UpdatedAt)
	if err != nil {
		return false, false, err
	}
	if !deleted {
		return false, false, ErrAssetCatalogRevisionConflict
	}
	asset := store.mediaAssetRecordFromModel(model)
	_ = os.Remove(asset.FilePath)
	if asset.PosterPath != "" {
		_ = os.Remove(asset.PosterPath)
	}
	result := assetCatalogMutationResult{Kind: "delete", Deleted: true}
	if err := store.recordCatalogMutation(request.OperationID, result); err != nil {
		return false, false, err
	}
	return true, true, nil
}

// RestoreCatalog restores a trashed asset only when its revision matches.
func (store *MediaAssets) RestoreCatalog(id, projectID string, request AssetCatalogMutationRequest) (MediaAsset, bool, error) {
	if store.initErr != nil {
		return MediaAsset{}, false, store.initErr
	}
	if err := validateCatalogMutation(request); err != nil {
		return MediaAsset{}, false, err
	}
	store.mu.Lock()
	defer store.mu.Unlock()
	if result, ok, err := store.replayCatalogMutation(request.OperationID, "restore"); err != nil || ok {
		return result.AssetValue(), ok, err
	}
	model, err := store.repo.GetMediaAsset(id)
	if repository.IsRecordNotFound(err) || (err == nil && domain.StringValue(model.ProjectID) != domain.CleanProjectID(projectID)) {
		return MediaAsset{}, false, nil
	}
	if err != nil {
		return MediaAsset{}, false, err
	}
	if domain.StringFromTime(model.UpdatedAt) != request.ExpectedRevision || model.TrashedAt == nil {
		return MediaAsset{}, false, ErrAssetCatalogRevisionConflict
	}
	restored, err := store.repo.RestoreMediaAssetIfRevision(id, model.UpdatedAt, time.Now().UTC())
	if err != nil {
		return MediaAsset{}, false, err
	}
	if !restored {
		return MediaAsset{}, false, ErrAssetCatalogRevisionConflict
	}
	model, err = store.repo.GetMediaAsset(id)
	if err != nil {
		return MediaAsset{}, false, err
	}
	asset := store.mediaAssetRecordFromModel(model)
	if err := store.recordCatalogMutation(request.OperationID, assetCatalogMutationResult{Kind: "restore", Asset: &asset}); err != nil {
		return MediaAsset{}, false, err
	}
	return asset, true, nil
}

func validateCatalogMutation(request AssetCatalogMutationRequest) error {
	if strings.TrimSpace(request.OperationID) == "" || strings.TrimSpace(request.ExpectedRevision) == "" {
		return fmt.Errorf("%w: operationId and expectedRevision are required", ErrInvalidAssetCatalogMutation)
	}
	return nil
}

// CopyCatalogAsset saves one source asset into a target project and replays retries by operation ID.
func (store *MediaAssets) CopyCatalogAsset(id, sourceProjectID string, request AssetCatalogCopyRequest) (MediaAsset, bool, error) {
	if store.initErr != nil {
		return MediaAsset{}, false, store.initErr
	}
	request.OperationID = strings.TrimSpace(request.OperationID)
	request.ProjectID = domain.CleanProjectID(request.ProjectID)
	if request.OperationID == "" || request.ProjectID == "" {
		return MediaAsset{}, false, fmt.Errorf("%w: operationId and projectId are required", ErrInvalidAssetCatalogMutation)
	}

	if result, ok, err := store.replayCatalogMutation(request.OperationID, "copy"); err != nil || ok {
		return result.AssetValue(), ok, err
	}
	asset, found, err := store.GetCatalog(id, sourceProjectID)
	if err != nil || !found {
		return MediaAsset{}, found, err
	}
	if asset.TrashedAt != "" {
		return MediaAsset{}, false, nil
	}
	asset, err = store.copyAssetIntoProject(asset, request.ProjectID)
	if err != nil {
		return MediaAsset{}, false, err
	}
	if err := store.recordCatalogMutation(request.OperationID, assetCatalogMutationResult{Kind: "copy", Asset: &asset}); err != nil {
		return MediaAsset{}, false, err
	}
	return asset, true, nil
}

// GetCatalog returns one asset only when it belongs to the requested scope.
func (store *MediaAssets) GetCatalog(id, projectID string) (MediaAsset, bool, error) {
	asset, found, err := store.Get(id)
	if err != nil || !found {
		return MediaAsset{}, found, err
	}
	if asset.ProjectID != domain.CleanProjectID(projectID) {
		return MediaAsset{}, false, nil
	}
	return asset, true, nil
}

func (result assetCatalogMutationResult) AssetValue() MediaAsset {
	if result.Asset == nil {
		return MediaAsset{}
	}
	return *result.Asset
}

func (store *MediaAssets) replayCatalogMutation(operationID string, kind string) (assetCatalogMutationResult, bool, error) {
	model, err := store.repo.GetAssetCatalogOperation(operationID)
	if repository.IsRecordNotFound(err) {
		return assetCatalogMutationResult{}, false, nil
	}
	if err != nil {
		return assetCatalogMutationResult{}, false, err
	}
	result := assetCatalogMutationResult{}
	if err := json.Unmarshal([]byte(model.ResponseJSON), &result); err != nil || result.Kind != kind {
		return assetCatalogMutationResult{}, false, fmt.Errorf("%w: operationId was used for a different operation", ErrInvalidAssetCatalogMutation)
	}
	return result, true, nil
}

func (store *MediaAssets) recordCatalogMutation(operationID string, result assetCatalogMutationResult) error {
	response, err := json.Marshal(result)
	if err != nil {
		return fmt.Errorf("encoding asset catalog mutation: %w", err)
	}
	id, err := shared.RandomID("op")
	if err != nil {
		return err
	}
	return store.repo.CreateAssetCatalogOperation(domain.AssetCatalogOperationModel{
		ID: id, OperationID: operationID, ResponseJSON: string(response),
	})
}
