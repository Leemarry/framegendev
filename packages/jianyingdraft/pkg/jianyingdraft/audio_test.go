package jianyingdraft

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"testing"
)

type fakeAudioReader struct{}

func (fakeAudioReader) ProbeAudio(context.Context, string) (int64, error) { return 8_000_000, nil }

func TestAudioAndUnicodeCaptionsExport(t *testing.T) {
	dir := t.TempDir()
	video, audio := writeTestFile(t, dir, "video.mp4"), writeTestFile(t, dir, "voice.wav")
	draft := NewDraft(DraftOptions{Name: "tracks", Width: 1920, Height: 1080, FPS: 30, MetadataReader: fakeMetadataReader{metadata: map[string]VideoMetadata{video: {Duration: 4_000_000, Width: 640, Height: 360}}}, AudioMetadataReader: fakeAudioReader{}})
	if err := draft.AddShots([]Shot{{Path: video}}); err != nil {
		t.Fatal(err)
	}
	start, zero := int64(500_000), 0.0
	clip := Audio{Track: "voice", Shot: Shot{Path: audio, In: 1_000_000, Duration: 3_750_000, TargetStart: &start, TargetDuration: 2_500_000, Speed: 1.5, Volume: &zero}}
	if err := draft.AddAudioContext(context.Background(), []Audio{clip, {Track: "voice", Shot: Shot{Path: audio}}}); err != nil {
		t.Fatal(err)
	}
	if err := draft.AddCaptionsContext(context.Background(), []Caption{{Text: "你好\U0001f3ac\n字幕", Start: 500_000, Duration: 1_700_000}}); err != nil {
		t.Fatal(err)
	}
	result, err := draft.ExportContext(context.Background(), dir, ExportOptions{CopyMedia: true})
	if err != nil {
		t.Fatal(err)
	}
	if result.DurationMicros != 8_000_000 {
		t.Fatalf("duration: %d", result.DurationMicros)
	}
	raw, err := os.ReadFile(result.ContentPath)
	if err != nil {
		t.Fatal(err)
	}
	var content struct {
		Tracks []struct {
			Type     string
			Segments []struct {
				MaterialID    string `json:"material_id"`
				Volume, Speed float64
				Source        struct{ Start, Duration int64 } `json:"source_timerange"`
				Target        struct{ Start, Duration int64 } `json:"target_timerange"`
			}
		}
		Materials struct {
			Audios []struct{ Path string }
			Texts  []struct{ Content string }
		}
	}
	if err := json.Unmarshal(raw, &content); err != nil {
		t.Fatal(err)
	}
	if len(content.Tracks) != 4 || content.Tracks[1].Type != "audio" || content.Tracks[2].Type != "audio" || content.Tracks[3].Type != "text" {
		t.Fatalf("tracks: %+v", content.Tracks)
	}
	s := content.Tracks[1].Segments[0]
	if s.Volume != 0 || s.Speed != 1.5 || s.Source.Start != 1_000_000 || s.Source.Duration != 3_750_000 || s.Target.Start != 500_000 || s.Target.Duration != 2_500_000 {
		t.Fatalf("audio: %+v", s)
	}
	for _, material := range content.Materials.Audios {
		if _, err := os.Stat(material.Path); err != nil {
			t.Fatal(err)
		}
	}
	var text struct {
		Text   string
		Styles []struct{ Range []int }
	}
	if err := json.Unmarshal([]byte(content.Materials.Texts[0].Content), &text); err != nil {
		t.Fatal(err)
	}
	if text.Text != "你好\U0001f3ac\n字幕" || text.Styles[0].Range[1] != 7 {
		t.Fatalf("unicode text: %+v", text)
	}
	clip.Duration = 8_000_000
	if err := draft.AddAudioContext(context.Background(), []Audio{clip}); err == nil || len(draft.audios) != 2 {
		t.Fatalf("bounds: %v", err)
	}
	if err := draft.AddCaptionsContext(context.Background(), []Caption{{Text: "", Duration: 1}}); err == nil || len(draft.captions) != 1 {
		t.Fatal("invalid captions changed draft")
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if err := draft.AddAudioContext(ctx, []Audio{clip}); !errors.Is(err, context.Canceled) {
		t.Fatal(err)
	}
}
