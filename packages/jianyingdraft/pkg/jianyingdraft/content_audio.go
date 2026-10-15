package jianyingdraft

import (
	"encoding/json"
	"path/filepath"
	"unicode/utf16"
)

func (draft *Draft) appendAudioAndCaptions(content map[string]any, materials map[string]any, paths map[string]string, duration *int64) error {
	tracks := content["tracks"].([]map[string]any)
	speeds := materials["speeds"].([]map[string]any)
	audios := []map[string]any{}
	trackIndexes := map[string][]int{}
	type timeRange struct{ start, end int64 }
	ranges := map[int][]timeRange{}
	for _, audio := range draft.audios {
		materialID, err := randomHexID()
		if err != nil {
			return err
		}
		segmentID, err := randomHexID()
		if err != nil {
			return err
		}
		speedID, err := randomHexID()
		if err != nil {
			return err
		}
		path := audio.path
		if paths[path] != "" {
			path = paths[path]
		}
		audios = append(audios, map[string]any{"id": materialID, "type": "extract_music", "path": path, "name": filepath.Base(path), "duration": audio.metadata.Duration, "music_id": "", "wave_points": []any{}, "category_id": "local", "category_name": "local", "local_material_id": ""})
		speed := speedObject(speedID)
		speed["speed"] = jsonFloat(audio.speed)
		speeds = append(speeds, speed)
		start := int64(0)
		if audio.targetStart != nil {
			start = *audio.targetStart
		}
		segment := segmentObject(segmentID, materialID, speedID, audio.normalizedShot, start)
		segment["clip"] = nil
		index := -1
		for _, candidate := range trackIndexes[audio.track] {
			overlaps := false
			for _, interval := range ranges[candidate] {
				if start < interval.end && start+audio.targetDuration > interval.start {
					overlaps = true
					break
				}
			}
			if !overlaps {
				index = candidate
				break
			}
		}
		if index < 0 {
			trackID, err := randomHexID()
			if err != nil {
				return err
			}
			track := trackObject(trackID, []map[string]any{})
			track["type"] = "audio"
			track["name"] = audio.track
			index = len(tracks)
			trackIndexes[audio.track] = append(trackIndexes[audio.track], index)
			tracks = append(tracks, track)
		}
		tracks[index]["segments"] = append(tracks[index]["segments"].([]map[string]any), segment)
		ranges[index] = append(ranges[index], timeRange{start: start, end: start + audio.targetDuration})
		if end := start + audio.targetDuration; end > *duration {
			*duration = end
		}
	}
	texts, segments := []map[string]any{}, []map[string]any{}
	for _, caption := range draft.captions {
		materialID, err := randomHexID()
		if err != nil {
			return err
		}
		segmentID, err := randomHexID()
		if err != nil {
			return err
		}
		styled, err := json.Marshal(map[string]any{"text": caption.Text, "styles": []map[string]any{{"range": []int{0, len(utf16.Encode([]rune(caption.Text)))}, "size": 8, "fill": map[string]any{"content": map[string]any{"solid": map[string]any{"color": []float64{1, 1, 1}}}}, "strokes": []map[string]any{{"width": .08, "content": map[string]any{"solid": map[string]any{"color": []float64{0, 0, 0}}}}}}}})
		if err != nil {
			return err
		}
		texts = append(texts, map[string]any{"id": materialID, "type": "text", "content": string(styled), "alignment": 1, "font_size": 8, "font_path": "", "text_color": "#FFFFFF", "text_alpha": 1.0, "line_spacing": .02, "letter_spacing": 0, "global_alpha": 1.0, "background_alpha": 0.0, "border_alpha": 1.0, "border_color": "#000000", "border_width": .08, "check_flag": 7, "add_type": 0})
		shot := normalizedShot{targetDuration: caption.Duration, duration: caption.Duration, speed: 1, volume: 1, transform: Transform{Y: -.8, Scale: 1, Opacity: 1}}
		segment := segmentObject(segmentID, materialID, "", shot, caption.Start)
		segment["source_timerange"] = nil
		segment["extra_material_refs"] = []string{}
		segment["render_index"] = 14000
		segments = append(segments, segment)
		if end := caption.Start + caption.Duration; end > *duration {
			*duration = end
		}
	}
	if len(segments) > 0 {
		id, err := randomHexID()
		if err != nil {
			return err
		}
		track := trackObject(id, segments)
		track["type"] = "text"
		track["name"] = "字幕"
		tracks = append(tracks, track)
	}
	materials["audios"] = audios
	materials["texts"] = texts
	materials["speeds"] = speeds
	content["tracks"] = tracks
	return nil
}
