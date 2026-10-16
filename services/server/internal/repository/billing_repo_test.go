package repository

import (
	"path/filepath"
	"testing"

	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	"github.com/mediago-dev/mediago-drama/services/server/internal/testutil"
	"gorm.io/gorm"
)

func TestBillingRepositoryListUsageBucketsAggregatesTokenColumns(t *testing.T) {
	repos, err := OpenWorkspaceRepositories(filepath.Join(t.TempDir(), "workspace.sqlite"))
	testutil.CloseDB(t, repos.DB)
	if err != nil {
		t.Fatalf("OpenWorkspaceRepositories() error = %v", err)
	}
	ensureBillingProjectFixture(t, repos.DB, "project-a")
	ensureBillingProjectFixture(t, repos.DB, "project-b")

	tasks := []domain.GenerationTaskModel{
		{
			ID:              "task-1",
			ProjectID:       domain.StringPtr("project-a"),
			Kind:            "text",
			RouteID:         "dmx.gpt-4.1-mini-text",
			FamilyID:        "text",
			VersionID:       "gpt-4.1-mini-text",
			Provider:        "dmx",
			ModelID:         "gpt-4.1-mini-text",
			Model:           "gpt-4.1-mini",
			Prompt:          "hello",
			ParamsJSON:      "{}",
			Status:          "completed",
			Message:         "",
			InputTokens:     100,
			OutputTokens:    50,
			TotalTokens:     150,
			ReasoningTokens: 5,
			CachedTokens:    2,
			CreatedAt:       domain.TimeFromString("2026-06-01T00:00:00Z"),
			UpdatedAt:       domain.TimeFromString("2026-06-01T00:00:00Z"),
		},
		{
			ID:           "task-2",
			ProjectID:    domain.StringPtr("project-a"),
			Kind:         "text",
			RouteID:      "dmx.gpt-4.1-mini-text",
			FamilyID:     "text",
			VersionID:    "gpt-4.1-mini-text",
			Provider:     "dmx",
			ModelID:      "gpt-4.1-mini-text",
			Model:        "gpt-4.1-mini",
			Prompt:       "hello again",
			ParamsJSON:   "{}",
			Status:       "completed",
			Message:      "",
			InputTokens:  7,
			OutputTokens: 3,
			CreatedAt:    domain.TimeFromString("2026-06-01T08:00:00Z"),
			UpdatedAt:    domain.TimeFromString("2026-06-01T08:00:00Z"),
		},
		{
			ID:           "task-3",
			ProjectID:    domain.StringPtr("project-a"),
			Kind:         "text",
			RouteID:      "dmx.gpt-4.1-mini-text",
			FamilyID:     "text",
			VersionID:    "gpt-4.1-mini-text",
			Provider:     "dmx",
			ModelID:      "gpt-4.1-mini-text",
			Model:        "gpt-4.1-mini",
			Prompt:       "failed",
			ParamsJSON:   "{}",
			Status:       "failed",
			Message:      "",
			InputTokens:  1000,
			OutputTokens: 1000,
			TotalTokens:  2000,
			CreatedAt:    domain.TimeFromString("2026-06-01T09:00:00Z"),
			UpdatedAt:    domain.TimeFromString("2026-06-01T09:00:00Z"),
		},
		{
			ID:         "task-4",
			ProjectID:  domain.StringPtr("project-a"),
			Kind:       "text",
			RouteID:    "dmx.gpt-4.1-mini-text",
			FamilyID:   "text",
			VersionID:  "gpt-4.1-mini-text",
			Provider:   "dmx",
			ModelID:    "gpt-4.1-mini-text",
			Model:      "gpt-4.1-mini",
			Prompt:     "no usage",
			ParamsJSON: "{}",
			Status:     "completed",
			Message:    "",
			CreatedAt:  domain.TimeFromString("2026-06-01T09:30:00Z"),
			UpdatedAt:  domain.TimeFromString("2026-06-01T09:30:00Z"),
		},
		{
			ID:           "task-5",
			ProjectID:    domain.StringPtr("project-b"),
			Kind:         "text",
			RouteID:      "dmx.gpt-4.1-mini-text",
			FamilyID:     "text",
			VersionID:    "gpt-4.1-mini-text",
			Provider:     "dmx",
			ModelID:      "gpt-4.1-mini-text",
			Model:        "gpt-4.1-mini",
			Prompt:       "other project",
			ParamsJSON:   "{}",
			Status:       "completed",
			Message:      "",
			InputTokens:  1000,
			OutputTokens: 1000,
			TotalTokens:  2000,
			CreatedAt:    domain.TimeFromString("2026-06-01T10:00:00Z"),
			UpdatedAt:    domain.TimeFromString("2026-06-01T10:00:00Z"),
		},
	}
	for _, task := range tasks {
		if err := repos.DB.Create(&task).Error; err != nil {
			t.Fatalf("creating task %q: %v", task.ID, err)
		}
	}

	rows, err := repos.Billing.ListUsageBuckets(UsageQuery{
		Start:     "2026-06-01T00:00:00Z",
		End:       "2026-06-02T00:00:00Z",
		Kind:      "text",
		ProjectID: "project-a",
	})
	if err != nil {
		t.Fatalf("ListUsageTasks() error = %v", err)
	}
	if len(rows) != 1 {
		t.Fatalf("rows = %d, want 1", len(rows))
	}
	if rows[0].RouteID != "dmx.gpt-4.1-mini-text" ||
		rows[0].Bucket != "2026-06-01" ||
		rows[0].Calls != 3 ||
		rows[0].InputTokens != 107 ||
		rows[0].OutputTokens != 53 ||
		rows[0].TotalTokens != 160 ||
		rows[0].ReasoningTokens != 5 ||
		rows[0].CachedTokens != 2 {
		t.Fatalf("row = %#v", rows[0])
	}
}

func TestBillingRepositoryExcludesLocalImportsWithoutDiscardingZeroTokenCalls(t *testing.T) {
	repos, err := OpenWorkspaceRepositories(filepath.Join(t.TempDir(), "workspace.sqlite"))
	if err != nil {
		t.Fatalf("opening repositories: %v", err)
	}
	testutil.CloseDB(t, repos.DB)
	ensureBillingProjectFixture(t, repos.DB, "project-a")
	ensureBillingProjectFixture(t, repos.DB, "project-b")
	for _, task := range []domain.GenerationTaskModel{
		{ID: "local-import", ProjectID: domain.StringPtr("project-a"), Kind: "image", Provider: "media-library", RouteID: "media-library", Status: "completed"},
		{ID: "zero-token-provider", ProjectID: domain.StringPtr("project-a"), Kind: "image", Provider: "dmx", RouteID: "image-provider", Status: "completed"},
		{ID: "other-project", ProjectID: domain.StringPtr("project-b"), Kind: "text", Provider: "dmx", RouteID: "text-provider", Status: "completed", TotalTokens: 100},
	} {
		task.CreatedAt = domain.TimeFromString("2026-06-01T10:00:00Z")
		task.UpdatedAt = task.CreatedAt
		if err := repos.DB.Create(&task).Error; err != nil {
			t.Fatalf("creating %s: %v", task.ID, err)
		}
	}
	for _, tc := range []struct {
		name   string
		query  UsageQuery
		calls  int64
		tokens int64
	}{
		{name: "global", calls: 2, tokens: 100},
		{name: "project", query: UsageQuery{ProjectID: "project-a"}, calls: 1},
		{name: "other project", query: UsageQuery{ProjectID: "project-b"}, calls: 1, tokens: 100},
		{name: "zero-token image", query: UsageQuery{Kind: "image"}, calls: 1},
		{name: "other kind", query: UsageQuery{Kind: "video"}},
		{name: "dated", query: UsageQuery{Start: "2026-06-01T00:00:00Z", End: "2026-06-02T00:00:00Z"}, calls: 2, tokens: 100},
		{name: "outside range", query: UsageQuery{Start: "2026-06-02T00:00:00Z"}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			rows, err := repos.Billing.ListUsageBuckets(tc.query)
			if err != nil {
				t.Fatalf("listing usage: %v", err)
			}
			var calls, tokens int64
			for _, row := range rows {
				if row.Provider == "media-library" {
					t.Error("local import appeared in provider usage")
				}
				calls += row.Calls
				tokens += row.TotalTokens
			}
			if calls != tc.calls || tokens != tc.tokens {
				t.Fatalf("calls/tokens = %d/%d, want %d/%d", calls, tokens, tc.calls, tc.tokens)
			}
		})
	}
	var count int64
	if err := repos.DB.Model(&domain.GenerationTaskModel{}).Count(&count).Error; err != nil || count != 3 {
		t.Fatalf("retained task count = %d, err = %v", count, err)
	}
}

func ensureBillingProjectFixture(t *testing.T, db *gorm.DB, id string) {
	t.Helper()
	now := domain.TimeFromString("2026-06-01T00:00:00Z")
	if err := db.Create(&domain.WorkspaceProjectModel{
		ID:          id,
		Name:        id,
		Category:    "drama",
		Status:      "active",
		RelativeDir: id,
		CreatedAt:   now,
		UpdatedAt:   now,
	}).Error; err != nil {
		t.Fatalf("creating project fixture %q: %v", id, err)
	}
}
