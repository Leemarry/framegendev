package media

import (
	"image"
	"os"
)

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
	asset.MetadataStatus = MetadataStatusReady
	return asset
}
