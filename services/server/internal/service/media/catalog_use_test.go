package media

import (
	"context"
	"encoding/base64"
	"errors"
	"path/filepath"
	"testing"

	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	"github.com/mediago-dev/mediago-drama/services/server/internal/repository"
	"github.com/mediago-dev/mediago-drama/services/server/internal/testutil"
)

// newCatalogUseTestStore builds a media service plus seeded projects and one
// storyboard section, which is the target the use-for-creation dialog offers.
func newCatalogUseTestStore(t *testing.T) (*MediaAssets, *domain.WorkspaceProjectModel, *domain.WorkspaceProjectModel) {
	t.Helper()

	workspaceRoot := t.TempDir()
	dbPath := filepath.Join(t.TempDir(), "workspace.sqlite")
	repo, err := newTestMediaAssetRepository(t, dbPath)
	if err != nil {
		t.Fatalf("NewMediaAssetRepository() error = %v", err)
	}
	store := NewMediaAssetsFromRepository(repo, filepath.Join(workspaceRoot, "library"), workspaceRoot, nil, nil)

	db, err := repository.OpenGormSQLite(dbPath)
	if err != nil {
		t.Fatalf("OpenGormSQLite() error = %v", err)
	}
	testutil.CloseDB(t, db)

	source := domain.WorkspaceProjectModel{ID: "project-source", Name: "Source", RelativeDir: "source"}
	target := domain.WorkspaceProjectModel{ID: "project-target", Name: "Target", RelativeDir: "target"}
	for _, project := range []domain.WorkspaceProjectModel{source, target} {
		if err := db.Create(&project).Error; err != nil {
			t.Fatalf("creating project %s: %v", project.ID, err)
		}
	}
	if err := db.Create(&domain.DocumentSectionModel{
		ProjectID:  target.ID,
		SectionID:  "section-storyboard",
		DocumentID: "document-script",
		Type:       "storyboard",
		Title:      "开场分镜",
		Status:     "active",
	}).Error; err != nil {
		t.Fatalf("creating section: %v", err)
	}
	if err := db.Create(&domain.DocumentSectionModel{
		ProjectID:  target.ID,
		SectionID:  "section-plain",
		DocumentID: "document-script",
		Type:       "document",
		Title:      "正文",
		Status:     "active",
	}).Error; err != nil {
		t.Fatalf("creating plain section: %v", err)
	}

	return store, &source, &target
}

func saveCatalogUseAsset(t *testing.T, store *MediaAssets, kind string, mimeType string, bytes string, options MediaAssetSaveOptions) MediaAsset {
	t.Helper()

	asset, err := store.SaveBase64WithOptions(
		kind,
		mimeType,
		base64.StdEncoding.EncodeToString([]byte(bytes)),
		"",
		options,
	)
	if err != nil {
		t.Fatalf("SaveBase64WithOptions(%s) error = %v", kind, err)
	}
	return asset
}

func TestUseForCreationSavesIntoTargetProjectAndAddsCandidate(t *testing.T) {
	store, _, target := newCatalogUseTestStore(t)
	asset := saveCatalogUseAsset(t, store, MediaKindImage, "image/png", "storyboard-image", MediaAssetSaveOptions{Source: MediaSourceUpload})

	request := AssetCatalogUseRequest{
		OperationID: "op-first",
		ProjectID:   target.ID,
		Target:      &AssetCatalogUseTarget{DocumentID: "document-script", SectionID: "section-storyboard"},
		AssetIDs:    []string{asset.ID},
	}
	response, err := store.UseForCreation(context.Background(), request)
	if err != nil {
		t.Fatalf("UseForCreation() error = %v", err)
	}
	if len(response.Items) != 1 {
		t.Fatalf("UseForCreation() items = %+v, want one item", response.Items)
	}
	item := response.Items[0]
	if item.SourceID != asset.ID || item.Error != "" || !item.Added || item.AssetID == "" {
		t.Fatalf("UseForCreation() item = %+v, want a saved candidate", item)
	}
	if item.AssetID == asset.ID {
		t.Fatal("a global asset must be copied into the target project, not reused in place")
	}

	projectAssets, err := store.List(target.ID)
	if err != nil {
		t.Fatalf("List() error = %v", err)
	}
	var copied *MediaAsset
	owned := 0
	for index := range projectAssets {
		if projectAssets[index].ProjectID != target.ID {
			continue
		}
		owned++
		if projectAssets[index].ID == item.AssetID {
			copied = &projectAssets[index]
		}
	}
	if owned != 1 || copied == nil || copied.Source != MediaSourceImported {
		t.Fatalf("List() = %+v, want one imported copy in the target project", projectAssets)
	}

	// The source scope keeps its own asset and file untouched.
	if sourceAssets, err := store.List(""); err != nil {
		t.Fatalf("List(global) error = %v", err)
	} else if len(sourceAssets) != 1 || sourceAssets[0].ID != asset.ID {
		t.Fatalf("List(global) = %+v, want the original asset only", sourceAssets)
	}

	replay, err := store.UseForCreation(context.Background(), request)
	if err != nil {
		t.Fatalf("UseForCreation() replay error = %v", err)
	}
	if replay.Items[0].AssetID != item.AssetID || !replay.Items[0].Added {
		t.Fatalf("replay = %+v, want the first response", replay.Items[0])
	}
	afterReplay, err := store.List(target.ID)
	if err != nil {
		t.Fatalf("List() after replay error = %v", err)
	}
	if count := catalogUseOwnedCount(afterReplay, target.ID); count != 1 {
		t.Fatalf("List() after replay = %+v, want no duplicate copy", afterReplay)
	}

	// A fresh operation ID must still not duplicate the content.
	second, err := store.UseForCreation(context.Background(), AssetCatalogUseRequest{
		OperationID: "op-second",
		ProjectID:   target.ID,
		Target:      request.Target,
		AssetIDs:    request.AssetIDs,
	})
	if err != nil {
		t.Fatalf("UseForCreation() second operation error = %v", err)
	}
	if second.Items[0].AssetID != item.AssetID || !second.Items[0].Added {
		t.Fatalf("second operation = %+v, want the same copy and candidate", second.Items[0])
	}
	afterSecond, err := store.List(target.ID)
	if err != nil {
		t.Fatalf("List() after second operation error = %v", err)
	}
	if count := catalogUseOwnedCount(afterSecond, target.ID); count != 1 {
		t.Fatalf("List() after second operation = %+v, want content reuse", afterSecond)
	}
}

// catalogUseOwnedCount counts the assets one project owns, ignoring the global
// scope rows that a project listing also returns.
func catalogUseOwnedCount(assets []MediaAsset, projectID string) int {
	count := 0
	for _, asset := range assets {
		if asset.ProjectID == projectID {
			count++
		}
	}
	return count
}

func TestUseForCreationReportsPerItemErrors(t *testing.T) {
	store, source, target := newCatalogUseTestStore(t)
	scoped := saveCatalogUseAsset(t, store, MediaKindImage, "image/png", "scoped-image", MediaAssetSaveOptions{
		ProjectID: source.ID,
		Source:    MediaSourceUpload,
	})
	foreign := saveCatalogUseAsset(t, store, MediaKindImage, "image/png", "foreign-image", MediaAssetSaveOptions{
		Source: MediaSourceUpload,
	})
	trashed := saveCatalogUseAsset(t, store, MediaKindImage, "image/png", "trashed-image", MediaAssetSaveOptions{
		Source: MediaSourceUpload,
	})
	if _, ok, err := store.MoveToTrashInScope(trashed.ID, ""); err != nil || !ok {
		t.Fatalf("MoveToTrashInScope() = %v, %v", ok, err)
	}

	response, err := store.UseForCreation(context.Background(), AssetCatalogUseRequest{
		OperationID:     "op-errors",
		SourceProjectID: source.ID,
		ProjectID:       target.ID,
		AssetIDs:        []string{"asset-missing", scoped.ID, foreign.ID, trashed.ID},
	})
	if err != nil {
		t.Fatalf("UseForCreation() error = %v", err)
	}
	if len(response.Items) != 4 {
		t.Fatalf("UseForCreation() items = %+v, want four items", response.Items)
	}

	bySource := map[string]AssetCatalogUseItem{}
	for _, item := range response.Items {
		bySource[item.SourceID] = item
	}
	if item := bySource["asset-missing"]; item.Error != "素材不存在或已移入回收站" {
		t.Fatalf("missing asset item = %+v", item)
	}
	if item := bySource[foreign.ID]; item.Error != "素材不属于来源项目" {
		t.Fatalf("foreign asset item = %+v", item)
	}
	if item := bySource[trashed.ID]; item.Error != "素材不存在或已移入回收站" {
		t.Fatalf("trashed asset item = %+v", item)
	}
	if item := bySource[scoped.ID]; item.Error != "" || item.AssetID == "" || item.AssetID == scoped.ID {
		t.Fatalf("scoped asset item = %+v, want a project copy", item)
	}
}

func TestUseForCreationSkipsCandidatesForOtherKinds(t *testing.T) {
	store, _, target := newCatalogUseTestStore(t)
	audio := saveCatalogUseAsset(t, store, MediaKindAudio, "audio/mpeg", "voice-over", MediaAssetSaveOptions{
		ProjectID: target.ID,
		Source:    MediaSourceUpload,
	})

	response, err := store.UseForCreation(context.Background(), AssetCatalogUseRequest{
		OperationID: "op-audio",
		ProjectID:   target.ID,
		Target:      &AssetCatalogUseTarget{DocumentID: "document-script", SectionID: "section-storyboard"},
		AssetIDs:    []string{audio.ID},
	})
	if err != nil {
		t.Fatalf("UseForCreation() error = %v", err)
	}
	item := response.Items[0]
	if item.Error != "" || item.Added {
		t.Fatalf("audio item = %+v, want saved without a candidate", item)
	}
	if item.AssetID != audio.ID {
		t.Fatalf("audio item = %+v, want the existing project asset", item)
	}
}

func TestUseForCreationRejectsInvalidRequests(t *testing.T) {
	store, _, target := newCatalogUseTestStore(t)
	asset := saveCatalogUseAsset(t, store, MediaKindImage, "image/png", "valid-image", MediaAssetSaveOptions{Source: MediaSourceUpload})

	cases := []struct {
		name    string
		request AssetCatalogUseRequest
		want    error
	}{
		{
			name:    "missing operation id",
			request: AssetCatalogUseRequest{ProjectID: target.ID, AssetIDs: []string{asset.ID}},
			want:    ErrAssetCatalogUseInvalid,
		},
		{
			name:    "missing project id",
			request: AssetCatalogUseRequest{OperationID: "op-no-project", AssetIDs: []string{asset.ID}},
			want:    ErrAssetCatalogUseInvalid,
		},
		{
			name:    "missing asset ids",
			request: AssetCatalogUseRequest{OperationID: "op-no-assets", ProjectID: target.ID},
			want:    ErrAssetCatalogUseInvalid,
		},
		{
			name: "incomplete target",
			request: AssetCatalogUseRequest{
				OperationID: "op-half-target",
				ProjectID:   target.ID,
				Target:      &AssetCatalogUseTarget{DocumentID: "document-script"},
				AssetIDs:    []string{asset.ID},
			},
			want: ErrAssetCatalogUseInvalid,
		},
		{
			name: "unknown target section",
			request: AssetCatalogUseRequest{
				OperationID: "op-unknown-section",
				ProjectID:   target.ID,
				Target:      &AssetCatalogUseTarget{DocumentID: "document-script", SectionID: "section-missing"},
				AssetIDs:    []string{asset.ID},
			},
			want: ErrCatalogSectionNotFound,
		},
		{
			name: "non creative section",
			request: AssetCatalogUseRequest{
				OperationID: "op-plain-section",
				ProjectID:   target.ID,
				Target:      &AssetCatalogUseTarget{DocumentID: "document-script", SectionID: "section-plain"},
				AssetIDs:    []string{asset.ID},
			},
			want: ErrAssetCatalogUseInvalid,
		},
	}

	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			if _, err := store.UseForCreation(context.Background(), testCase.request); !errors.Is(err, testCase.want) {
				t.Fatalf("UseForCreation() error = %v, want %v", err, testCase.want)
			}
		})
	}
}
