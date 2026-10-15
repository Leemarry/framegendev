package jianyingdraft

import (
	"context"
	"encoding/json"
	"errors"
	"math"
	"os"
	"path/filepath"
	"testing"
)

func TestEditedShotExportAndFailureIsolation(t *testing.T) {
	dir := t.TempDir()
	video := writeTestFile(t, dir, "source.mp4")
	draft := NewDraft(DraftOptions{Name: "edited", Width: 1080, Height: 1920, FPS: 30,
		MetadataReader: fakeMetadataReader{metadata: map[string]VideoMetadata{video: {Duration: 5_000_000, Width: 640, Height: 360}}}})
	start, zero := int64(2_500_000), 0.0
	shot := Shot{Path: video, In: 500_000, Duration: 2_550_000, TargetStart: &start, TargetDuration: 1_700_000, Speed: 1.5, Volume: &zero,
		Transform: &Transform{X: .2, Y: -.3, Scale: 1.2, Rotation: 30, Opacity: 0}}
	if err := draft.AddShots([]Shot{shot}); err != nil {
		t.Fatal(err)
	}
	result, err := draft.ExportContext(context.Background(), dir, ExportOptions{CopyMedia: true})
	if err != nil {
		t.Fatal(err)
	}
	if result.DurationMicros != 4_200_000 {
		t.Fatalf("duration: %d", result.DurationMicros)
	}
	raw, err := os.ReadFile(result.ContentPath)
	if err != nil {
		t.Fatal(err)
	}
	var content struct {
		Tracks []struct {
			Segments []struct {
				Source        struct{ Start, Duration int64 } `json:"source_timerange"`
				Target        struct{ Start, Duration int64 } `json:"target_timerange"`
				Speed, Volume float64
				Clip          struct {
					Alpha, Rotation float64
					Transform       struct{ X, Y float64 }
					Scale           struct{ X, Y float64 }
				}
			}
		}
		Materials struct{ Videos []struct{ Path string } }
	}
	if err := json.Unmarshal(raw, &content); err != nil {
		t.Fatal(err)
	}
	segment := content.Tracks[0].Segments[0]
	if segment.Source.Start != 500_000 || segment.Source.Duration != 2_550_000 || segment.Target.Start != start || segment.Target.Duration != 1_700_000 || segment.Speed != 1.5 || segment.Volume != 0 || segment.Clip.Alpha != 0 || segment.Clip.Transform.Y != -.3 || segment.Clip.Scale.X != 1.2 || segment.Clip.Rotation != 30 {
		t.Fatalf("segment: %+v", segment)
	}
	if _, err := os.Stat(content.Materials.Videos[0].Path); err != nil {
		t.Fatal(err)
	}
	if _, err := draft.ExportContext(context.Background(), dir, ExportOptions{}); !errors.Is(err, ErrDraftAlreadyExists) {
		t.Fatalf("conflict: %v", err)
	}
	after, _ := os.ReadFile(result.ContentPath)
	if string(raw) != string(after) {
		t.Fatal("conflict changed existing export")
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := draft.ExportContext(ctx, filepath.Join(dir, "cancelled"), ExportOptions{}); !errors.Is(err, context.Canceled) {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(dir, "cancelled")); !os.IsNotExist(err) {
		t.Fatal("cancel created destination")
	}
	for _, invalid := range []Shot{
		{Path: video, Transform: &Transform{Scale: 1, Opacity: math.NaN()}},
		{Path: video, In: 4_000_000, Duration: 2_000_000},
		{Path: video, Speed: math.Inf(1)},
		{Path: video, Duration: 1_000_000, TargetDuration: 2_000_000},
	} {
		if err := draft.AddShots([]Shot{invalid}); err == nil {
			t.Fatal("invalid edit accepted")
		}
		if len(draft.shots) != 1 {
			t.Fatal("invalid append modified draft")
		}
	}
}
