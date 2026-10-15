package document

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/mediago-dev/mediago-drama/services/server/internal/service/documenthistory"
)

func TestWorkspaceStateServiceRecordsDocumentHistory(t *testing.T) {
	store := requireDocumentStore(t)
	projectID := "project-document-history"
	projectDir := requireTestProject(t, store, projectID)

	document, _, err := store.createDocument(projectID, createWorkspaceDocumentRequest{
		Title:    "Props",
		Content:  "# Props\n\nfirst",
		Category: "prop",
	})
	if err != nil {
		t.Fatalf("creating document: %v", err)
	}

	nextContent := "# Props\n\nsecond"
	if _, _, err := store.updateDocument(projectID, document.ID, updateWorkspaceDocumentRequest{
		Content: &nextContent,
	}); err != nil {
		t.Fatalf("updating document: %v", err)
	}

	if _, err := store.deleteDocument(projectID, document.ID); err != nil {
		t.Fatalf("deleting document: %v", err)
	}

	history := documenthistory.NewService()
	items, err := history.ListDocumentHistory(projectDir, filepath.Join(projectDir, "work"), document.ID, 10)
	if err != nil {
		t.Fatalf("listing document history: %v", err)
	}
	if len(items) != 3 {
		t.Fatalf("document history length = %d, want 3: %#v", len(items), items)
	}
	if _, err := os.Stat(filepath.Join(projectDir, "work", ".git")); !os.IsNotExist(err) {
		t.Fatalf("work .git stat error = %v, want not exist", err)
	}
	if _, err := os.Stat(documenthistory.HistoryRepositoryDir(projectDir)); err != nil {
		t.Fatalf("history repository should exist: %v", err)
	}
}

func TestHistoryRestoreChecksReviewedVersionAndRetainsHistory(t *testing.T) {
	store := requireDocumentStore(t)
	projectID := "history-restore-conflict"
	requireTestProject(t, store, projectID)
	document, _, err := store.createDocument(projectID, createWorkspaceDocumentRequest{Title: "Original", Content: "old body", Category: "prop"})
	if err != nil {
		t.Fatal(err)
	}
	history, err := store.ListDocumentHistory(projectID, document.ID, 50)
	if err != nil || len(history.Items) != 1 {
		t.Fatalf("initial history: %#v, %v", history, err)
	}
	oldHash := history.Items[0].Hash
	content := "remote body"
	tags := []string{"new-tag"}
	remote, _, err := store.updateDocument(projectID, document.ID, updateWorkspaceDocumentRequest{Content: &content, Tags: &tags})
	if err != nil {
		t.Fatal(err)
	}
	for _, test := range []struct {
		name     string
		expected int
		conflict bool
	}{
		{name: "stale review rejected", expected: document.Version, conflict: true},
		{name: "current review restores", expected: remote.Version},
	} {
		t.Run(test.name, func(t *testing.T) {
			result, restoreErr := store.RestoreDocumentHistoryVersion(projectID, document.ID, oldHash, &test.expected)
			if test.conflict {
				if !IsWorkspaceVersionConflict(restoreErr) {
					t.Fatalf("expected conflict, got %v", restoreErr)
				}
				current, ok, readErr := store.GetWorkspaceDocument(projectID, document.ID)
				if readErr != nil || !ok || current.Content != content || current.Version != remote.Version {
					t.Fatalf("stale restore changed current: %#v, %v", current, readErr)
				}
			} else if restoreErr != nil || result.Document.Content != "old body" || result.Document.Version != remote.Version+1 || len(result.Document.Tags) != 0 {
				t.Fatalf("restore result: %#v, %v", result.Document, restoreErr)
			}
			versions, readErr := store.ListDocumentHistory(projectID, document.ID, 50)
			want := 3
			if test.conflict {
				want = 2
			}
			if readErr != nil || len(versions.Items) != want {
				t.Fatalf("history after restore: %#v, %v", versions, readErr)
			}
			old, readErr := store.GetDocumentHistoryVersion(projectID, document.ID, oldHash)
			if readErr != nil || old.Version.Content != "old body" {
				t.Fatalf("old history lost: %#v, %v", old, readErr)
			}
		})
	}
}
