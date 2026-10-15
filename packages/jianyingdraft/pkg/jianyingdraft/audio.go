package jianyingdraft

import (
	"context"
	"errors"
	"fmt"
	"strings"
)

type audioReaderAdapter struct{ reader AudioMetadataReader }

func (reader audioReaderAdapter) Probe(ctx context.Context, path string) (VideoMetadata, error) {
	duration, err := reader.reader.ProbeAudio(ctx, path)
	return VideoMetadata{Duration: duration, Width: 1, Height: 1}, err
}

// AddAudioContext validates and appends audio clips without partially changing the draft.
func (draft *Draft) AddAudioContext(ctx context.Context, clips []Audio) error {
	if draft == nil {
		return errors.New("draft is nil")
	}
	if ctx == nil {
		ctx = context.Background()
	}
	reader := draft.options.AudioMetadataReader
	if reader == nil {
		reader, _ = draft.reader.(AudioMetadataReader)
	}
	if reader == nil {
		reader = FFProbeReader{}
	}
	options := draft.options
	options.MetadataReader = audioReaderAdapter{reader: reader}
	validator := NewDraft(options)
	shots := make([]Shot, len(clips))
	for i, clip := range clips {
		if strings.TrimSpace(clip.Track) == "" {
			return fmt.Errorf("audio %d track is required", i+1)
		}
		shots[i] = clip.Shot
	}
	if err := validator.AddShotsContext(ctx, shots); err != nil {
		return fmt.Errorf("validating audio: %w", err)
	}
	for i, shot := range validator.shots {
		draft.audios = append(draft.audios, normalizedAudio{normalizedShot: shot, track: clips[i].Track})
	}
	return nil
}

// AddCaptionsContext validates and appends plain subtitle clips.
func (draft *Draft) AddCaptionsContext(ctx context.Context, captions []Caption) error {
	if draft == nil {
		return errors.New("draft is nil")
	}
	if ctx == nil {
		ctx = context.Background()
	}
	if err := ctx.Err(); err != nil {
		return err
	}
	for i, caption := range captions {
		if strings.TrimSpace(caption.Text) == "" || len([]rune(caption.Text)) > 2000 || caption.Start < 0 || caption.Start > 86_400_000_000 || caption.Duration <= 0 || caption.Duration > 86_400_000_000-caption.Start {
			return fmt.Errorf("caption %d has invalid text or timing", i+1)
		}
	}
	draft.captions = append(draft.captions, captions...)
	return nil
}
