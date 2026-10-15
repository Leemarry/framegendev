package media

import (
	"errors"
	"path/filepath"
	"strings"
	"testing"

	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	"github.com/mediago-dev/mediago-drama/services/server/internal/repository"
	"github.com/mediago-dev/mediago-drama/services/server/internal/service/shared"
	"github.com/mediago-dev/mediago-drama/services/server/internal/testutil"
	"gorm.io/gorm"
)

// stubDocumentAssetReferences is a test double for the document reader wired
// into the media service.
type stubDocumentAssetReferences struct {
	byProject map[string][]shared.DocumentMediaAssetReference
	err       error
}

func (stub stubDocumentAssetReferences) ListDocumentMediaAssetReferences(projectID string) ([]shared.DocumentMediaAssetReference, error) {
	return stub.byProject[projectID], stub.err
}

func newReferenceTestStore(t *testing.T) (*MediaAssets, *gorm.DB) {
	t.Helper()
	db, err := repository.OpenWorkspaceDB(filepath.Join(t.TempDir(), "workspace.db"))
	if err != nil {
		t.Fatalf("OpenWorkspaceDB() error = %v", err)
	}
	testutil.CloseDB(t, db)
	store := NewMediaAssetsFromRepository(
		repository.NewMediaAssetRepositoryFromDB(db),
		t.TempDir(),
		"",
		repository.NewWorkspaceRepository(db),
		nil,
	)
	if store.initErr != nil {
		t.Fatalf("NewMediaAssetsFromRepository() error = %v", store.initErr)
	}
	return store, db
}

func TestListAssetReferencesReportsProjectUsages(t *testing.T) {
	store, db := newReferenceTestStore(t)
	now := domain.TimeFromString("2026-05-22T00:00:00Z")
	for _, project := range []struct {
		id   string
		name string
	}{{"project-a", "项目甲"}, {"project-b", "项目乙"}} {
		if err := db.Create(&domain.WorkspaceProjectModel{
			ID:          project.id,
			Name:        project.name,
			RelativeDir: project.id,
			CreatedAt:   now,
			UpdatedAt:   now,
		}).Error; err != nil {
			t.Fatalf("creating project %q: %v", project.id, err)
		}
	}

	asset, err := store.SaveReader(t.Context(), strings.NewReader("shared bytes"), "shared.txt", "text/plain", "")
	if err != nil {
		t.Fatalf("SaveReader() error = %v", err)
	}

	rows := []domain.ProjectSelectedAssetModel{
		{
			ID:            "selected-a",
			ProjectID:     "project-a",
			ResourceType:  "character",
			AssetID:       asset.ID,
			ResourceTitle: domain.StringPtr("主角"),
			SortOrder:     1,
			CreatedAt:     now,
			UpdatedAt:     now,
		},
		{
			ID:            "selected-b",
			ProjectID:     "project-b",
			ResourceType:  "scene",
			AssetID:       asset.ID,
			ResourceTitle: domain.StringPtr("场景"),
			SortOrder:     3,
			CreatedAt:     now,
			UpdatedAt:     now,
		},
		{
			ID:           "selected-deleted",
			ProjectID:    "project-b",
			ResourceType: "scene",
			AssetID:      asset.ID,
			DeletedAt:    gorm.DeletedAt{Time: now, Valid: true},
			CreatedAt:    now,
			UpdatedAt:    now,
		},
	}
	for _, row := range rows {
		if err := db.Omit("Asset", "Project", "SourceTask").Create(&row).Error; err != nil {
			t.Fatalf("creating selected asset fixture %q: %v", row.ID, err)
		}
	}

	response, found, err := store.ListAssetReferences(asset.ID)
	if err != nil {
		t.Fatalf("ListAssetReferences() error = %v", err)
	}
	if !found {
		t.Fatal("ListAssetReferences() found = false, want true for an existing asset")
	}
	if len(response.References) != 2 {
		t.Fatalf("references = %#v, want two live project selections", response.References)
	}

	first := response.References[0]
	if first.ProjectID != "project-a" || first.ProjectName != "项目甲" ||
		first.ResourceTitle != "主角" || first.ResourceType != "character" || first.SortOrder != 1 ||
		first.Source != MediaAssetReferenceSourceSelection {
		t.Fatalf("first reference = %#v, want project-a selection with resolved name", first)
	}
	second := response.References[1]
	if second.ProjectID != "project-b" || second.ProjectName != "项目乙" ||
		second.ResourceTitle != "场景" || second.ResourceType != "scene" || second.SortOrder != 3 ||
		second.Source != MediaAssetReferenceSourceSelection {
		t.Fatalf("second reference = %#v, want project-b selection with resolved name", second)
	}

	unreferenced, err := store.SaveReader(t.Context(), strings.NewReader("lonely bytes"), "lonely.txt", "text/plain", "")
	if err != nil {
		t.Fatalf("SaveReader(unreferenced) error = %v", err)
	}
	emptyResponse, found, err := store.ListAssetReferences(unreferenced.ID)
	if err != nil || !found {
		t.Fatalf("ListAssetReferences(unreferenced) found=%v err=%v, want found with empty list", found, err)
	}
	if len(emptyResponse.References) != 0 {
		t.Fatalf("unreferenced references = %#v, want empty", emptyResponse.References)
	}
}

func TestListAssetReferencesReportsMissingAsset(t *testing.T) {
	store, _ := newReferenceTestStore(t)
	response, found, err := store.ListAssetReferences("asset-missing")
	if err != nil {
		t.Fatalf("ListAssetReferences() error = %v", err)
	}
	if found {
		t.Fatal("ListAssetReferences() found = true, want false for an unknown asset")
	}
	if len(response.References) != 0 {
		t.Fatalf("references = %#v, want empty for an unknown asset", response.References)
	}
}

func TestListAssetReferencesIncludesDocumentBodyUsages(t *testing.T) {
	store, db := newReferenceTestStore(t)
	now := domain.TimeFromString("2026-05-22T00:00:00Z")
	for _, project := range []struct {
		id   string
		name string
	}{{"project-a", "项目甲"}, {"project-b", "项目乙"}} {
		if err := db.Create(&domain.WorkspaceProjectModel{
			ID:          project.id,
			Name:        project.name,
			RelativeDir: project.id,
			CreatedAt:   now,
			UpdatedAt:   now,
		}).Error; err != nil {
			t.Fatalf("creating project %q: %v", project.id, err)
		}
	}

	asset, err := store.SaveReader(t.Context(), strings.NewReader("shared bytes"), "shared.txt", "text/plain", "")
	if err != nil {
		t.Fatalf("SaveReader() error = %v", err)
	}
	if err := db.Omit("Asset", "Project", "SourceTask").Create(&domain.ProjectSelectedAssetModel{
		ID:            "selected-a",
		ProjectID:     "project-a",
		ResourceType:  "character",
		AssetID:       asset.ID,
		ResourceTitle: domain.StringPtr("主角"),
		SortOrder:     1,
		CreatedAt:     now,
		UpdatedAt:     now,
	}).Error; err != nil {
		t.Fatalf("creating selected asset fixture: %v", err)
	}

	store.SetDocumentAssetReferenceSource(stubDocumentAssetReferences{byProject: map[string][]shared.DocumentMediaAssetReference{
		"project-b": {
			{DocumentID: "characters", DocumentTitle: "角色设定", DocumentCategory: "character", AssetID: asset.ID},
			{DocumentID: "scenes", DocumentTitle: "场景设定", DocumentCategory: "scene", AssetID: "asset-other"},
		},
	}})

	response, found, err := store.ListAssetReferences(asset.ID)
	if err != nil {
		t.Fatalf("ListAssetReferences() error = %v", err)
	}
	if !found {
		t.Fatal("ListAssetReferences() found = false, want true")
	}
	if len(response.References) != 2 {
		t.Fatalf("references = %#v, want one selection and one document usage", response.References)
	}

	selection := response.References[0]
	if selection.ProjectID != "project-a" || selection.Source != MediaAssetReferenceSourceSelection {
		t.Fatalf("selection reference = %#v, want project-a selection", selection)
	}
	document := response.References[1]
	if document.ProjectID != "project-b" || document.ProjectName != "项目乙" ||
		document.ResourceTitle != "角色设定" || document.ResourceType != "character" ||
		document.Source != MediaAssetReferenceSourceDocument || document.DocumentID != "characters" {
		t.Fatalf("document reference = %#v, want project-b document usage", document)
	}
	for _, status := range []string{repository.ProjectStatusArchived, repository.ProjectStatusTrashed} {
		if err := db.Model(&domain.WorkspaceProjectModel{}).Where("id = ?", "project-b").Update("status", status).Error; err != nil {
			t.Fatal(err)
		}
		response, found, err := store.ListAssetReferences(asset.ID)
		if err != nil || !found || len(response.References) != 2 {
			t.Fatalf("%s project reference lost: %#v %v", status, response, err)
		}
	}
	readErr := errors.New("document read failed")
	store.SetDocumentAssetReferenceSource(stubDocumentAssetReferences{err: readErr})
	if _, _, err := store.ListAssetReferences(asset.ID); !errors.Is(err, readErr) {
		t.Fatalf("document failure hidden: %v", err)
	}
}
