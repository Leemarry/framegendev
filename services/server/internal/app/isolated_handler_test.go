package app

import (
	"io/fs"
	"net/http"
	"os"
	"testing"

	"github.com/mediago-dev/mediago-drama/services/server/internal/repository"
	"github.com/mediago-dev/mediago-drama/services/server/internal/testutil"
)

func newIsolatedHandler(t *testing.T, staticFS fs.FS, config Config) http.Handler {
	t.Helper()
	handler := NewHandlerWithConfig(staticFS, config)
	store := handler.(*Handler).api.workspaceState
	settingsPath := config.SettingsDBPath
	if settingsPath == "" {
		settingsPath = store.SettingsDatabasePath()
	}
	for _, path := range []string{store.DatabasePath(), settingsPath} {
		if _, err := os.Stat(path); err != nil {
			continue
		}
		db, err := repository.OpenGormSQLite(path)
		if err != nil {
			t.Fatal(err)
		}
		testutil.CloseDB(t, db)
	}
	closeTestHandler(t, handler)
	return handler
}
