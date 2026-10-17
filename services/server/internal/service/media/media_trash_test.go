package media

import (
	"encoding/base64"
	"os"
	"path/filepath"
	"testing"
)

func TestMediaAssetsTrashAndRestoreInScope(t *testing.T) {
	workspaceRoot := t.TempDir()
	globalDir := filepath.Join(workspaceRoot, "library")
	repo, err := newTestMediaAssetRepository(t, filepath.Join(t.TempDir(), "settings.db"))
	if err != nil {
		t.Fatalf("NewMediaAssetRepository() error = %v", err)
	}
	store := NewMediaAssetsFromRepository(repo, globalDir, workspaceRoot, nil, nil)

	asset, err := store.SaveBase64WithOptions(
		MediaKindImage,
		"image/png",
		base64.StdEncoding.EncodeToString([]byte("image-bytes")),
		"",
		MediaAssetSaveOptions{Source: MediaSourceUpload},
	)
	if err != nil {
		t.Fatalf("SaveBase64WithOptions() error = %v", err)
	}

	if _, ok, err := store.MoveToTrashInScope(asset.ID, "alpha"); err != nil || ok {
		t.Fatalf("MoveToTrashInScope() outside its scope = %v, %v; want no change", ok, err)
	}

	trashed, ok, err := store.MoveToTrashInScope(asset.ID, "")
	if err != nil {
		t.Fatalf("MoveToTrashInScope() error = %v", err)
	}
	if !ok || trashed.TrashedAt == "" {
		t.Fatalf("MoveToTrashInScope() = %+v, %v; want a trashed asset", trashed, ok)
	}

	visible, err := store.List("")
	if err != nil {
		t.Fatalf("List() error = %v", err)
	}
	for _, candidate := range visible {
		if candidate.ID == asset.ID {
			t.Fatal("trashed asset still listed in the library")
		}
	}

	trashedList, err := store.ListTrashed("")
	if err != nil {
		t.Fatalf("ListTrashed() error = %v", err)
	}
	if len(trashedList) != 1 || trashedList[0].ID != asset.ID {
		t.Fatalf("ListTrashed() = %+v, want the trashed asset", trashedList)
	}

	if _, err := os.Stat(asset.FilePath); err != nil {
		t.Fatalf("trashing an asset removed its file: %v", err)
	}

	restored, ok, err := store.RestoreInScope(asset.ID, "")
	if err != nil {
		t.Fatalf("RestoreInScope() error = %v", err)
	}
	if !ok || restored.TrashedAt != "" {
		t.Fatalf("RestoreInScope() = %+v, %v; want a library asset", restored, ok)
	}

	visible, err = store.List("")
	if err != nil {
		t.Fatalf("List() after restore error = %v", err)
	}
	if len(visible) != 1 || visible[0].ID != asset.ID {
		t.Fatalf("List() after restore = %+v, want the restored asset", visible)
	}
}
