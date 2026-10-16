package document

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"testing"
)

func TestProjectDirectoryPreviewOpenIsReadOnlyUntilConfirmed(t *testing.T) {
	workspaceDir := t.TempDir()
	store := newWorkspaceStateService(t, workspaceDir)
	source := t.TempDir()
	if err := os.Mkdir(filepath.Join(source, "work"), 0o755); err != nil {
		t.Fatal(err)
	}
	manifest := map[string]any{"schemaVersion": 1, "projectId": "existing-project", "name": "Existing", "description": "keep", "createdAt": "2026-10-16T00:00:00Z"}
	manifestBytes, _ := json.Marshal(manifest)
	manifestPath := filepath.Join(source, "project.media.json")
	if err := os.WriteFile(manifestPath, manifestBytes, 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(source, "work", "scene.md"), []byte("---\nversion: 3\n---\n# Scene\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	before, err := os.ReadFile(filepath.Join(source, "work", "scene.md"))
	if err != nil {
		t.Fatal(err)
	}
	preview, err := store.PreviewProjectDirectory(context.Background(), source)
	if err != nil {
		t.Fatalf("preview: %v", err)
	}
	if preview.Registered || preview.Project.DocumentCount != 1 || preview.Fingerprint == "" {
		t.Fatalf("preview = %+v", preview)
	}
	if _, err := store.ListProjects(); err != nil {
		t.Fatal(err)
	}
	if _, err := store.OpenProjectDirectory(context.Background(), source, preview.Fingerprint); err != nil {
		t.Fatalf("open: %v", err)
	}
	projects, err := store.ListProjects()
	if err != nil {
		t.Fatal(err)
	}
	if len(projects.Projects) != 1 || projects.Projects[0].ID != "existing-project" {
		t.Fatalf("projects = %+v", projects.Projects)
	}
	after, _ := os.ReadFile(filepath.Join(source, "work", "scene.md"))
	if string(before) != string(after) {
		t.Fatal("opening changed source document")
	}
	second, err := store.PreviewProjectDirectory(context.Background(), source)
	if err != nil || !second.Registered {
		t.Fatalf("second preview = %+v, err=%v", second, err)
	}
	if _, err := store.OpenProjectDirectory(context.Background(), source, "stale"); !errors.Is(err, ErrProjectDirectoryConflict) {
		t.Fatalf("stale fingerprint error = %v", err)
	}
}

func TestProjectDirectoryPreviewCancellationDoesNotReadOrWrite(t *testing.T) {
	store := newWorkspaceStateService(t, t.TempDir())
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := store.PreviewProjectDirectory(ctx, filepath.Join(t.TempDir(), "missing")); !errors.Is(err, context.Canceled) {
		t.Fatalf("error = %v, want context.Canceled", err)
	}
}

func TestListRegisteredProjectStorageRootsDoesNotRepairProjectLayout(t *testing.T) {
	store := requireDocumentStore(t)
	projectDir := requireTestProject(t, store, "storage-project")
	workDir := filepath.Join(projectDir, "work")
	if err := os.RemoveAll(workDir); err != nil {
		t.Fatal(err)
	}
	roots, err := store.ListRegisteredProjectStorageRoots()
	if err != nil {
		t.Fatal(err)
	}
	if len(roots) != 1 || roots[0].ID != "storage-project" || roots[0].Path != projectDir {
		t.Fatalf("storage roots = %#v", roots)
	}
	if _, err := os.Stat(workDir); !os.IsNotExist(err) {
		t.Fatalf("read-only project root lookup recreated project work directory: %v", err)
	}
}
