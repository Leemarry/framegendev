package repository

import (
	"path/filepath"
	"testing"
	"time"

	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	"github.com/mediago-dev/mediago-drama/services/server/internal/testutil"
)

func newTrashTestRepository(t *testing.T) *MediaAssetRepository {
	t.Helper()

	repo, err := NewMediaAssetRepository(filepath.Join(t.TempDir(), "workspace.db"))
	if repo != nil {
		testutil.CloseDB(t, repo.db)
	}
	if err != nil {
		t.Fatalf("NewMediaAssetRepository() error = %v", err)
	}
	seedRepositoryProject(t, repo.db, "alpha")

	return repo
}

func seedTrashTestAsset(t *testing.T, repo *MediaAssetRepository, id string, projectID string) {
	t.Helper()

	asset := domain.AssetModel{
		ID:        id,
		Kind:      "image",
		Filename:  id + ".png",
		MIMEType:  "image/png",
		SizeBytes: 4,
		RelPath:   "library/" + id + ".png",
		CreatedAt: domain.TimeFromString("2026-05-22T00:00:00Z"),
		UpdatedAt: domain.TimeFromString("2026-05-22T00:00:00Z"),
	}
	if projectID != "" {
		asset.ProjectID = domain.StringPtr(projectID)
	}
	if err := repo.CreateMediaAsset(asset); err != nil {
		t.Fatalf("CreateMediaAsset(%s) error = %v", id, err)
	}
}

func TestMediaAssetRepositoryTrashLifecycle(t *testing.T) {
	repo := newTrashTestRepository(t)
	seedTrashTestAsset(t, repo, "asset-global", "")
	seedTrashTestAsset(t, repo, "asset-project", "alpha")

	trashed, err := repo.TrashMediaAsset("asset-global", time.Now())
	if err != nil {
		t.Fatalf("TrashMediaAsset() error = %v", err)
	}
	if !trashed {
		t.Fatal("TrashMediaAsset() removed nothing")
	}

	visible, err := repo.ListMediaAssets("alpha")
	if err != nil {
		t.Fatalf("ListMediaAssets() error = %v", err)
	}
	for _, model := range visible {
		if model.ID == "asset-global" {
			t.Fatal("trashed asset still listed in the library")
		}
	}

	trashedModels, err := repo.ListTrashedMediaAssets("alpha")
	if err != nil {
		t.Fatalf("ListTrashedMediaAssets() error = %v", err)
	}
	if len(trashedModels) != 1 || trashedModels[0].ID != "asset-global" {
		t.Fatalf("ListTrashedMediaAssets() = %+v, want the trashed global asset", trashedModels)
	}

	restored, err := repo.RestoreMediaAsset("asset-global", time.Now())
	if err != nil {
		t.Fatalf("RestoreMediaAsset() error = %v", err)
	}
	if !restored {
		t.Fatal("RestoreMediaAsset() restored nothing")
	}

	again, err := repo.ListTrashedMediaAssets("alpha")
	if err != nil {
		t.Fatalf("ListTrashedMediaAssets() error = %v", err)
	}
	if len(again) != 0 {
		t.Fatalf("ListTrashedMediaAssets() after restore = %+v, want none", again)
	}
	if _, err := repo.GetMediaAsset("asset-global"); err != nil {
		t.Fatalf("GetMediaAsset() after restore error = %v", err)
	}
}

func TestMediaAssetRepositoryTrashIsIdempotent(t *testing.T) {
	repo := newTrashTestRepository(t)
	seedTrashTestAsset(t, repo, "asset-once", "alpha")

	if _, err := repo.TrashMediaAsset("asset-once", time.Now()); err != nil {
		t.Fatalf("first TrashMediaAsset() error = %v", err)
	}
	second, err := repo.TrashMediaAsset("asset-once", time.Now())
	if err != nil {
		t.Fatalf("second TrashMediaAsset() error = %v", err)
	}
	if second {
		t.Fatal("trashing a trashed asset reported a change")
	}

	restored, err := repo.RestoreMediaAsset("asset-once", time.Now())
	if err != nil {
		t.Fatalf("RestoreMediaAsset() error = %v", err)
	}
	if !restored {
		t.Fatal("RestoreMediaAsset() restored nothing")
	}
	if again, err := repo.RestoreMediaAsset("asset-once", time.Now()); err != nil || again {
		t.Fatalf("second RestoreMediaAsset() = %v, %v; want no change", again, err)
	}
}

func TestMediaAssetRepositoryTrashFiltersEveryList(t *testing.T) {
	repo := newTrashTestRepository(t)
	seedTrashTestAsset(t, repo, "asset-library", "")
	seedTrashTestAsset(t, repo, "asset-scope", "alpha")

	if _, err := repo.TrashMediaAsset("asset-library", time.Now()); err != nil {
		t.Fatalf("TrashMediaAsset() error = %v", err)
	}
	if _, err := repo.TrashMediaAsset("asset-scope", time.Now()); err != nil {
		t.Fatalf("TrashMediaAsset() error = %v", err)
	}

	all, err := repo.ListAllMediaAssets()
	if err != nil {
		t.Fatalf("ListAllMediaAssets() error = %v", err)
	}
	if len(all) != 0 {
		t.Fatalf("ListAllMediaAssets() = %+v, want no visible assets", all)
	}

	inScope, err := repo.ListMediaAssetsInScope("alpha")
	if err != nil {
		t.Fatalf("ListMediaAssetsInScope() error = %v", err)
	}
	if len(inScope) != 0 {
		t.Fatalf("ListMediaAssetsInScope() = %+v, want no visible assets", inScope)
	}
}
