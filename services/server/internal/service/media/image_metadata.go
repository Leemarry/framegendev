package media

import (
	"encoding/json"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"math"
	"os"
	"sort"
)

const (
	maxPalettePixels  = 40_000_000
	maxPaletteSamples = 4096
	maxPaletteColors  = 5
)

type paletteColor struct {
	count   int
	r, g, b int
	key     uint16
}

func enrichImageMetadata(asset MediaAsset) MediaAsset {
	file, err := os.Open(asset.FilePath)
	if err != nil {
		asset.MetadataStatus = MetadataStatusFailed
		return asset
	}
	defer file.Close()
	config, _, err := image.DecodeConfig(file)
	if err != nil || config.Width <= 0 || config.Height <= 0 {
		asset.MetadataStatus = MetadataStatusFailed
		return asset
	}
	asset.Width = config.Width
	asset.Height = config.Height
	asset.Colors = extractImagePalette(file, config.Width, config.Height)
	asset.MetadataStatus = MetadataStatusReady
	return asset
}

func extractImagePalette(file *os.File, width int, height int) []string {
	if width <= 0 || height <= 0 || int64(width)*int64(height) > maxPalettePixels {
		return nil
	}
	if _, err := file.Seek(0, 0); err != nil {
		return nil
	}
	decoded, _, err := image.Decode(file)
	if err != nil {
		return nil
	}
	step := int(math.Ceil(math.Sqrt(float64(width*height) / maxPaletteSamples)))
	if step < 1 {
		step = 1
	}
	bounds := decoded.Bounds()
	colors := map[uint16]*paletteColor{}
	for y := bounds.Min.Y; y < bounds.Max.Y; y += step {
		for x := bounds.Min.X; x < bounds.Max.X; x += step {
			r, g, b, a := decoded.At(x, y).RGBA()
			if a < 0x8000 {
				continue
			}
			r8, g8, b8 := int(r>>8), int(g>>8), int(b>>8)
			key := uint16(r8>>4)<<8 | uint16(g8>>4)<<4 | uint16(b8>>4)
			entry := colors[key]
			if entry == nil {
				entry = &paletteColor{key: key}
				colors[key] = entry
			}
			entry.count++
			entry.r += r8
			entry.g += g8
			entry.b += b8
		}
	}
	ordered := make([]*paletteColor, 0, len(colors))
	for _, entry := range colors {
		ordered = append(ordered, entry)
	}
	sort.Slice(ordered, func(i, j int) bool {
		if ordered[i].count == ordered[j].count {
			return ordered[i].key < ordered[j].key
		}
		return ordered[i].count > ordered[j].count
	})
	if len(ordered) > maxPaletteColors {
		ordered = ordered[:maxPaletteColors]
	}
	result := make([]string, 0, len(ordered))
	for _, entry := range ordered {
		result = append(result, fmt.Sprintf("#%02x%02x%02x", entry.r/entry.count, entry.g/entry.count, entry.b/entry.count))
	}
	return result
}

func imagePaletteJSON(colors []string) string {
	encoded, err := json.Marshal(colors)
	if err != nil {
		return "[]"
	}
	return string(encoded)
}
