package media

import (
	"context"
	"errors"
	"reflect"
	"strings"
	"testing"

	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	"github.com/mediago-dev/mediago-drama/services/server/internal/service/shared"
	"gorm.io/gorm"
)

func TestListWithUsagePreservesRecordsAndScope(t *testing.T) {
	store, db := newReferenceTestStore(t)
	store.workspaceRoot = t.TempDir()
	for _, id := range []string{"a", "b"} {
		requireMediaTestProject(t, store.workspaceRepo, id)
	}
	assets := map[string]MediaAsset{}
	for _, id := range []string{"selected", "candidate", "reference", "input-url", "input-id", "document", "deleted", "unused", "foreign"} {
		options := MediaAssetSaveOptions{Filename: id + ".txt"}
		if id == "foreign" {
			options.ProjectID = "b"
		}
		asset, err := store.SaveTextWithOptions(id, options.Filename, "", options)
		if err != nil {
			t.Fatal(err)
		}
		assets[id] = asset
	}
	for _, project := range []string{"a", "b"} {
		if err := db.Omit("Conversation", "Project", "References", "Assets", "DeletedSlots").Create(&domain.GenerationTaskModel{ID: project, ProjectID: domain.StringPtr(project), Kind: "text"}).Error; err != nil {
			t.Fatal(err)
		}
	}
	outputs := []domain.GenerationTaskAssetModel{
		{TaskID: "a", SlotIndex: 0, AssetID: assets["candidate"].ID},
		{TaskID: "a", SlotIndex: 1, AssetID: assets["selected"].ID, Selected: true},
		{TaskID: "a", SlotIndex: 2, AssetID: assets["deleted"].ID, Selected: true},
		{TaskID: "a", SlotIndex: 3, AssetID: assets["deleted"].ID},
		{TaskID: "b", SlotIndex: 0, AssetID: assets["selected"].ID},
	}
	if err := db.Omit("Task", "Asset").Create(&outputs).Error; err != nil {
		t.Fatal(err)
	}
	tombstones := []domain.GenerationTaskDeletedSlotModel{{TaskID: "a", SlotIndex: 2}, {TaskID: "a", SlotIndex: 3}}
	if err := db.Omit("Task").Create(&tombstones).Error; err != nil {
		t.Fatal(err)
	}
	inputs := []domain.GenerationTaskReferenceModel{
		{TaskID: "a", RefIndex: 0, URL: domain.StringPtr("http://127.0.0.1:31450" + assets["input-url"].URL)},
		{TaskID: "a", RefIndex: 1, AssetID: domain.StringPtr(assets["input-id"].ID)},
	}
	if err := db.Omit("Conversation", "Project", "References", "Assets", "DeletedSlots").Create(&domain.GenerationTaskModel{ID: "local-import", ProjectID: domain.StringPtr("a"), Kind: "image", Provider: "media-library"}).Error; err != nil {
		t.Fatal(err)
	}
	inputs = append(inputs, domain.GenerationTaskReferenceModel{TaskID: "local-import", RefIndex: 0, AssetID: domain.StringPtr(assets["unused"].ID)})
	if err := db.Omit("Task", "Asset").Create(&inputs).Error; err != nil {
		t.Fatal(err)
	}
	selection := domain.ProjectSelectedAssetModel{ID: "selection", ProjectID: "a", ResourceType: "scene", AssetID: assets["candidate"].ID}
	if err := db.Omit("Project", "Asset", "SourceTask").Create(&selection).Error; err != nil {
		t.Fatal(err)
	}
	deleted := domain.ProjectSelectedAssetModel{ID: "deleted", ProjectID: "a", ResourceType: "scene", AssetID: assets["deleted"].ID, DeletedAt: gorm.DeletedAt{Time: selection.CreatedAt, Valid: true}}
	if err := db.Omit("Project", "Asset", "SourceTask").Create(&deleted).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Omit("Project", "Asset").Create(&domain.ProjectReferenceAssetModel{ID: "reference", ProjectID: "a", AssetID: assets["reference"].ID}).Error; err != nil {
		t.Fatal(err)
	}
	store.SetDocumentAssetReferenceSource(stubDocumentAssetReferences{byProject: map[string][]shared.DocumentMediaAssetReference{
		"a": {{AssetID: assets["document"].ID, DocumentID: "doc-a"}},
	}})
	var persistedSelection domain.ProjectSelectedAssetModel
	if err := db.First(&persistedSelection, "id = ?", selection.ID).Error; err != nil {
		t.Fatal(err)
	}
	before, err := store.List("a")
	if err != nil {
		t.Fatal(err)
	}
	for _, scope := range []string{"a", "b", ""} {
		got, err := store.ListWithUsage(t.Context(), scope)
		if err != nil {
			t.Fatalf("scope %q: %v", scope, err)
		}
		if scope != "b" && len(got) != 8 || scope == "b" && len(got) != 9 {
			t.Fatalf("wrong visibility for %q: %d", scope, len(got))
		}
		for _, asset := range got {
			want := domain.MediaAssetUsage{AssetID: asset.ID}
			if scope == "b" {
				want.Candidate = asset.ID == assets["selected"].ID
			} else {
				want.Selected = asset.ID == assets["selected"].ID || asset.ID == assets["candidate"].ID
				want.Candidate = asset.ID == assets["candidate"].ID || scope == "" && asset.ID == assets["selected"].ID
				for _, id := range []string{"reference", "input-url", "input-id", "document"} {
					want.Reference = want.Reference || asset.ID == assets[id].ID
				}
			}
			if asset.Usage == nil || *asset.Usage != want {
				t.Fatalf("scope %q %s: %+v, want %+v", scope, asset.Filename, asset.Usage, want)
			}
		}
	}
	after, err := store.List("a")
	if err != nil || !reflect.DeepEqual(before, after) {
		t.Fatalf("usage read modified default media records: %v", err)
	}
	var saved domain.ProjectSelectedAssetModel
	if err := db.First(&saved, "id = ?", selection.ID).Error; err != nil || !reflect.DeepEqual(saved, persistedSelection) {
		t.Fatalf("usage changed selection: %+v %v", saved, err)
	}
}

func TestListWithUsageFailuresAreNotUnused(t *testing.T) {
	store, db := newReferenceTestStore(t)
	if _, err := store.SaveReader(t.Context(), strings.NewReader("retained"), "kept.txt", "text/plain", ""); err != nil {
		t.Fatal(err)
	}
	if _, err := store.ListWithUsage(t.Context(), ""); err == nil {
		t.Fatal("missing document source must not claim unused")
	}
	store.SetDocumentAssetReferenceSource(stubDocumentAssetReferences{err: errors.New("document failure")})
	if _, err := store.ListWithUsage(t.Context(), "a"); err == nil {
		t.Fatal("document failure became unused")
	}
	ctx, cancel := context.WithCancel(t.Context())
	cancel()
	if _, err := store.ListWithUsage(ctx, ""); !errors.Is(err, context.Canceled) {
		t.Fatalf("cancellation = %v", err)
	}
	if err := db.Migrator().DropTable(&domain.GenerationTaskAssetModel{}); err != nil {
		t.Fatal(err)
	}
	if _, err := store.ListWithUsage(t.Context(), ""); err == nil {
		t.Fatal("database failure became unused")
	}
}
