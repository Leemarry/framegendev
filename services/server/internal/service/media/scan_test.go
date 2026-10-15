package media

import (
	"errors"
	"os"
	"path/filepath"
	"testing"

	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	"github.com/mediago-dev/mediago-drama/services/server/internal/repository"
	"github.com/mediago-dev/mediago-drama/services/server/internal/testutil"
)

func writeLibraryFile(t *testing.T, path string, data []byte) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("creating library file dir: %v", err)
	}
	if err := os.WriteFile(path, data, 0o600); err != nil {
		t.Fatalf("writing library file: %v", err)
	}
}

func TestScanRegistersLibraryFilesAndSkipsIgnoredEntries(t *testing.T) {
	workspaceRoot := t.TempDir()
	globalDir := filepath.Join(workspaceRoot, "library")
	workspaceRepos, err := repository.OpenWorkspaceRepositories(filepath.Join(t.TempDir(), "workspace.db"))
	testutil.CloseDB(t, workspaceRepos.DB)
	if err != nil {
		t.Fatalf("OpenWorkspaceRepositories() error = %v", err)
	}
	store := NewMediaAssetsFromRepository(workspaceRepos.MediaAssets, globalDir, workspaceRoot, workspaceRepos.Workspace, nil)

	dateDir := filepath.Join(globalDir, "2026-10-15")
	writeLibraryFile(t, filepath.Join(dateDir, "photo.png"), []byte("png-bytes"))
	writeLibraryFile(t, filepath.Join(dateDir, "meta.json"), []byte(`{"k":1}`))
	writeLibraryFile(t, filepath.Join(dateDir, ".hidden.png"), []byte("hidden"))
	writeLibraryFile(t, filepath.Join(dateDir, "thumbs.db"), []byte("db"))
	writeLibraryFile(t, filepath.Join(dateDir, "render.tmp"), []byte("tmp"))
	writeLibraryFile(t, filepath.Join(dateDir, "raw.bin"), []byte{0x00, 0x01, 0x02, 0x03})

	result, err := store.Scan(t.Context(), "", "")
	if err != nil {
		t.Fatalf("Scan() error = %v", err)
	}
	if result.Scanned != 2 || result.Added != 2 || result.Updated != 0 {
		t.Fatalf("first Scan() = %+v, want scanned=2 added=2 updated=0", result)
	}

	models, err := store.repo.ListMediaAssetsInScope("")
	if err != nil {
		t.Fatalf("ListMediaAssetsInScope() error = %v", err)
	}
	if len(models) != 2 {
		t.Fatalf("registered assets = %d, want 2", len(models))
	}
	byFilename := map[string]string{}
	for _, model := range models {
		if model.Source != MediaSourceImported || model.StorageStatus != StorageStatusReady {
			t.Fatalf("scanned asset %s source/storage = %q/%q, want imported/ready", model.ID, model.Source, model.StorageStatus)
		}
		byFilename[model.Filename] = model.RelPath
	}
	if got := byFilename["photo.png"]; got != "library/2026-10-15/photo.png" {
		t.Fatalf("photo.png rel path = %q, want library/2026-10-15/photo.png", got)
	}

	// Ignored entries and unsupported binary files stay unregistered.
	for _, name := range []string{".hidden.png", "thumbs.db", "render.tmp", "raw.bin"} {
		for _, model := range models {
			if model.Filename == name {
				t.Fatalf("%s was registered as an asset", name)
			}
		}
	}

	again, err := store.Scan(t.Context(), "", "")
	if err != nil {
		t.Fatalf("second Scan() error = %v", err)
	}
	if again.Scanned != 2 || again.Added != 0 || again.Updated != 0 {
		t.Fatalf("second Scan() = %+v, want scanned=2 added=0 updated=0", again)
	}

	writeLibraryFile(t, filepath.Join(dateDir, "photo.png"), []byte("png-bytes-with-more-content"))
	third, err := store.Scan(t.Context(), "", "")
	if err != nil {
		t.Fatalf("third Scan() error = %v", err)
	}
	if third.Scanned != 2 || third.Added != 0 || third.Updated != 1 {
		t.Fatalf("third Scan() = %+v, want scanned=2 added=0 updated=1", third)
	}
}

func TestScanPreservesNonImportedAssetFilename(t *testing.T) {
	workspaceRoot := t.TempDir()
	globalDir := filepath.Join(workspaceRoot, "library")
	workspaceRepos, err := repository.OpenWorkspaceRepositories(filepath.Join(t.TempDir(), "workspace.db"))
	testutil.CloseDB(t, workspaceRepos.DB)
	if err != nil {
		t.Fatalf("OpenWorkspaceRepositories() error = %v", err)
	}
	store := NewMediaAssetsFromRepository(workspaceRepos.MediaAssets, globalDir, workspaceRoot, workspaceRepos.Workspace, nil)

	// An uploaded asset stores its bytes as `<assetId>.png` while `filename`
	// holds the user-facing title, so refresh must not rename it.
	body := []byte("uploaded-bytes")
	writeLibraryFile(t, filepath.Join(globalDir, "2026-10-15", "asset-fixed.png"), body)
	model := mediaAssetModel{
		ID:            "asset-fixed",
		Kind:          MediaKindImage,
		Filename:      "lonely.png",
		MIMEType:      "image/png",
		SizeBytes:     int64(len(body)),
		RelPath:       "library/2026-10-15/asset-fixed.png",
		URL:           "/api/v1/media-assets/asset-fixed/content",
		Source:        MediaSourceUpload,
		StorageStatus: StorageStatusReady,
		CreatedAt:     domain.TimeFromString("2026-10-15T00:00:00Z"),
		UpdatedAt:     domain.TimeFromString("2026-10-15T00:00:00Z"),
	}
	if err := store.repo.CreateMediaAsset(model); err != nil {
		t.Fatalf("CreateMediaAsset() error = %v", err)
	}

	result, err := store.Scan(t.Context(), "", "")
	if err != nil {
		t.Fatalf("Scan() error = %v", err)
	}
	if result.Scanned != 1 || result.Added != 0 || result.Updated != 0 {
		t.Fatalf("Scan() = %+v, want scanned=1 added=0 updated=0", result)
	}

	models, err := store.repo.ListMediaAssetsInScope("")
	if err != nil {
		t.Fatalf("ListMediaAssetsInScope() error = %v", err)
	}
	if len(models) != 1 || models[0].Filename != "lonely.png" || models[0].Source != MediaSourceUpload {
		t.Fatalf("asset after scan = %+v, want unchanged lonely.png upload", models)
	}
}

func TestScanKeepsLibraryScopesIsolated(t *testing.T) {
	workspaceRoot := t.TempDir()
	globalDir := filepath.Join(workspaceRoot, "library")
	workspaceRepos, err := repository.OpenWorkspaceRepositories(filepath.Join(t.TempDir(), "workspace.db"))
	testutil.CloseDB(t, workspaceRepos.DB)
	if err != nil {
		t.Fatalf("OpenWorkspaceRepositories() error = %v", err)
	}
	projectDir := requireMediaTestProject(t, workspaceRepos.Workspace, "alpha")
	store := NewMediaAssetsFromRepository(workspaceRepos.MediaAssets, globalDir, workspaceRoot, workspaceRepos.Workspace, nil)

	writeLibraryFile(t, filepath.Join(globalDir, "2026-10-15", "global.png"), []byte("global"))
	writeLibraryFile(t, filepath.Join(projectDir, "library", "2026-10-15", "project.png"), []byte("project"))

	globalResult, err := store.Scan(t.Context(), "", "")
	if err != nil {
		t.Fatalf("Scan(global) error = %v", err)
	}
	if globalResult.Added != 1 {
		t.Fatalf("global Scan() added = %d, want 1", globalResult.Added)
	}

	projectResult, err := store.Scan(t.Context(), "alpha", "")
	if err != nil {
		t.Fatalf("Scan(project) error = %v", err)
	}
	if projectResult.Added != 1 {
		t.Fatalf("project Scan() added = %d, want 1", projectResult.Added)
	}

	globalModels, err := store.repo.ListMediaAssetsInScope("")
	if err != nil {
		t.Fatalf("ListMediaAssetsInScope(global) error = %v", err)
	}
	if len(globalModels) != 1 || globalModels[0].Filename != "global.png" {
		t.Fatalf("global scope assets = %+v, want only global.png", globalModels)
	}
	projectModels, err := store.repo.ListMediaAssetsInScope("alpha")
	if err != nil {
		t.Fatalf("ListMediaAssetsInScope(project) error = %v", err)
	}
	if len(projectModels) != 1 || projectModels[0].Filename != "project.png" {
		t.Fatalf("project scope assets = %+v, want only project.png", projectModels)
	}
}

func TestScanReportsMissingScopeOrFolder(t *testing.T) {
	workspaceRoot := t.TempDir()
	globalDir := filepath.Join(workspaceRoot, "library")
	workspaceRepos, err := repository.OpenWorkspaceRepositories(filepath.Join(t.TempDir(), "workspace.db"))
	testutil.CloseDB(t, workspaceRepos.DB)
	if err != nil {
		t.Fatalf("OpenWorkspaceRepositories() error = %v", err)
	}
	store := NewMediaAssetsFromRepository(workspaceRepos.MediaAssets, globalDir, workspaceRoot, workspaceRepos.Workspace, nil)

	if _, err := store.Scan(t.Context(), "missing-project", ""); !errors.Is(err, ErrLibraryFolderNotFound) {
		t.Fatalf("Scan(missing project) error = %v, want ErrLibraryFolderNotFound", err)
	}
	if _, err := store.Scan(t.Context(), "", "missing-folder"); !errors.Is(err, ErrLibraryFolderNotFound) {
		t.Fatalf("Scan(missing folder) error = %v, want ErrLibraryFolderNotFound", err)
	}
}
