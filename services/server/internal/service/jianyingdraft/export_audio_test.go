package jianyingdraft

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"testing"

	draftlib "github.com/mediago-dev/mediago-drama/packages/jianyingdraft/pkg/jianyingdraft"
	servicedocument "github.com/mediago-dev/mediago-drama/services/server/internal/service/document"
	servicemedia "github.com/mediago-dev/mediago-drama/services/server/internal/service/media"
)

func TestEditedExportIncludesActualAudioAndCaptions(t *testing.T) {
	dir := t.TempDir()
	video, audio := writeServiceTestFile(t, dir, "v.mp4"), writeServiceTestFile(t, dir, "a.wav")
	raw := json.RawMessage(`{"editVersion":1,"title":"combined","tracks":[{"id":"v","type":"video","clips":[{"id":"v","status":"ready","start":0,"end":1.7,"videoUrl":"/api/v1/media-assets/v/content"}]},{"id":"voice","type":"voiceover","clips":[{"id":"a","status":"ready","start":0.5,"end":3,"audioUrl":"/api/v1/media-assets/a/content","edit":{"sourceIn":1,"speed":1.5,"volume":0,"scale":1,"opacity":1}}]},{"type":"caption","clips":[{"content":"中文对白","start":0.5,"end":2.2}]},{"type":"music","clips":[{"status":"draft","start":0,"end":30}]}]}`)
	assets := map[string]servicemedia.MediaAsset{"v": {ID: "v", Kind: servicemedia.MediaKindVideo, FilePath: video}, "a": {ID: "a", Kind: servicemedia.MediaKindAudio, FilePath: audio}}
	service := NewService(fakeTimelineStore{ok: true, state: servicedocument.EpisodeTimelineStateResponse{Episode: raw}}, fakeMediaStore{assets: assets}, nil, staticMetadataReader{metadata: draftlib.VideoMetadata{Duration: 8_000_000, Width: 640, Height: 360}})
	result, err := service.ExportEpisode(context.Background(), "p", "d", ExportRequest{DraftsRoot: dir, DraftName: "combined", CopyMedia: true})
	if err != nil || result.DurationMicros != 3_000_000 {
		t.Fatalf("result: %+v %v", result, err)
	}
	data, err := os.ReadFile(filepath.Join(result.DraftPath, "draft_content.json"))
	if err != nil {
		t.Fatal(err)
	}
	var doc struct{ Tracks []struct{ Type string } }
	if err := json.Unmarshal(data, &doc); err != nil {
		t.Fatal(err)
	}
	if len(doc.Tracks) != 3 || doc.Tracks[1].Type != "audio" || doc.Tracks[2].Type != "text" {
		t.Fatalf("tracks: %+v", doc)
	}
	asset := assets["a"]
	asset.ProjectID = "other"
	assets["a"] = asset
	if _, err := service.ExportEpisode(context.Background(), "p", "d", ExportRequest{DraftsRoot: dir, DraftName: "blocked"}); !errors.Is(err, ErrMediaAssetNotFound) {
		t.Fatalf("cross project: %v", err)
	}
}
