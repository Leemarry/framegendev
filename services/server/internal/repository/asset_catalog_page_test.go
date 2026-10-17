package repository

import (
	"path/filepath"
	"testing"
	"time"

	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	"github.com/mediago-dev/mediago-drama/services/server/internal/testutil"
)

func TestListAssetCatalogPageFiltersAndContinuesCursor(t *testing.T) {
	repo, err := NewMediaAssetRepository(filepath.Join(t.TempDir(), "workspace.db"))
	if err != nil {
		t.Fatal(err)
	}
	testutil.CloseDB(t, repo.db)
	fixtures := []domain.AssetModel{
		{ID: "c", Kind: "image", Filename: "hero-c.png", TagsJSON: `["hero"]`, Favorite: true, LibraryFolderID: "characters", Rating: 4, MIMEType: "image/png", CreatedAt: domain.TimeFromString("2026-01-03T00:00:00Z"), UpdatedAt: domain.TimeFromString("2026-01-03T00:00:00Z")},
		{ID: "b", Kind: "image", Filename: "hero-b.png", TagsJSON: `["hero"]`, Favorite: true, LibraryFolderID: "characters", Rating: 4, MIMEType: "image/png", CreatedAt: domain.TimeFromString("2026-01-02T00:00:00Z"), UpdatedAt: domain.TimeFromString("2026-01-02T00:00:00Z")},
		{ID: "a", Kind: "image", Filename: "other.png", TagsJSON: `["other"]`, MIMEType: "image/png", CreatedAt: domain.TimeFromString("2026-01-01T00:00:00Z"), UpdatedAt: domain.TimeFromString("2026-01-01T00:00:00Z")},
	}
	for _, fixture := range fixtures {
		if err := repo.CreateMediaAsset(fixture); err != nil {
			t.Fatal(err)
		}
	}
	options := AssetCatalogPageQuery{Tag: "hero", FolderID: "characters", Favorite: true, MinRating: intPointer(3), Limit: 1}
	first, revision, err := repo.ListAssetCatalogPage(options)
	if err != nil || len(first) != 1 || first[0].ID != "c" || revision == "" {
		t.Fatalf("first page = %#v, revision=%q, err=%v", first, revision, err)
	}
	options.CursorAt = first[0].UpdatedAt.Format(time.RFC3339Nano)
	options.CursorID = first[0].ID
	second, nextRevision, err := repo.ListAssetCatalogPage(options)
	if err != nil || len(second) != 1 || second[0].ID != "b" || nextRevision != revision {
		t.Fatalf("second page = %#v, revision=%q, err=%v", second, nextRevision, err)
	}
}

func intPointer(value int) *int { return &value }
