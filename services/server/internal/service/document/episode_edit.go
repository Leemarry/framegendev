package document

import (
	"fmt"
	"math"
	"sort"

	"github.com/mediago-dev/mediago-drama/services/server/internal/service/model"
)

func validateEditedEpisode(episode model.EpisodeRecord) error {
	if episode.EditVersion != 1 || episode.ID == "" || episode.Duration <= 0 || episode.Duration > 86400 {
		return fmt.Errorf("invalid edited episode version, id or duration")
	}
	if episode.AspectRatio != "16:9" && episode.AspectRatio != "9:16" && episode.AspectRatio != "1:1" {
		return fmt.Errorf("unsupported episode aspect ratio")
	}
	ids := map[string]bool{}
	for _, track := range episode.Tracks {
		clips := append([]model.TimelineClipRecord(nil), track.Clips...)
		sort.SliceStable(clips, func(i, j int) bool { return clips[i].Start < clips[j].Start })
		for index, clip := range clips {
			if clip.ID == "" || ids[clip.ID] || clip.Start < 0 || clip.End-clip.Start < 1.0/30-1e-6 || clip.End > 86400 || math.Abs(clip.Start*30-math.Round(clip.Start*30)) > 1e-4 || math.Abs(clip.End*30-math.Round(clip.End*30)) > 1e-4 {
				return fmt.Errorf("invalid clip timing or duplicate id: %s", clip.ID)
			}
			ids[clip.ID] = true
			if track.Type == "video" && index > 0 && clip.Start < clips[index-1].End-1e-6 {
				return fmt.Errorf("overlapping video clips")
			}
			if edit := clip.Edit; edit != nil && (edit.SourceIn < 0 || edit.Speed < .25 || edit.Speed > 4 || edit.Volume < 0 || edit.Volume > 2 || edit.Scale < .1 || edit.Scale > 3 || math.Abs(edit.X) > 1 || math.Abs(edit.Y) > 1 || math.Abs(edit.Rotation) > 180 || edit.Opacity < 0 || edit.Opacity > 1) {
				return fmt.Errorf("invalid clip edit parameters: %s", clip.ID)
			}
		}
	}
	return nil
}
