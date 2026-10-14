package media

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestLibraryFolderMovePreservesContent(t *testing.T) {
	store := newTestMediaAssets(t, filepath.Join(t.TempDir(), "db.sqlite"), t.TempDir())
	original, err := store.SaveReader(t.Context(), strings.NewReader("stable bytes"), "reference.txt", "text/plain", "")
	if err != nil {
		t.Fatal(err)
	}
	folder, err := store.CreateLibraryFolder(t.Context(), "", LibraryFolderRequest{Name: "资料"})
	if err != nil {
		t.Fatal(err)
	}
	updated, ok, err := store.Update(original.ID, "", MediaAssetUpdateRequest{FolderID: &folder.ID})
	if err != nil || !ok || updated.FolderID != folder.ID {
		t.Fatalf("move: %#v %v %v", updated, ok, err)
	}
	if updated.URL != original.URL || updated.FilePath != original.FilePath || updated.DownloadPath != original.DownloadPath || updated.ContentHash != original.ContentHash {
		t.Fatalf("identity changed: %#v", updated)
	}
	bytes, err := os.ReadFile(updated.FilePath)
	if err != nil || string(bytes) != "stable bytes" {
		t.Fatalf("file: %q %v", bytes, err)
	}
}
