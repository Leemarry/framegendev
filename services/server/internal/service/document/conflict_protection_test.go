package document

import "testing"

func TestWorkspaceSaveRejectsConcurrentChangesBeforeWriting(t *testing.T) {
	store := newWorkspaceStateService(t, t.TempDir())
	projectID := "conflict-protection"
	requireTestProject(t, store, projectID)
	document, _, err := store.createDocument(projectID, createWorkspaceDocumentRequest{ID: "doc-a", Title: "A", Content: "original"})
	if err != nil {
		t.Fatal(err)
	}
	before, err := store.load(projectID)
	if err != nil {
		t.Fatal(err)
	}
	expected := make(map[string]int, len(before.Documents))
	for _, item := range before.Documents {
		expected[item.ID] = item.Version
	}
	remote := "server change"
	saved, _, err := store.updateDocument(projectID, document.ID, updateWorkspaceDocumentRequest{Content: &remote, ExpectedVersion: &document.Version})
	if err != nil {
		t.Fatal(err)
	}
	for index := range before.Documents {
		if before.Documents[index].ID == document.ID {
			before.Documents[index].Content = "local operation"
		}
	}
	_, err = store.SaveWorkspaceState(projectID, workspaceStateRequest{Documents: before.Documents, ExpectedVersions: expected})
	if !IsWorkspaceVersionConflict(err) {
		t.Fatalf("stale workspace save: %v", err)
	}
	state, err := store.load(projectID)
	if err != nil {
		t.Fatal(err)
	}
	actual := findTestWorkspaceDocument(state.Documents, document.ID)
	if actual.Content != remote || actual.Version != saved.Version {
		t.Fatalf("conflict changed document: %#v", actual)
	}
	// An unseen new document must not be removed by an old complete snapshot.
	currentVersions := make(map[string]int, len(state.Documents))
	for _, item := range state.Documents {
		currentVersions[item.ID] = item.Version
	}
	_, _, err = store.createDocument(projectID, createWorkspaceDocumentRequest{ID: "doc-b", Title: "B", Content: "new"})
	if err != nil {
		t.Fatal(err)
	}
	_, err = store.SaveWorkspaceState(projectID, workspaceStateRequest{Documents: state.Documents, ExpectedVersions: currentVersions})
	if !IsWorkspaceVersionConflict(err) {
		t.Fatalf("unseen document: %v", err)
	}
	// Current complete version map can still save using the existing endpoint.
	latest, err := store.load(projectID)
	if err != nil {
		t.Fatal(err)
	}
	versions := map[string]int{}
	for _, item := range latest.Documents {
		versions[item.ID] = item.Version
	}
	result, err := store.SaveWorkspaceState(projectID, workspaceStateRequest{Documents: latest.Documents, ExpectedVersions: versions})
	if err != nil {
		t.Fatal(err)
	}
	if len(result.Documents) != len(latest.Documents) {
		t.Fatal("lost documents")
	}
}
