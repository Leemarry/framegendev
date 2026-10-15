package document

import (
	"encoding/json"
	"reflect"
	"testing"

	"github.com/mediago-dev/mediago-drama/services/server/internal/service/model"
)

func TestEditedEpisodeSurvivesResolvedRead(t *testing.T) {
	store := requireDocumentStore(t)
	const projectID = "project-nle"
	requireTestProject(t, store, projectID)
	document, _, err := store.CreateWorkspaceDocument(projectID, CreateWorkspaceDocumentRequest{ID: "nle-doc", Title: "NLE", Content: "## Original\ntext", Category: "storyboard"})
	if err != nil {
		t.Fatal(err)
	}
	episode := model.EpisodeRecord{ID: "episode-nle", EditVersion: 1, Title: "Manual edit", Duration: 1.7, AspectRatio: "9:16", Sections: []model.EpisodeSectionRecord{}, Tracks: []model.TimelineTrackRecord{{ID: "v1", Type: "video", Label: "Video", Clips: []model.TimelineClipRecord{{ID: "clip", Title: "Edited", Start: 0, End: 1.7, Content: "manual", Status: "ready", VideoURL: "/api/v1/media-assets/a/content", Edit: &model.TimelineClipEditRecord{SourceIn: .5, Speed: 2, Volume: 0, Scale: 1.2, X: .1, Rotation: 15, Opacity: 0}}}}}}
	episode.Tracks = append(episode.Tracks,
		model.TimelineTrackRecord{ID: "c", Type: "caption", Clips: []model.TimelineClipRecord{{ID: "caption", Start: .5, End: 1.7, Content: "你好，字幕", Status: "ready"}}},
		model.TimelineTrackRecord{ID: "a", Type: "voiceover", Clips: []model.TimelineClipRecord{{ID: "audio", Start: 0, End: 1.7, AudioURL: "/api/v1/media-assets/voice/content", Status: "ready", Edit: &model.TimelineClipEditRecord{Speed: 1, Volume: 0, Scale: 1, Opacity: 1}}}},
	)
	raw, err := json.Marshal(episode)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := store.SaveEpisodeTimelineState(projectID, document.ID, SaveEpisodeTimelineStateRequest{Episode: raw}); err != nil {
		t.Fatal(err)
	}
	for range 2 {
		resolved, err := store.GetResolvedEpisodeTimelineState(projectID, document.ID)
		if err != nil {
			t.Fatal(err)
		}
		if !reflect.DeepEqual(resolved.Episode, episode) {
			t.Fatalf("manual edit was rebuilt: %#v", resolved.Episode)
		}
	}
}

func TestValidateEditedEpisode(t *testing.T) {
	valid := model.EpisodeRecord{ID: "nle", EditVersion: 1, Duration: 1, AspectRatio: "16:9", Tracks: []model.TimelineTrackRecord{{Type: "video", Clips: []model.TimelineClipRecord{{ID: "a", End: 1}}}}}
	for _, tc := range []struct {
		name   string
		change func(*model.EpisodeRecord)
	}{
		{"unsupported version", func(e *model.EpisodeRecord) { e.EditVersion = 2 }},
		{"non-frame timing", func(e *model.EpisodeRecord) { e.Tracks[0].Clips[0].End = .01 }},
		{"duplicate", func(e *model.EpisodeRecord) { e.Tracks[0].Clips = append(e.Tracks[0].Clips, e.Tracks[0].Clips[0]) }},
		{"invalid speed", func(e *model.EpisodeRecord) {
			e.Tracks[0].Clips[0].Edit = &model.TimelineClipEditRecord{Speed: 0, Scale: 1, Opacity: 1}
		}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			raw, _ := json.Marshal(valid)
			var episode model.EpisodeRecord
			if err := json.Unmarshal(raw, &episode); err != nil {
				t.Fatal(err)
			}
			tc.change(&episode)
			if err := validateEditedEpisode(episode); err == nil {
				t.Fatal("expected validation failure")
			}
		})
	}
	if err := validateEditedEpisode(valid); err != nil {
		t.Fatal(err)
	}
}
