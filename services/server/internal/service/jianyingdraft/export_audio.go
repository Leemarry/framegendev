package jianyingdraft

import (
	"context"
	"fmt"
	"math"
	"strings"

	draftlib "github.com/mediago-dev/mediago-drama/packages/jianyingdraft/pkg/jianyingdraft"
	servicemedia "github.com/mediago-dev/mediago-drama/services/server/internal/service/media"
	"github.com/mediago-dev/mediago-drama/services/server/internal/service/model"
)

func (service *Service) addAudioAndCaptions(ctx context.Context, projectID string, episode model.EpisodeRecord, draft *draftlib.Draft) error {
	audios, captions := []draftlib.Audio{}, []draftlib.Caption{}
	for _, track := range episode.Tracks {
		for _, clip := range track.Clips {
			if err := ctx.Err(); err != nil {
				return err
			}
			start := int64(math.Round(clip.Start*30)) * 1_000_000 / 30
			duration := int64(math.Round(clip.End*30))*1_000_000/30 - start
			switch track.Type {
			case "caption":
				captions = append(captions, draftlib.Caption{Text: clip.Content, Start: start, Duration: duration})
			case "voiceover", "music":
				if clip.AudioURL == "" && clip.Status != "ready" {
					continue
				}
				id, ok := mediaAssetIDFromURL(clip.AudioURL)
				if !ok {
					return fmt.Errorf("%w: audio clip %s has no local source", ErrMediaAssetInvalid, clip.ID)
				}
				asset, ok, err := service.media.Get(id)
				if err != nil {
					return err
				}
				if !ok || strings.TrimSpace(asset.ProjectID) != "" && asset.ProjectID != projectID {
					return ErrMediaAssetNotFound
				}
				if asset.Kind != servicemedia.MediaKindAudio {
					return fmt.Errorf("%w: source is not audio", ErrMediaAssetInvalid)
				}
				path, err := service.media.ServeFilePath(asset)
				if err != nil {
					return fmt.Errorf("%w: audio source unavailable", ErrMediaAssetNotFound)
				}
				edit := model.TimelineClipEditRecord{Speed: 1, Volume: 1, Scale: 1, Opacity: 1}
				if clip.Edit != nil {
					edit = *clip.Edit
				}
				audios = append(audios, draftlib.Audio{Track: track.ID, Shot: draftlib.Shot{Path: path, In: int64(math.Round(edit.SourceIn * 1_000_000)), Duration: int64(math.Round(float64(duration) * edit.Speed)), TargetStart: &start, TargetDuration: duration, Speed: edit.Speed, Volume: &edit.Volume}})
			case "asset":
				if clip.VideoURL != "" || clip.AudioURL != "" {
					return fmt.Errorf("%w: asset layers require conversion to an editable media track", ErrMediaAssetInvalid)
				}
			}
		}
	}
	if err := draft.AddAudioContext(ctx, audios); err != nil {
		return err
	}
	return draft.AddCaptionsContext(ctx, captions)
}
