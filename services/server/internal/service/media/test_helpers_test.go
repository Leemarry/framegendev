package media

import (
	"testing"

	"github.com/mediago-dev/mediago-drama/services/server/internal/repository"
	"github.com/mediago-dev/mediago-drama/services/server/internal/service/shared"
	"github.com/mediago-dev/mediago-drama/services/server/internal/testutil"
)

func newTestMediaAssets(t *testing.T, path string, dir string) *MediaAssets {
	t.Helper()
	store := NewMediaAssets(path, dir)
	if store.initErr != nil {
		return store
	}
	if path == "" {
		path = shared.WorkspacePathsFor("").DatabasePath()
	}
	db, err := repository.OpenGormSQLite(path)
	if err != nil {
		t.Fatal(err)
	}
	testutil.CloseDB(t, db)
	return store
}

func newTestMediaAssetRepository(t *testing.T, path string) (*repository.MediaAssetRepository, error) {
	t.Helper()
	repo, err := repository.NewMediaAssetRepository(path)
	if err == nil {
		db, openErr := repository.OpenGormSQLite(path)
		if openErr != nil {
			t.Fatal(openErr)
		}
		testutil.CloseDB(t, db)
	}
	return repo, err
}
