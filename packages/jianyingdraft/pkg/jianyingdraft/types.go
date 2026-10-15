// Package jianyingdraft writes minimal Jianying desktop draft directories.
package jianyingdraft

import "context"

// DraftOptions configures a Jianying draft with video, audio and subtitle tracks.
type DraftOptions struct {
	Name                string
	Width               int
	Height              int
	FPS                 int
	MetadataReader      MetadataReader
	AudioMetadataReader AudioMetadataReader
}

// Shot describes one local video clip to place on the timeline.
type Shot struct {
	Path           string
	In             int64
	Duration       int64
	TargetStart    *int64
	TargetDuration int64
	Speed          float64
	Volume         *float64
	Transform      *Transform
}

// Transform stores normalized canvas position, scale, clockwise rotation and opacity.
type Transform struct {
	X        float64
	Y        float64
	Scale    float64
	Rotation float64
	Opacity  float64
}

// ExportOptions controls draft directory creation.
type ExportOptions struct {
	ReplaceExisting bool
	CopyMedia       bool
}

// ExportResult describes the draft files written by ExportContext.
type ExportResult struct {
	DraftPath      string
	ContentPath    string
	MetaPath       string
	DurationMicros int64
	ShotCount      int
}

// VideoMetadata contains the minimum source video metadata Jianying needs.
type VideoMetadata struct {
	Duration int64
	Width    int
	Height   int
}

// MetadataReader reads source video metadata.
type MetadataReader interface {
	Probe(ctx context.Context, path string) (VideoMetadata, error)
}

// AudioMetadataReader probes the actual audio stream duration in microseconds.
type AudioMetadataReader interface {
	ProbeAudio(ctx context.Context, path string) (int64, error)
}

// Audio describes a local audio source on a named independent track.
type Audio struct {
	Shot
	Track string
}

// Caption describes plain timed subtitle text.
type Caption struct {
	Text     string
	Start    int64
	Duration int64
}

type normalizedAudio struct {
	normalizedShot
	track string
}

type normalizedShot struct {
	duration       int64
	in             int64
	path           string
	metadata       VideoMetadata
	targetStart    *int64
	targetDuration int64
	speed          float64
	volume         float64
	transform      Transform
}
