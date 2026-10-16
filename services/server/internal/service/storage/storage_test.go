package storage

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/mediago-dev/mediago-drama/services/server/internal/service/shared"
)

func TestScanClassifiesKnownRootsWithoutFollowingLinksOrDoubleCounting(t *testing.T) {
	root := t.TempDir()
	project := filepath.Join(root, "projects", "one")
	child := filepath.Join(project, "nested")
	libraryProject := filepath.Join(root, "library", "registered-project")
	writeStorageFile(t, filepath.Join(project, "source.md"), "1234")
	writeStorageFile(t, filepath.Join(child, "also-counted-once.txt"), "12")
	writeStorageFile(t, filepath.Join(libraryProject, "registered.txt"), "12")
	writeStorageFile(t, filepath.Join(root, "library", "video.mp4"), "12345")
	writeStorageFile(t, filepath.Join(shared.WorkspacePathsFor(root).GlobalMetadataDir(), "db", "app.db"), "123")
	writeStorageFile(t, filepath.Join(shared.WorkspacePathsFor(root).MediaPosterCacheDir(), "global.poster.jpg"), "12")
	writeStorageFile(t, filepath.Join(shared.ProjectMediaPosterCacheDir(project), "project.poster.jpg"), "123")
	if err := os.Symlink(filepath.Join(root, "library"), filepath.Join(project, "linked-library")); err != nil {
		t.Logf("symlink unavailable; link traversal case skipped: %v", err)
	}

	snapshot := New(root).Scan([]ProjectRoot{{ID: "outer", Path: project}, {ID: "nested", Path: child}, {ID: "library-child", Path: libraryProject}, {ID: "missing-dir"}})
	got := map[string]CategoryUsage{}
	for _, category := range snapshot.Categories {
		got[category.ID] = category
	}
	if got["projects"].Bytes != int64(len("1234")+len("12")+len("12")) || got["projects"].FileCount != 3 {
		t.Fatalf("project category = %#v, want 8 bytes in 3 files", got["projects"])
	}
	if got["media-library"].Bytes != 5 || got["media-library"].FileCount != 1 {
		t.Fatalf("library category = %#v, want 5 bytes in 1 file", got["media-library"])
	}
	if got["application-metadata"].Bytes != 3 || got["application-metadata"].FileCount != 1 {
		t.Fatalf("metadata category = %#v, want 3 bytes in 1 file", got["application-metadata"])
	}
	if got["poster-cache"].Bytes != 5 || got["poster-cache"].FileCount != 2 {
		t.Fatalf("poster category = %#v, want 5 bytes in 2 files", got["poster-cache"])
	}
	if snapshot.Bytes != 21 || snapshot.FileCount != 7 || snapshot.MeasuredAt.IsZero() {
		t.Fatalf("snapshot totals = %#v, want 21 bytes, 7 files and measurement time", snapshot)
	}
	if snapshot.Unknown != 1 || snapshot.Skipped == 0 {
		t.Fatalf("unknown/skipped = %d/%d, want missing project and symlink visible", snapshot.Unknown, snapshot.Skipped)
	}
}

func TestPreviewAndCleanupOnlyRemoveUnchangedInactivePosterCandidates(t *testing.T) {
	root := t.TempDir()
	project := filepath.Join(root, "project")
	poster := filepath.Join(shared.ProjectMediaPosterCacheDir(project), "one.poster.jpg")
	source := filepath.Join(project, "library", "source.mp4")
	writeStorageFile(t, poster, "poster")
	writeStorageFile(t, source, "source")
	service := New(root)
	projects := []ProjectRoot{{ID: "p1", Path: project}}
	release := shared.AcquireMediaPosterUse(poster)
	preview, err := service.Preview(projects)
	if err != nil {
		t.Fatal(err)
	}
	if len(preview.Candidates) != 1 || preview.Bytes != int64(len("poster")) || !preview.Candidates[0].Active {
		t.Fatalf("preview = %#v, want one active poster", preview)
	}
	if _, err := os.Stat(source); err != nil {
		t.Fatalf("preview changed source file: %v", err)
	}

	active := service.Cleanup([]string{preview.Candidates[0].ID})
	release()
	if active.Skipped != 1 || active.Removed != 0 {
		t.Fatalf("active cleanup = %#v, want skipped", active)
	}
	if _, err := os.Stat(poster); err != nil {
		t.Fatalf("active poster was removed: %v", err)
	}

	preview, err = service.Preview(projects)
	if err != nil {
		t.Fatal(err)
	}
	result := service.Cleanup([]string{preview.Candidates[0].ID})
	if result.Removed != 1 || result.Bytes != int64(len("poster")) {
		t.Fatalf("cleanup = %#v, want one removed file", result)
	}
	if _, err := os.Stat(poster); !os.IsNotExist(err) {
		t.Fatalf("poster remains after cleanup: %v", err)
	}
	if _, err := os.Stat(source); err != nil {
		t.Fatalf("cleanup changed source file: %v", err)
	}
}

func TestCleanupSkipsStaleOrChangedCandidates(t *testing.T) {
	root := t.TempDir()
	poster := filepath.Join(shared.WorkspacePathsFor(root).MediaPosterCacheDir(), "one.poster.jpg")
	writeStorageFile(t, poster, "old")
	service := New(root)
	preview, err := service.Preview(nil)
	if err != nil {
		t.Fatal(err)
	}
	if len(preview.Candidates) != 1 {
		t.Fatalf("preview candidates = %d, want 1", len(preview.Candidates))
	}
	if err := os.WriteFile(poster, []byte("changed size"), 0o600); err != nil {
		t.Fatal(err)
	}
	result := service.Cleanup([]string{preview.Candidates[0].ID})
	if result.Skipped != 1 || result.Removed != 0 {
		t.Fatalf("changed candidate cleanup = %#v, want skipped", result)
	}
	if _, err := os.Stat(poster); err != nil {
		t.Fatalf("changed candidate was removed: %v", err)
	}

	oldID := preview.Candidates[0].ID
	if _, err := service.Preview(nil); err != nil {
		t.Fatal(err)
	}
	stale := service.Cleanup([]string{oldID})
	if stale.Skipped != 1 || stale.Outcomes[0].Status != "skipped" {
		t.Fatalf("old preview ID cleanup = %#v, want skipped", stale)
	}
	if err := os.Chtimes(poster, time.Now().Add(-time.Hour), time.Now().Add(-time.Hour)); err != nil {
		t.Fatal(err)
	}
}

func writeStorageFile(t *testing.T, path string, contents string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(contents), 0o600); err != nil {
		t.Fatal(err)
	}
}
