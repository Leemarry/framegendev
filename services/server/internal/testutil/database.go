// Package testutil contains resources owned by isolated backend tests.
package testutil

import (
	"testing"

	"gorm.io/gorm"
)

// CloseDB releases a test database after later-registered worker cleanups finish.
func CloseDB(t testing.TB, db *gorm.DB) {
	t.Helper()
	if db == nil {
		return
	}
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatalf("getting test database pool: %v", err)
	}
	t.Cleanup(func() {
		if err := sqlDB.Close(); err != nil {
			t.Errorf("closing test database: %v", err)
		}
	})
}
