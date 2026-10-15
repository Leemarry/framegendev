package media

import (
	"errors"
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

func TestDeleteLibraryFolderRequiresEmptyFolder(t *testing.T) {
	store := newTestMediaAssets(t, filepath.Join(t.TempDir(), "db.sqlite"), t.TempDir())
	asset, err := store.SaveReader(t.Context(), strings.NewReader("stable bytes"), "reference.txt", "text/plain", "")
	if err != nil {
		t.Fatal(err)
	}
	folder, err := store.CreateLibraryFolder(t.Context(), "", LibraryFolderRequest{Name: "资料"})
	if err != nil {
		t.Fatal(err)
	}
	if _, _, err = store.Update(asset.ID, "", MediaAssetUpdateRequest{FolderID: &folder.ID}); err != nil {
		t.Fatal(err)
	}
	if err = store.DeleteLibraryFolder(t.Context(), "", folder.ID); !errors.Is(err, ErrLibraryFolderNotEmpty) {
		t.Fatalf("occupied delete: %v", err)
	}
	root := ""
	if _, _, err = store.Update(asset.ID, "", MediaAssetUpdateRequest{FolderID: &root}); err != nil {
		t.Fatal(err)
	}
	if err = store.DeleteLibraryFolder(t.Context(), "", folder.ID); err != nil {
		t.Fatalf("empty delete: %v", err)
	}
}

func TestReparentLibraryFolderMovesWithinScope(t *testing.T) {
	store := newTestMediaAssets(t, filepath.Join(t.TempDir(), "db.sqlite"), t.TempDir())
	parent, err := store.CreateLibraryFolder(t.Context(), "", LibraryFolderRequest{Name: "parent"})
	if err != nil {
		t.Fatal(err)
	}
	child, err := store.CreateLibraryFolder(t.Context(), "", LibraryFolderRequest{Name: "child", ParentID: parent.ID})
	if err != nil {
		t.Fatal(err)
	}
	// child -> root
	updated, err := store.ReparentLibraryFolder(t.Context(), "", child.ID, "")
	if err != nil {
		t.Fatalf("child->root: %v", err)
	}
	if updated.ParentID != "" {
		t.Fatalf("want root, got parentId=%q", updated.ParentID)
	}
	// child -> parent again (round-trip)
	updated, err = store.ReparentLibraryFolder(t.Context(), "", child.ID, parent.ID)
	if err != nil {
		t.Fatalf("child->parent roundtrip: %v", err)
	}
	if updated.ParentID != parent.ID {
		t.Fatalf("want parentId=%q, got %q", parent.ID, updated.ParentID)
	}
}

func TestReparentLibraryFolderRejectsCycles(t *testing.T) {
	store := newTestMediaAssets(t, filepath.Join(t.TempDir(), "db.sqlite"), t.TempDir())
	parent, err := store.CreateLibraryFolder(t.Context(), "", LibraryFolderRequest{Name: "parent"})
	if err != nil {
		t.Fatal(err)
	}
	child, err := store.CreateLibraryFolder(t.Context(), "", LibraryFolderRequest{Name: "child", ParentID: parent.ID})
	if err != nil {
		t.Fatal(err)
	}
	grand, err := store.CreateLibraryFolder(t.Context(), "", LibraryFolderRequest{Name: "grand", ParentID: child.ID})
	if err != nil {
		t.Fatal(err)
	}

	// parent -> child (child is descendant) → cycle
	if _, err := store.ReparentLibraryFolder(t.Context(), "", parent.ID, child.ID); !errors.Is(err, ErrLibraryFolderCycle) {
		t.Fatalf("parent->child cycle expected, got %v", err)
	}
	// parent -> grand (grand is descendant) → cycle
	if _, err := store.ReparentLibraryFolder(t.Context(), "", parent.ID, grand.ID); !errors.Is(err, ErrLibraryFolderCycle) {
		t.Fatalf("parent->grand cycle expected, got %v", err)
	}
	// parent -> self → cycle
	if _, err := store.ReparentLibraryFolder(t.Context(), "", parent.ID, parent.ID); !errors.Is(err, ErrLibraryFolderCycle) {
		t.Fatalf("parent->self cycle expected, got %v", err)
	}
}

func TestReparentLibraryFolderRejectsSiblingNameCollision(t *testing.T) {
	store := newTestMediaAssets(t, filepath.Join(t.TempDir(), "db.sqlite"), t.TempDir())
	parentA, err := store.CreateLibraryFolder(t.Context(), "", LibraryFolderRequest{Name: "A"})
	if err != nil {
		t.Fatal(err)
	}
	parentB, err := store.CreateLibraryFolder(t.Context(), "", LibraryFolderRequest{Name: "B"})
	if err != nil {
		t.Fatal(err)
	}
	inA, err := store.CreateLibraryFolder(t.Context(), "", LibraryFolderRequest{Name: "shared", ParentID: parentA.ID})
	if err != nil {
		t.Fatal(err)
	}
	_, err = store.CreateLibraryFolder(t.Context(), "", LibraryFolderRequest{Name: "shared", ParentID: parentB.ID})
	if err != nil {
		t.Fatalf("pre-existing sibling in B expected ok, got %v", err)
	}
	// move inA -> parentB: "shared" already exists there
	if _, err := store.ReparentLibraryFolder(t.Context(), "", inA.ID, parentB.ID); !errors.Is(err, ErrInvalidMediaAssetUpdate) {
		t.Fatalf("collision expected ErrInvalidMediaAssetUpdate, got %v", err)
	}
}

func TestReparentLibraryFolderCrossScopeIsNotFound(t *testing.T) {
	store := newTestMediaAssets(t, filepath.Join(t.TempDir(), "db.sqlite"), t.TempDir())
	folder, err := store.CreateLibraryFolder(t.Context(), "", LibraryFolderRequest{Name: "资料"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := store.ReparentLibraryFolder(t.Context(), "missing-project", folder.ID, ""); !errors.Is(err, ErrLibraryFolderNotFound) {
		t.Fatalf("cross scope expected not found, got %v", err)
	}
}
