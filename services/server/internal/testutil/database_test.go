package testutil

import (
	"path/filepath"
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func TestCloseDBReleasesPoolAtTestCleanup(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "test.db")), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	pool, err := db.DB()
	if err != nil {
		t.Fatal(err)
	}
	t.Run("owner", func(t *testing.T) {
		CloseDB(t, db)
		if err := pool.Ping(); err != nil {
			t.Fatal(err)
		}
	})
	if err := pool.Ping(); err == nil {
		t.Fatal("test cleanup left the SQLite pool open")
	}
}
