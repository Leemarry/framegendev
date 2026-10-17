package media

import (
	"errors"
	"os"
	"path/filepath"
	"testing"
)

func TestUpdateCatalogUsesRevisionAndReplaysOperation(t *testing.T) {
	store := newTestMediaAssets(t, filepath.Join(t.TempDir(), "workspace.db"), t.TempDir())
	asset, err := store.SaveTextWithOptions("content", "asset.txt", "", MediaAssetSaveOptions{})
	if err != nil {
		t.Fatal(err)
	}
	request := AssetCatalogUpdateRequest{
		MediaAssetUpdateRequest: MediaAssetUpdateRequest{Note: stringPointer("updated")},
		ExpectedRevision:        asset.UpdatedAt,
		OperationID:             "op-update-asset-1",
	}
	updated, found, err := store.UpdateCatalog(asset.ID, "", request)
	if err != nil || !found || updated.Note != "updated" {
		t.Fatalf("UpdateCatalog() = %#v, %v, %v", updated, found, err)
	}
	replayed, found, err := store.UpdateCatalog(asset.ID, "", request)
	if err != nil || !found || replayed.UpdatedAt != updated.UpdatedAt || replayed.Note != updated.Note {
		t.Fatalf("replay = %#v, %v, %v; want original result %#v", replayed, found, err, updated)
	}
	request.OperationID = "op-update-asset-2"
	if _, _, err := store.UpdateCatalog(asset.ID, "", request); !errors.Is(err, ErrAssetCatalogRevisionConflict) {
		t.Fatalf("stale revision error = %v, want revision conflict", err)
	}
}

func TestCatalogDeleteAndRestoreAreRevisionedAndIdempotent(t *testing.T) {
	store := newTestMediaAssets(t, filepath.Join(t.TempDir(), "workspace.db"), t.TempDir())
	asset, err := store.SaveTextWithOptions("content", "asset.txt", "", MediaAssetSaveOptions{})
	if err != nil {
		t.Fatal(err)
	}
	if _, found, err := store.MoveToTrashInScope(asset.ID, ""); err != nil || !found {
		t.Fatalf("MoveToTrashInScope() = found %v, err %v", found, err)
	}
	trashed, found, err := store.Get(asset.ID)
	if err != nil || !found || trashed.TrashedAt == "" {
		t.Fatalf("trashed asset = %#v, found %v, err %v", trashed, found, err)
	}
	request := AssetCatalogMutationRequest{ExpectedRevision: trashed.UpdatedAt, OperationID: "op-restore-asset-1"}
	restored, found, err := store.RestoreCatalog(asset.ID, "", request)
	if err != nil || !found || restored.TrashedAt != "" {
		t.Fatalf("RestoreCatalog() = %#v, found %v, err %v", restored, found, err)
	}
	replayed, found, err := store.RestoreCatalog(asset.ID, "", request)
	if err != nil || !found || replayed.UpdatedAt != restored.UpdatedAt {
		t.Fatalf("restore replay = %#v, found %v, err %v", replayed, found, err)
	}
	deleteRequest := AssetCatalogMutationRequest{ExpectedRevision: restored.UpdatedAt, OperationID: "op-delete-asset-1"}
	deleted, found, err := store.DeleteCatalog(asset.ID, "", deleteRequest)
	if err != nil || !found || !deleted {
		t.Fatalf("DeleteCatalog() = deleted %v, found %v, err %v", deleted, found, err)
	}
	deleted, found, err = store.DeleteCatalog(asset.ID, "", deleteRequest)
	if err != nil || !found || !deleted {
		t.Fatalf("delete replay = deleted %v, found %v, err %v", deleted, found, err)
	}
}

func TestCopyCatalogAssetIntoProjectIsIdempotent(t *testing.T) {
	store, source, target := newCatalogUseTestStore(t)
	asset := saveCatalogUseAsset(t, store, MediaKindImage, "image/png", "catalog-copy", MediaAssetSaveOptions{
		Source: MediaSourceUpload,
	})
	request := AssetCatalogCopyRequest{ProjectID: target.ID, OperationID: "op-copy-catalog-1"}
	copied, found, err := store.CopyCatalogAsset(asset.ID, "", request)
	if err != nil || !found || copied.ProjectID != target.ID || copied.ID == asset.ID {
		t.Fatalf("CopyCatalogAsset() = %#v, %v, %v", copied, found, err)
	}
	contents, err := os.ReadFile(copied.FilePath)
	if err != nil || string(contents) != "catalog-copy" {
		t.Fatalf("copied file = %q, %v; want source bytes", contents, err)
	}
	replayed, found, err := store.CopyCatalogAsset(asset.ID, "", request)
	if err != nil || !found || replayed.ID != copied.ID {
		t.Fatalf("copy replay = %#v, %v, %v; want original asset %q", replayed, found, err, copied.ID)
	}
	assets, err := store.List(target.ID)
	projectCopies := 0
	for _, listed := range assets {
		if listed.ProjectID == target.ID {
			projectCopies++
		}
	}
	if err != nil || projectCopies != 1 || copied.ProjectID != target.ID {
		t.Fatalf("target project assets = %#v, %v; want one copied asset (source %q)", assets, err, source.ID)
	}
}

func stringPointer(value string) *string { return &value }
