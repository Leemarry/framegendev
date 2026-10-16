package generation

import (
	"errors"
	"path/filepath"
	"reflect"
	"testing"
)

func TestHistoryProjectAndSessionIntersection(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "workspace.db")
	for _, id := range []string{"project-a", "project-b"} {
		seedGenerationTaskProject(t, dbPath, id)
	}
	repo, err := newTestGenerationTaskRepository(t, dbPath)
	if err != nil {
		t.Fatal(err)
	}
	store := NewGenerationTaskServiceFromRepository(repo, nil, nil)
	workflow := NewGenerationService(nil, store, nil)
	for _, id := range []string{"own", "sibling"} {
		if err := store.UpsertConversation(GenerationConversationRecord{ID: id, ScopeID: "project-a", Kind: "video", Title: id}); err != nil {
			t.Fatal(err)
		}
	}
	for _, task := range []GenerationTaskRecord{
		{ID: "own-old", ConversationID: "own", ProjectID: "project-a", Kind: "video"},
		{ID: "own-new", ConversationID: "own", ProjectID: "project-a", Kind: "video"},
		{ID: "sibling", ConversationID: "sibling", ProjectID: "project-a", Kind: "video"},
		{ID: "foreign", ConversationID: "own", ProjectID: "project-b", Kind: "video"},
		{ID: "legacy", ConversationID: DefaultGenerationConversationID("legacy-scope", "image"), ProjectID: "project-a", Kind: "image"},
	} {
		task.Status = "completed"
		task.Prompt = "Retained local fixture"
		if err := store.Upsert(task); err != nil {
			t.Fatal(err)
		}
	}
	before, err := store.List()
	if err != nil {
		t.Fatal(err)
	}
	conversations, err := store.ListConversations("project-a", "video")
	if err != nil {
		t.Fatal(err)
	}
	for _, test := range []struct {
		name  string
		query GenerationTaskListQuery
		want  []string
	}{
		{"named optional kind", GenerationTaskListQuery{ProjectID: "project-a", ConversationID: "own"}, []string{"own-new", "own-old"}},
		{"explicit kind", GenerationTaskListQuery{ProjectID: "project-a", ConversationID: "own", Kind: "video"}, []string{"own-new", "own-old"}},
		{"filter before limit", GenerationTaskListQuery{ProjectID: "project-a", ConversationID: "own", Limit: 1}, []string{"own-new"}},
		{"filter before offset", GenerationTaskListQuery{ProjectID: "project-a", ConversationID: "own", Limit: 1, Offset: 1}, []string{"own-old"}},
		{"unknown session", GenerationTaskListQuery{ProjectID: "project-a", ConversationID: "missing"}, []string{}},
		{"legacy scope", GenerationTaskListQuery{ProjectID: "project-a", ConversationID: "legacy-scope", Kind: "image"}, []string{"legacy"}},
		{"other project", GenerationTaskListQuery{ProjectID: "project-b", ConversationID: "sibling"}, []string{}},
		{"project cleaned empty", GenerationTaskListQuery{ProjectID: "..", ConversationID: "own"}, []string{}},
		{"project aggregation", GenerationTaskListQuery{ProjectID: "project-a", Kind: "video"}, []string{"sibling", "own-new", "own-old"}},
	} {
		t.Run(test.name, func(t *testing.T) {
			response, err := workflow.ListGenerationTasks(test.query)
			if err != nil {
				t.Fatal(err)
			}
			if got := generationTaskIDs(response.Tasks); !reflect.DeepEqual(got, test.want) {
				t.Fatalf("history = %v, want %v", got, test.want)
			}
		})
	}
	if _, err := workflow.ListGenerationTasks(GenerationTaskListQuery{ProjectID: "project-a", ConversationID: "own", Kind: "image"}); !errors.Is(err, ErrInvalidGenerationTaskQuery) {
		t.Fatalf("mismatched named kind = %v", err)
	}
	after, err := store.List()
	if err != nil || !reflect.DeepEqual(before, after) {
		t.Fatalf("history reads changed complete tasks: %v", err)
	}
	afterConversations, err := store.ListConversations("project-a", "video")
	if err != nil || !reflect.DeepEqual(conversations, afterConversations) {
		t.Fatalf("history reads changed conversations: %v", err)
	}
}
