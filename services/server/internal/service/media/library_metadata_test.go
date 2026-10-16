package media

import (
	"bytes"
	"errors"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

func TestLibraryMetadataUpdate(t *testing.T) {
	store := newTestMediaAssets(t, filepath.Join(t.TempDir(), "db.sqlite"), t.TempDir())
	original, err := store.SaveReader(t.Context(), bytes.NewBufferString("unchanged bytes"), "参考.txt", "text/plain", "")
	if err != nil {
		t.Fatal(err)
	}
	if original.Tags == nil {
		t.Fatal("upload tags must be an empty array, not null")
	}
	if original.Favorite {
		t.Fatal("new media assets must not be favorited")
	}
	favorite := true
	updated, ok, err := store.Update(original.ID, "", MediaAssetUpdateRequest{Favorite: &favorite})
	if err != nil || !ok || !updated.Favorite {
		t.Fatalf("favorite-only update: %#v, %v", updated, err)
	}
	reopened, ok, err := store.Get(original.ID)
	if err != nil || !ok || !reopened.Favorite {
		t.Fatalf("favorite did not persist: %#v, %v", reopened, err)
	}
	tags := []string{" 主角 ", "主角", "", "场景"}
	note, rating := " 中文备注\n保留空白 ", 4
	updated, ok, err = store.Update(original.ID, "", MediaAssetUpdateRequest{Tags: &tags, Note: &note, Rating: &rating})
	if err != nil || !ok {
		t.Fatalf("update: %v, %v", ok, err)
	}
	if !reflect.DeepEqual(updated.Tags, []string{"主角", "场景"}) || updated.Note != note || updated.Rating != 4 {
		t.Fatalf("metadata: %#v", updated)
	}
	filename := "重命名"
	updated, ok, err = store.Update(original.ID, "", MediaAssetUpdateRequest{Filename: &filename})
	if err != nil || !ok || updated.Filename != "重命名.txt" || updated.Note != note || updated.Rating != 4 {
		t.Fatalf("partial: %#v, %v", updated, err)
	}
	if updated.URL != original.URL || updated.FilePath != original.FilePath || updated.ContentHash != original.ContentHash {
		t.Fatal("metadata changed content identity")
	}
	favorite = false
	updated, ok, err = store.Update(original.ID, "", MediaAssetUpdateRequest{Favorite: &favorite})
	if err != nil || !ok || updated.Favorite {
		t.Fatalf("explicit favorite clear: %#v, %v", updated, err)
	}
	contents, err := os.ReadFile(original.FilePath)
	if err != nil || string(contents) != "unchanged bytes" {
		t.Fatalf("content: %q, %v", contents, err)
	}
	if len(FilterMediaAssets([]MediaAsset{updated}, "", "场景")) != 1 || len(FilterMediaAssets([]MediaAsset{updated}, "", "中文备注")) != 1 {
		t.Fatal("metadata not searchable")
	}
	tags, note, rating = []string{}, "", 0
	updated, ok, err = store.Update(original.ID, "", MediaAssetUpdateRequest{Tags: &tags, Note: &note, Rating: &rating})
	if err != nil || !ok || len(updated.Tags) != 0 || updated.Note != "" || updated.Rating != 0 {
		t.Fatalf("clear: %#v, %v", updated, err)
	}
	got, ok, err := store.Get(original.ID)
	if err != nil || !ok || got.Note != "" || got.Rating != 0 || len(got.Tags) != 0 {
		t.Fatalf("read: %#v, %v", got, err)
	}
}

func TestLibraryMetadataValidationAndScope(t *testing.T) {
	store := newTestMediaAssets(t, filepath.Join(t.TempDir(), "db.sqlite"), t.TempDir())
	original, err := store.SaveReader(t.Context(), strings.NewReader("test"), "test.txt", "text/plain", "")
	if err != nil {
		t.Fatal(err)
	}
	for _, scope := range []string{"other", "missing"} {
		note := "wrong scope"
		if _, ok, err := store.Update(original.ID, scope, MediaAssetUpdateRequest{Note: &note}); err != nil || ok {
			t.Fatalf("scope %s: %v %v", scope, ok, err)
		}
	}
	tooMany, longTags := make([]string, 21), []string{strings.Repeat("字", 41)}
	longNote, low, high := strings.Repeat("字", 4001), -1, 6
	empty := ""
	for name, payload := range map[string]MediaAssetUpdateRequest{
		"empty": {}, "filename": {Filename: &empty}, "too many tags": {Tags: &tooMany}, "long tag": {Tags: &longTags}, "long note": {Note: &longNote}, "low": {Rating: &low}, "high": {Rating: &high},
	} {
		t.Run(name, func(t *testing.T) {
			if _, _, err := store.Update(original.ID, "", payload); !errors.Is(err, ErrInvalidMediaAssetUpdate) {
				t.Fatalf("validation: %v", err)
			}
		})
	}
	got, _, err := store.Get(original.ID)
	if err != nil || got.UpdatedAt != original.UpdatedAt || got.Note != "" {
		t.Fatalf("rejected request wrote: %#v %v", got, err)
	}
}
