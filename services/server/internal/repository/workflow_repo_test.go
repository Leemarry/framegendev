package repository

import (
	"context"
	"encoding/json"
	"errors"
	"path/filepath"
	"testing"

	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	"github.com/mediago-dev/mediago-drama/services/server/internal/testutil"
)

func TestWorkflowRepositoryLifecycle(t *testing.T) {
	db, err := OpenWorkspaceDB(filepath.Join(t.TempDir(), "workspace.db"))
	if db != nil {
		testutil.CloseDB(t, db)
	}
	if err != nil {
		t.Fatalf("OpenWorkspaceDB() error = %v", err)
	}

	project := domain.WorkspaceProjectModel{
		ID:          "proj-1",
		Name:        "Project",
		Category:    "agent",
		Status:      "active",
		RelativeDir: "proj-1",
	}
	if err := db.Create(&project).Error; err != nil {
		t.Fatalf("creating project: %v", err)
	}

	ctx := context.Background()
	repo := NewWorkflowRepository(db)
	exists, err := repo.ProjectExists(ctx, "proj-1")
	if err != nil || !exists {
		t.Fatalf("ProjectExists() = %v, %v, want true, nil", exists, err)
	}
	exists, err = repo.ProjectExists(ctx, "proj-missing")
	if err != nil || exists {
		t.Fatalf("ProjectExists(missing) = %v, %v, want false, nil", exists, err)
	}

	templateRef := "tpl-1"
	created, err := repo.Create(ctx, &domain.Workflow{
		ID:            "wf-1",
		ProjectID:     "proj-1",
		DocumentID:    "doc-1",
		ShotName:      "shot-001",
		Name:          "方案1",
		Description:   "first",
		SchemaVersion: domain.WorkflowSchemaVersion4,
		GraphData:     repositoryGraphWithNode("node-1"),
		TemplateRef:   &templateRef,
	})
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	if created.CreatedAt.IsZero() || created.UpdatedAt.IsZero() {
		t.Fatalf("timestamps = %+v, want populated", created)
	}

	got, err := repo.GetByID(ctx, "wf-1")
	if err != nil {
		t.Fatalf("GetByID() error = %v", err)
	}
	if got.GraphData.NodeCount() != 1 || got.TemplateRef == nil || *got.TemplateRef != "tpl-1" {
		t.Fatalf("GetByID() = %+v, want stored graph and template ref", got)
	}

	listed, err := repo.List(ctx, "proj-1", "shot-001", "doc-1")
	if err != nil || len(listed) != 1 {
		t.Fatalf("List() = %d, %v, want 1, nil", len(listed), err)
	}
	listed, err = repo.List(ctx, "proj-1", "shot-002", "")
	if err != nil || len(listed) != 0 {
		t.Fatalf("List(other shot) = %d, %v, want 0, nil", len(listed), err)
	}

	got.Name = "方案1-重命名"
	got.TemplateRef = nil
	got.GraphData = repositoryGraphWithNode("node-2")
	updated, err := repo.Update(ctx, got)
	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}
	if updated.Name != "方案1-重命名" || updated.TemplateRef != nil || updated.GraphData.NodeCount() != 1 {
		t.Fatalf("Update() = %+v, want persisted metadata and graph", updated)
	}

	if err := repo.Delete(ctx, "wf-1"); err != nil {
		t.Fatalf("Delete() error = %v", err)
	}
	if _, err := repo.GetByID(ctx, "wf-1"); !errors.Is(err, ErrRecordNotFound) {
		t.Fatalf("GetByID(after delete) error = %v, want ErrRecordNotFound", err)
	}
	if err := repo.Delete(ctx, "wf-1"); !errors.Is(err, ErrRecordNotFound) {
		t.Fatalf("Delete(again) error = %v, want ErrRecordNotFound", err)
	}
}

func TestWorkflowRepositoryCascadesWithProject(t *testing.T) {
	db, err := OpenWorkspaceDB(filepath.Join(t.TempDir(), "workspace.db"))
	if db != nil {
		testutil.CloseDB(t, db)
	}
	if err != nil {
		t.Fatalf("OpenWorkspaceDB() error = %v", err)
	}

	project := domain.WorkspaceProjectModel{
		ID:          "proj-1",
		Name:        "Project",
		Category:    "agent",
		Status:      "active",
		RelativeDir: "proj-1",
	}
	if err := db.Create(&project).Error; err != nil {
		t.Fatalf("creating project: %v", err)
	}

	ctx := context.Background()
	repo := NewWorkflowRepository(db)
	if _, err := repo.Create(ctx, &domain.Workflow{
		ID:            "wf-1",
		ProjectID:     "proj-1",
		DocumentID:    "doc-1",
		ShotName:      "shot-001",
		Name:          "方案1",
		SchemaVersion: domain.WorkflowSchemaVersion4,
		GraphData:     domain.EmptyGraphData(),
	}); err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	if err := db.Where("id = ?", "proj-1").Delete(&domain.WorkspaceProjectModel{}).Error; err != nil {
		t.Fatalf("deleting project: %v", err)
	}
	if _, err := repo.GetByID(ctx, "wf-1"); !errors.Is(err, ErrRecordNotFound) {
		t.Fatalf("GetByID(after project delete) error = %v, want cascade delete", err)
	}
}

func TestWorkflowTemplateRepositoryList(t *testing.T) {
	db, err := OpenWorkspaceDB(filepath.Join(t.TempDir(), "workspace.db"))
	if db != nil {
		testutil.CloseDB(t, db)
	}
	if err != nil {
		t.Fatalf("OpenWorkspaceDB() error = %v", err)
	}

	graphJSON, err := json.Marshal(repositoryGraphWithNode("node-1"))
	if err != nil {
		t.Fatalf("marshaling graph: %v", err)
	}
	for _, model := range []domain.WorkflowTemplateModel{
		{ID: "tpl-builtin", Name: "内置", Category: "builtin", GraphDataJSON: string(graphJSON)},
		{ID: "tpl-custom", Name: "自定义", Category: "custom", GraphDataJSON: string(graphJSON)},
	} {
		if err := db.Create(&model).Error; err != nil {
			t.Fatalf("creating template %s: %v", model.ID, err)
		}
	}

	repo := NewWorkflowTemplateRepository(db)
	ctx := context.Background()
	builtin, err := repo.List(ctx, "builtin")
	if err != nil || len(builtin) != 1 || builtin[0].ID != "tpl-builtin" {
		t.Fatalf("List(builtin) = %+v, %v, want only tpl-builtin", builtin, err)
	}
	if builtin[0].GraphData.NodeCount() != 1 {
		t.Fatalf("template graph nodes = %d, want 1", builtin[0].GraphData.NodeCount())
	}

	all, err := repo.List(ctx, "")
	if err != nil || len(all) != 2 {
		t.Fatalf("List() = %d, %v, want 2, nil", len(all), err)
	}

	template, err := repo.GetByID(ctx, "tpl-custom")
	if err != nil || template.Name != "自定义" {
		t.Fatalf("GetByID() = %+v, %v, want tpl-custom", template, err)
	}
	if _, err := repo.GetByID(ctx, "tpl-missing"); !errors.Is(err, ErrRecordNotFound) {
		t.Fatalf("GetByID(missing) error = %v, want ErrRecordNotFound", err)
	}
}

func repositoryGraphWithNode(id string) domain.GraphData {
	graph := domain.EmptyGraphData()
	graph.Nodes = append(graph.Nodes, json.RawMessage(`{"id":"`+id+`"}`))
	return graph
}
