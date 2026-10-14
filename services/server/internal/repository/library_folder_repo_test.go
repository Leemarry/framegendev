package repository

import (
	"errors"
	"path/filepath"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	"github.com/mediago-dev/mediago-drama/services/server/internal/testutil"
	"gorm.io/gorm"
)

func TestLibraryFolderMigrationAndReopen(t *testing.T) {
	path := filepath.Join(t.TempDir(), "legacy.db")
	db, err := OpenGormSQLite(path)
	if err != nil {
		t.Fatal(err)
	}
	testutil.CloseDB(t, db)
	if err := db.Exec(`CREATE TABLE assets (id TEXT PRIMARY KEY, kind TEXT NOT NULL, filename TEXT NOT NULL, mime_type TEXT NOT NULL, size_bytes INTEGER NOT NULL, rel_path TEXT NOT NULL DEFAULT '', url TEXT NOT NULL DEFAULT '', created_at DATETIME, updated_at DATETIME)`).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Exec(`INSERT INTO assets(id,kind,filename,mime_type,size_bytes,rel_path,url) VALUES ('legacy','text','原文件.txt','text/plain',5,'original.txt','/stable')`).Error; err != nil {
		t.Fatal(err)
	}
	repo, err := NewMediaAssetRepository(path)
	if err != nil {
		t.Fatal(err)
	}
	before, err := repo.GetMediaAsset("legacy")
	if err != nil || before.LibraryFolderID != "" {
		t.Fatalf("legacy root: %#v %v", before, err)
	}
	root := domain.AssetLibraryFolderModel{ID: "root", Name: "角色"}
	child := domain.AssetLibraryFolderModel{ID: "child", ParentID: root.ID, Name: "主角"}
	for _, folder := range []*domain.AssetLibraryFolderModel{&root, &child} {
		if err := repo.CreateLibraryFolder(t.Context(), folder); err != nil {
			t.Fatal(err)
		}
	}
	duplicate := domain.AssetLibraryFolderModel{ID: "duplicate", Name: "角色"}
	if err := repo.CreateLibraryFolder(t.Context(), &duplicate); !errors.Is(err, ErrLibraryFolderConflict) {
		t.Fatalf("duplicate: %v", err)
	}
	if err := repo.RenameLibraryFolder(t.Context(), child, "主人公"); err != nil {
		t.Fatal(err)
	}
	if err := repo.UpdateMediaAssetMetadata(before.ID, map[string]any{"library_folder_id": child.ID}); err != nil {
		t.Fatal(err)
	}
	pool, err := db.DB()
	if err != nil {
		t.Fatal(err)
	}
	if err = pool.Close(); err != nil {
		t.Fatal(err)
	}
	reopened, err := gorm.Open(sqlite.Open(path), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	testutil.CloseDB(t, reopened)
	persisted := NewMediaAssetRepositoryFromDB(reopened)
	folders, err := persisted.ListLibraryFolders(t.Context(), "")
	if err != nil || len(folders) != 2 {
		t.Fatalf("reopen folders: %#v %v", folders, err)
	}
	got, err := persisted.GetLibraryFolder(t.Context(), child.ID, "")
	if err != nil || got.ParentID != root.ID || got.Name != "主人公" {
		t.Fatalf("reopen child: %#v %v", got, err)
	}
	asset, err := persisted.GetMediaAsset(before.ID)
	if err != nil || asset.LibraryFolderID != child.ID || asset.RelPath != before.RelPath || asset.URL != before.URL || asset.Filename != before.Filename || asset.ContentHash != before.ContentHash {
		t.Fatalf("identity: %#v %v", asset, err)
	}
	projectRepo := NewWorkspaceRepository(reopened)
	now := time.Now().UTC()
	if err := projectRepo.UpsertProject(domain.WorkspaceProjectModel{ID: "project", Name: "test", ProjectDir: t.TempDir(), RelativeDir: "project", CreatedAt: now, UpdatedAt: now}); err != nil {
		t.Fatal(err)
	}
	owned := domain.AssetLibraryFolderModel{ID: "owned", ProjectID: "project", Name: "owned"}
	if err := persisted.CreateLibraryFolder(t.Context(), &owned); err != nil {
		t.Fatal(err)
	}
	if ok, err := projectRepo.PermanentlyDeleteProject("project"); err != nil || !ok {
		t.Fatalf("delete: %v %v", ok, err)
	}
	if folders, err := persisted.ListLibraryFolders(t.Context(), "project"); err != nil || len(folders) != 0 {
		t.Fatalf("orphan folders: %#v %v", folders, err)
	}
	if folders, err := persisted.ListLibraryFolders(t.Context(), ""); err != nil || len(folders) != 2 {
		t.Fatalf("global affected: %#v %v", folders, err)
	}
}
