package media

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	"github.com/mediago-dev/mediago-drama/services/server/internal/platform/timestamp"
	"github.com/mediago-dev/mediago-drama/services/server/internal/service/shared"
)

// MediaAssetScanResult summarizes one library directory scan.
type MediaAssetScanResult struct {
	Scanned int `json:"scanned"`
	Added   int `json:"added"`
	Updated int `json:"updated"`
}

type discoveredLibraryFile struct {
	AbsolutePath string
	RelativePath string
	Filename     string
	Kind         string
	MIMEType     string
	SizeBytes    int64
}

// Scan walks the library directory owned by one scope and registers media files
// that were copied onto disk, then refreshes metadata of already known files.
// Files are matched by their library-relative path within the same scope only.
func (store *MediaAssets) Scan(ctx context.Context, projectID string, folderID string) (MediaAssetScanResult, error) {
	result := MediaAssetScanResult{}
	if store.initErr != nil {
		return result, store.initErr
	}
	projectID = domain.CleanProjectID(projectID)

	if err := store.repo.CheckLibraryScope(ctx, projectID); err != nil {
		return result, libraryFolderError(err)
	}

	folderID = strings.TrimSpace(folderID)
	if folderID != "" {
		if _, err := store.repo.GetLibraryFolder(ctx, folderID, projectID); err != nil {
			return result, libraryFolderError(err)
		}
	}

	root, err := store.libraryScanRoot(projectID)
	if err != nil {
		return result, err
	}
	if _, err := os.Stat(root); err != nil {
		if os.IsNotExist(err) {
			return result, nil
		}
		return result, fmt.Errorf("reading library directory: %w", err)
	}

	files, err := scanLibraryMediaFiles(store, projectID, root)
	if err != nil {
		return result, err
	}
	result.Scanned = len(files)

	store.mu.Lock()
	defer store.mu.Unlock()

	models, err := store.repo.ListMediaAssetsInScope(projectID)
	if err != nil {
		return result, err
	}
	modelByPath := map[string]mediaAssetModel{}
	usedIDs := map[string]bool{}
	for _, model := range models {
		modelByPath[filepath.Clean(filepath.FromSlash(strings.TrimSpace(model.RelPath)))] = model
		usedIDs[model.ID] = true
	}

	for _, file := range files {
		if existing, ok := modelByPath[filepath.Clean(filepath.FromSlash(file.RelativePath))]; ok {
			updates := map[string]any{}
			if existing.MIMEType != file.MIMEType {
				updates["mime_type"] = file.MIMEType
			}
			if existing.SizeBytes != file.SizeBytes {
				updates["size_bytes"] = file.SizeBytes
			}
			if file.Kind == MediaKindImage && existing.Source == MediaSourceImported && (existing.SizeBytes != file.SizeBytes ||
				(len(libraryTagsFromJSON(existing.ColorsJSON)) == 0 && existing.MetadataStatus != MetadataStatusFailed)) {
				metadata := enrichImageMetadata(MediaAsset{FilePath: file.AbsolutePath})
				updates["width"] = metadata.Width
				updates["height"] = metadata.Height
				updates["colors_json"] = imagePaletteJSON(metadata.Colors)
				updates["metadata_status"] = metadata.MetadataStatus
			}
			// Only scan-imported assets take their display name from the file on
			// disk. Uploaded/generated assets keep the storage name `<assetId>.<ext>`
			// on disk while `filename` holds the user-facing title, so comparing the
			// two would clobber the title on every scan.
			if existing.Source == MediaSourceImported && existing.Filename != file.Filename {
				updates["filename"] = file.Filename
			}
			if len(updates) == 0 {
				continue
			}
			if err := store.repo.UpdateMediaAssetStorage(existing.ID, updates); err != nil {
				return result, err
			}
			result.Updated++
			continue
		}

		id, err := uniqueMediaAssetID(usedIDs)
		if err != nil {
			return result, err
		}
		nowTime := time.Now()
		now := timestamp.FormatRFC3339Nano(nowTime)
		model := mediaAssetModel{
			ID:              id,
			Kind:            file.Kind,
			Filename:        file.Filename,
			LibraryFolderID: folderID,
			MIMEType:        file.MIMEType,
			SizeBytes:       file.SizeBytes,
			RelPath:         file.RelativePath,
			URL:             "/api/v1/media-assets/" + url.PathEscape(id) + "/content",
			ProjectID:       domain.StringPtr(projectID),
			Source:          MediaSourceImported,
			StorageStatus:   StorageStatusReady,
			CreatedAt:       domain.TimeFromString(now),
			UpdatedAt:       domain.TimeFromString(now),
		}
		if file.Kind == MediaKindImage {
			metadata := enrichImageMetadata(MediaAsset{FilePath: file.AbsolutePath})
			model.Width = metadata.Width
			model.Height = metadata.Height
			model.ColorsJSON = imagePaletteJSON(metadata.Colors)
			model.MetadataStatus = metadata.MetadataStatus
		}
		if err := store.repo.CreateMediaAsset(model); err != nil {
			return result, err
		}
		result.Added++
	}

	return result, nil
}

func (store *MediaAssets) libraryScanRoot(projectID string) (string, error) {
	if projectID != "" {
		projectDir, err := store.projectDir(projectID)
		if err != nil {
			return "", err
		}
		return shared.ProjectLibraryAssetsDir(projectDir), nil
	}
	baseDir := strings.TrimSpace(store.dir)
	if baseDir == "" && strings.TrimSpace(store.workspaceRoot) != "" {
		baseDir = shared.WorkspacePathsFor(store.workspaceRoot).LibraryAssetsDir()
	}
	if baseDir == "" {
		baseDir = defaultMediaDir()
	}
	return baseDir, nil
}

func scanLibraryMediaFiles(store *MediaAssets, projectID string, root string) ([]discoveredLibraryFile, error) {
	files := []discoveredLibraryFile{}
	seen := map[string]bool{}
	err := filepath.WalkDir(root, func(path string, entry os.DirEntry, err error) error {
		if err != nil {
			return fmt.Errorf("walking library directory: %w", err)
		}
		if path != root && shared.ShouldIgnoreAssetEntry(entry.Name()) {
			if entry.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		if entry.IsDir() {
			return nil
		}
		relativePath, ok := relativePathUnder(root, path)
		if !ok {
			return nil
		}
		key := strings.ToLower(relativePath)
		if seen[key] {
			return nil
		}
		seen[key] = true

		mimeType := shared.DetectFileMIMEType(path)
		kind := shared.KindFromMIMEType(mimeType)
		if !isSupportedMediaAssetKind(kind) {
			return nil
		}
		info, err := entry.Info()
		if err != nil {
			return nil
		}

		files = append(files, discoveredLibraryFile{
			AbsolutePath: filepath.Clean(path),
			RelativePath: store.mediaAssetDBRelPath(projectID, filepath.Clean(path)),
			Filename:     filepath.Base(relativePath),
			Kind:         kind,
			MIMEType:     mimeType,
			SizeBytes:    info.Size(),
		})
		return nil
	})
	if err != nil {
		return nil, err
	}
	return files, nil
}

func uniqueMediaAssetID(used map[string]bool) (string, error) {
	for attempt := 0; attempt < 5; attempt++ {
		id, err := shared.RandomID("asset")
		if err != nil {
			return "", err
		}
		if !used[id] {
			used[id] = true
			return id, nil
		}
	}
	return "", fmt.Errorf("generating media asset id: no unique id available")
}
