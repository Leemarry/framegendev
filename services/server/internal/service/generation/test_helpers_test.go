package generation

import (
	"testing"

	"github.com/mediago-dev/mediago-drama/services/server/internal/repository"
	"github.com/mediago-dev/mediago-drama/services/server/internal/service/media"
	"github.com/mediago-dev/mediago-drama/services/server/internal/service/shared"
	"github.com/mediago-dev/mediago-drama/services/server/internal/testutil"
)

func closeTestDatabase(t *testing.T, path string) {
	t.Helper()
	if path == "" {
		path = shared.WorkspacePathsFor("").DatabasePath()
	}
	db, err := repository.OpenGormSQLite(path)
	if err != nil {
		t.Fatal(err)
	}
	testutil.CloseDB(t, db)
}

func newTestGenerationTaskService(t *testing.T, path string, generateID func(string) (string, error)) *GenerationTaskService {
	t.Helper()
	service := NewGenerationTaskService(path, generateID)
	if service.initErr == nil {
		closeTestDatabase(t, path)
	}
	return service
}

func newTestGenerationPreferenceService(t *testing.T, path string) *GenerationPreferenceService {
	t.Helper()
	service := NewGenerationPreferenceService(path)
	if service.initErr == nil {
		closeTestDatabase(t, path)
	}
	return service
}

func newTestMediaAssets(t *testing.T, path string, dir string) *media.MediaAssets {
	t.Helper()
	store := media.NewMediaAssets(path, dir)
	closeTestDatabase(t, path)
	return store
}

func newTestMediaAssetRepository(t *testing.T, path string) (*repository.MediaAssetRepository, error) {
	t.Helper()
	repo, err := repository.NewMediaAssetRepository(path)
	if err == nil {
		closeTestDatabase(t, path)
	}
	return repo, err
}

func newTestGenerationTaskRepository(t *testing.T, path string) (*repository.GenerationTaskRepository, error) {
	t.Helper()
	repo, err := repository.NewGenerationTaskRepository(path)
	if err == nil {
		closeTestDatabase(t, path)
	}
	return repo, err
}
