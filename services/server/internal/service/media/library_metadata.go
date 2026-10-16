package media

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"path/filepath"
	"strings"
	"unicode/utf8"

	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	"github.com/mediago-dev/mediago-drama/services/server/internal/platform/timestamp"
	"github.com/mediago-dev/mediago-drama/services/server/internal/repository"
	"github.com/mediago-dev/mediago-drama/services/server/internal/service/shared"
)

// ErrInvalidMediaAssetUpdate identifies invalid user metadata at the API boundary.
var ErrInvalidMediaAssetUpdate = errors.New("invalid media asset update")

// Update changes display metadata for an asset owned by the requested scope.
// It preserves the physical file, content identity and generated metadata.
func (store *MediaAssets) Update(id string, projectID string, payload MediaAssetUpdateRequest) (MediaAsset, bool, error) {
	if store.initErr != nil {
		return MediaAsset{}, false, store.initErr
	}
	store.mu.Lock()
	defer store.mu.Unlock()
	model, err := store.repo.GetMediaAsset(id)
	if repository.IsRecordNotFound(err) {
		return MediaAsset{}, false, nil
	}
	if err != nil {
		return MediaAsset{}, false, err
	}
	if domain.StringValue(model.ProjectID) != domain.CleanProjectID(projectID) {
		return MediaAsset{}, false, nil
	}

	updates := make(map[string]any)
	invalid := func(message string) (MediaAsset, bool, error) {
		return MediaAsset{}, false, fmt.Errorf("%w: %s", ErrInvalidMediaAssetUpdate, message)
	}
	if payload.Filename != nil {
		filename := shared.SafeFilename(*payload.Filename)
		if filename == "" {
			return invalid("filename is required")
		}
		if filepath.Ext(filename) == "" {
			filename += filepath.Ext(model.Filename)
		}
		updates["filename"] = filename
	}
	if payload.Tags != nil {
		if len(*payload.Tags) > 20 {
			return invalid("tags must contain at most 20 entries")
		}
		tags := make([]string, 0, len(*payload.Tags))
		seen := make(map[string]bool)
		for _, value := range *payload.Tags {
			tag := strings.TrimSpace(value)
			if utf8.RuneCountInString(tag) > 40 {
				return invalid("each tag must contain at most 40 characters")
			}
			if tag != "" && !seen[tag] {
				tags = append(tags, tag)
				seen[tag] = true
			}
		}
		encoded, err := json.Marshal(tags)
		if err != nil {
			return MediaAsset{}, false, fmt.Errorf("encoding media tags: %w", err)
		}
		updates["tags_json"] = string(encoded)
	}
	if payload.Note != nil {
		if utf8.RuneCountInString(*payload.Note) > 4000 {
			return invalid("note must contain at most 4000 characters")
		}
		updates["note"] = *payload.Note
	}
	if payload.Rating != nil {
		if *payload.Rating < 0 || *payload.Rating > 5 {
			return invalid("rating must be an integer from 0 to 5")
		}
		updates["rating"] = *payload.Rating
	}
	if payload.Favorite != nil {
		updates["favorite"] = *payload.Favorite
	}
	if payload.FolderID != nil {
		folderID := strings.TrimSpace(*payload.FolderID)
		if folderID != "" {
			if _, err := store.repo.GetLibraryFolder(context.Background(), folderID, domain.CleanProjectID(projectID)); err != nil {
				return MediaAsset{}, false, libraryFolderError(err)
			}
		}
		updates["library_folder_id"] = folderID
	}
	if len(updates) == 0 {
		return invalid("at least one metadata field is required")
	}
	updates["updated_at"] = domain.TimeFromString(timestamp.NowRFC3339Nano())
	if err := store.repo.UpdateMediaAssetMetadata(model.ID, updates); err != nil {
		return MediaAsset{}, false, err
	}
	model, err = store.repo.GetMediaAsset(model.ID)
	if err != nil {
		return MediaAsset{}, false, err
	}
	return store.mediaAssetRecordFromModel(model), true, nil
}

func libraryTagsFromJSON(value string) []string {
	tags := []string{}
	if json.Unmarshal([]byte(value), &tags) != nil || tags == nil {
		return []string{}
	}
	return tags
}
