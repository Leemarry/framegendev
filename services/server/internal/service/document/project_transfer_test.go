package document

import (
	"archive/zip"
	"bytes"
	"context"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/mediago-dev/mediago-drama/services/server/internal/repository"
)

func TestProjectPackageRoundTripPreservesSourceAndRejectsConflicts(t *testing.T) {
	sourceStore := newWorkspaceStateService(t, t.TempDir())
	projectDir := requireTestProject(t, sourceStore, "project-transfer")
	body := []byte("---\nversion: 7\n---\n# Kept\n\n![reference](../library/reference.png)\n")
	if err := os.WriteFile(filepath.Join(projectDir, "work", "scene.md"), body, 0o644); err != nil {
		t.Fatal(err)
	}
	reference := []byte{0, 1, 2, 255}
	if err := os.MkdirAll(filepath.Join(projectDir, "library"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(projectDir, "library", "reference.png"), reference, 0o644); err != nil {
		t.Fatal(err)
	}
	archiveDir := t.TempDir()
	archive, err := sourceStore.ExportProjectPackage(context.Background(), "project-transfer", archiveDir)
	if err != nil {
		t.Fatalf("export: %v", err)
	}
	secondArchive, err := sourceStore.ExportProjectPackage(context.Background(), "project-transfer", t.TempDir())
	if err != nil {
		t.Fatalf("second export: %v", err)
	}
	firstPackage, err := os.ReadFile(archive)
	if err != nil {
		t.Fatal(err)
	}
	secondPackage, err := os.ReadFile(secondArchive)
	if err != nil {
		t.Fatal(err)
	}
	if string(firstPackage) != string(secondPackage) {
		t.Fatal("repeated exports are not byte-stable")
	}
	if _, err := sourceStore.ExportProjectPackage(context.Background(), "project-transfer", archiveDir); !errors.Is(err, ErrProjectPackageConflict) {
		t.Fatalf("existing export error = %v, want conflict", err)
	}
	unchangedPackage, _ := os.ReadFile(archive)
	if string(firstPackage) != string(unchangedPackage) {
		t.Fatal("export conflict changed the existing package")
	}
	before, _ := os.ReadFile(filepath.Join(projectDir, "work", "scene.md"))
	destination := t.TempDir()
	targetStore := newWorkspaceStateService(t, t.TempDir())
	preview, err := targetStore.PreviewProjectPackage(context.Background(), archive)
	if err != nil {
		t.Fatalf("preview: %v", err)
	}
	if preview.Project.ID != "project-transfer" || preview.FileCount < 2 || preview.Fingerprint == "" {
		t.Fatalf("preview = %+v", preview)
	}
	imported, err := targetStore.ImportProjectPackage(context.Background(), archive, destination, preview.Fingerprint)
	if err != nil {
		t.Fatalf("import: %v", err)
	}
	after, _ := os.ReadFile(filepath.Join(imported.ProjectDir, "work", "scene.md"))
	if string(after) != string(body) || string(before) != string(after) {
		t.Fatalf("source bytes changed or round trip lost bytes: before=%q after=%q", before, after)
	}
	importedReference, err := os.ReadFile(filepath.Join(imported.ProjectDir, "library", "reference.png"))
	if err != nil || !bytes.Equal(importedReference, reference) {
		t.Fatalf("relative reference target was not preserved: bytes=%v error=%v", importedReference, err)
	}
	if _, err := targetStore.ImportProjectPackage(context.Background(), archive, destination, preview.Fingerprint); !errors.Is(err, ErrProjectPackageConflict) {
		t.Fatalf("repeat import error = %v, want conflict", err)
	}
}

func TestProjectPackageCancellationLeavesNoDestination(t *testing.T) {
	sourceStore := newWorkspaceStateService(t, t.TempDir())
	projectDir := requireTestProject(t, sourceStore, "project-cancel")
	if err := os.WriteFile(filepath.Join(projectDir, "work", "scene.md"), []byte("scene"), 0o644); err != nil {
		t.Fatal(err)
	}
	archive, err := sourceStore.ExportProjectPackage(context.Background(), "project-cancel", t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	targetStore := newWorkspaceStateService(t, t.TempDir())
	destination := t.TempDir()
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := targetStore.PreviewProjectPackage(ctx, archive); !errors.Is(err, context.Canceled) {
		t.Fatalf("preview error = %v, want cancellation", err)
	}
	if _, err := targetStore.ImportProjectPackage(ctx, archive, destination, "unused"); !errors.Is(err, context.Canceled) {
		t.Fatalf("import error = %v, want cancellation", err)
	}
	if _, err := os.Stat(filepath.Join(destination, "project-cancel")); !os.IsNotExist(err) {
		t.Fatalf("canceled import left destination behind: %v", err)
	}
	projects, err := targetStore.ListProjects()
	if err != nil {
		t.Fatal(err)
	}
	if len(projects.Projects) != 0 {
		t.Fatalf("canceled import registered %d projects", len(projects.Projects))
	}
}

func TestProjectPackageRegistrationFailureRemovesImportedDirectory(t *testing.T) {
	sourceStore := newWorkspaceStateService(t, t.TempDir())
	projectDir := requireTestProject(t, sourceStore, "project-register-failure")
	if err := os.WriteFile(filepath.Join(projectDir, "work", "scene.md"), []byte("scene"), 0o644); err != nil {
		t.Fatal(err)
	}
	archive, err := sourceStore.ExportProjectPackage(context.Background(), "project-register-failure", t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	targetWorkspace := t.TempDir()
	targetStore := newWorkspaceStateService(t, targetWorkspace)
	db, err := repository.OpenWorkspaceDB(filepath.Join(targetWorkspace, "workspace.db"))
	if err != nil {
		t.Fatal(err)
	}
	if err := db.Exec("CREATE TRIGGER reject_project_transfer BEFORE INSERT ON projects BEGIN SELECT RAISE(FAIL, 'forced registration failure'); END").Error; err != nil {
		t.Fatal(err)
	}
	destination := t.TempDir()
	preview, err := targetStore.PreviewProjectPackage(context.Background(), archive)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := targetStore.ImportProjectPackage(context.Background(), archive, destination, preview.Fingerprint); err == nil {
		t.Fatal("import succeeded despite forced registration failure")
	}
	if _, err := os.Stat(filepath.Join(destination, "project-register-failure")); !os.IsNotExist(err) {
		t.Fatalf("failed registration left imported directory behind: %v", err)
	}
	projects, err := targetStore.ListProjects()
	if err != nil {
		t.Fatal(err)
	}
	if len(projects.Projects) != 0 {
		t.Fatalf("failed registration left %d registered projects", len(projects.Projects))
	}
}

func TestProjectPackagePreviewRejectsTraversalAndUnknownSchema(t *testing.T) {
	store := newWorkspaceStateService(t, t.TempDir())
	for _, test := range []struct {
		name    string
		entries map[string]string
	}{
		{name: "traversal", entries: map[string]string{"../outside": "x"}},
		{name: "unknown schema", entries: map[string]string{
			"mediago-project.json": `{"schemaVersion":9,"projectId":"project-x","name":"X","createdAt":"2026-10-16T00:00:00Z"}`,
		}},
		{name: "oversized package manifest", entries: map[string]string{
			"mediago-project.json": `{"schemaVersion":1,"projectId":"project-x","name":"X","createdAt":"2026-10-16T00:00:00Z"}` + strings.Repeat(" ", 64<<10),
		}},
		{name: "identity mismatch", entries: map[string]string{
			"mediago-project.json": `{"schemaVersion":1,"projectId":"project-x","name":"X","createdAt":"2026-10-16T00:00:00Z"}`,
			"project.media.json":   `{"schemaVersion":1,"projectId":"another-project","name":"X","createdAt":"2026-10-16T00:00:00Z"}`,
		}},
	} {
		t.Run(test.name, func(t *testing.T) {
			path := filepath.Join(t.TempDir(), "invalid.zip")
			var data bytes.Buffer
			writer := zip.NewWriter(&data)
			for name, body := range test.entries {
				entry, err := writer.Create(name)
				if err != nil {
					t.Fatal(err)
				}
				if _, err := entry.Write([]byte(body)); err != nil {
					t.Fatal(err)
				}
			}
			if err := writer.Close(); err != nil {
				t.Fatal(err)
			}
			if err := os.WriteFile(path, data.Bytes(), 0o644); err != nil {
				t.Fatal(err)
			}
			_, err := store.PreviewProjectPackage(context.Background(), path)
			if !errors.Is(err, ErrInvalidProjectPackage) {
				t.Fatalf("preview error = %v, want invalid package", err)
			}
		})
	}
}
