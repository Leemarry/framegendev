package repository

import (
	"path/filepath"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	"github.com/mediago-dev/mediago-drama/services/server/internal/testutil"
	"gorm.io/gorm"
)

func TestLibraryMetadataMigrationAndReopen(t *testing.T) {
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
	if err != nil || before.TagsJSON != "[]" || before.Note != "" || before.Rating != 0 || before.Favorite || before.URL != "/stable" {
		t.Fatalf("migration: %#v %v", before, err)
	}
	if err := repo.UpdateMediaAssetMetadata("legacy", map[string]any{"tags_json": `["中文"]`, "note": "备注\n", "rating": 5, "favorite": true}); err != nil {
		t.Fatal(err)
	}
	pool, err := db.DB()
	if err != nil {
		t.Fatal(err)
	}
	if err := pool.Close(); err != nil {
		t.Fatal(err)
	}
	reopened, err := gorm.Open(sqlite.Open(path), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	testutil.CloseDB(t, reopened)
	persisted, err := NewMediaAssetRepositoryFromDB(reopened).GetMediaAsset("legacy")
	if err != nil || persisted.TagsJSON != `["中文"]` || persisted.Note != "备注\n" || persisted.Rating != 5 || !persisted.Favorite || persisted.RelPath != before.RelPath || persisted.URL != before.URL {
		t.Fatalf("reopen: %#v %v", persisted, err)
	}
	if err := reopened.Model(&domain.AssetModel{}).Where("id = ?", "legacy").Updates(map[string]any{"tags_json": "[]", "note": "", "rating": 0, "favorite": false}).Error; err != nil {
		t.Fatal(err)
	}
	cleared, err := NewMediaAssetRepositoryFromDB(reopened).GetMediaAsset("legacy")
	if err != nil || cleared.TagsJSON != "[]" || cleared.Note != "" || cleared.Rating != 0 || cleared.Favorite {
		t.Fatalf("clear: %#v %v", cleared, err)
	}
}
