package media

import (
	"bytes"
	"image"
	"image/color"
	"image/gif"
	"image/jpeg"
	"image/png"
	"os"
	"path/filepath"
	"reflect"
	"testing"
)

func TestImageDimensionsPersistOnImport(t *testing.T) {
	for _, format := range []string{"png", "jpeg", "gif", "invalid"} {
		t.Run(format, func(t *testing.T) {
			var data bytes.Buffer
			img := image.NewRGBA(image.Rect(0, 0, 13, 21))
			var err error
			switch format {
			case "png":
				err = png.Encode(&data, img)
			case "jpeg":
				err = jpeg.Encode(&data, img, nil)
			case "gif":
				err = gif.Encode(&data, img, nil)
			default:
				data.WriteString("not an image")
			}
			if err != nil {
				t.Fatal(err)
			}
			root := t.TempDir()
			store := newTestMediaAssets(t, filepath.Join(root, "app.db"), filepath.Join(root, "library"))
			original := append([]byte(nil), data.Bytes()...)
			asset, err := store.SaveReader(t.Context(), &data, "reference."+format, "image/"+format, "")
			if err != nil {
				t.Fatal(err)
			}
			if format == "invalid" {
				if asset.Width != 0 || asset.Height != 0 || asset.MetadataStatus != MetadataStatusFailed {
					t.Fatalf("invalid image metadata = %#v", asset)
				}
			} else if asset.Width != 13 || asset.Height != 21 || asset.MetadataStatus != MetadataStatusReady {
				t.Fatalf("image metadata = %dx%d %s", asset.Width, asset.Height, asset.MetadataStatus)
			}
			content, err := os.ReadFile(asset.FilePath)
			if err != nil || !bytes.Equal(content, original) {
				t.Fatalf("image bytes changed: %v", err)
			}
			persisted, ok, err := store.Get(asset.ID)
			if err != nil || !ok || persisted.Width != asset.Width || persisted.Height != asset.Height || persisted.MetadataStatus != asset.MetadataStatus {
				t.Fatalf("persisted metadata = %#v, ok %v error %v", persisted, ok, err)
			}
		})
	}
}

func TestImagePalettePersistsOnImport(t *testing.T) {
	root := t.TempDir()
	store := newTestMediaAssets(t, filepath.Join(root, "app.db"), filepath.Join(root, "library"))
	img := image.NewRGBA(image.Rect(0, 0, 20, 10))
	for y := 0; y < 10; y++ {
		for x := 0; x < 20; x++ {
			if x < 15 {
				img.Set(x, y, color.RGBA{R: 255, A: 255})
			} else {
				img.Set(x, y, color.RGBA{B: 255, A: 255})
			}
		}
	}
	var data bytes.Buffer
	if err := png.Encode(&data, img); err != nil {
		t.Fatal(err)
	}
	asset, err := store.SaveReader(t.Context(), &data, "palette.png", "image/png", "")
	if err != nil {
		t.Fatal(err)
	}
	want := []string{"#ff0000", "#0000ff"}
	if !reflect.DeepEqual(asset.Colors, want) {
		t.Fatalf("colors = %v, want %v", asset.Colors, want)
	}
	persisted, ok, err := store.Get(asset.ID)
	if err != nil || !ok || !reflect.DeepEqual(persisted.Colors, want) {
		t.Fatalf("persisted colors = %v, ok=%v error=%v, want %v", persisted.Colors, ok, err, want)
	}
}

func TestListBackfillsImageDimensionsWithoutChangingIdentity(t *testing.T) {
	root := t.TempDir()
	store := newTestMediaAssets(t, filepath.Join(root, "app.db"), filepath.Join(root, "library"))
	asset, err := store.SaveReader(t.Context(), bytes.NewReader(encodeTestPNG(t, 17, 29)), "reference.png", "image/png", "")
	if err != nil {
		t.Fatal(err)
	}
	if err := store.repo.UpdateMediaAssetMetadata(asset.ID, map[string]any{"width": 0, "height": 0, "metadata_status": ""}); err != nil {
		t.Fatal(err)
	}
	asset, _, err = store.Get(asset.ID)
	if err != nil {
		t.Fatal(err)
	}
	assets, err := store.List("")
	if err != nil || len(assets) != 1 {
		t.Fatalf("List() = %#v, %v", assets, err)
	}
	backfilled := assets[0]
	if backfilled.Width != 17 || backfilled.Height != 29 || backfilled.MetadataStatus != MetadataStatusReady || len(backfilled.Colors) == 0 || backfilled.ID != asset.ID || backfilled.ContentHash != asset.ContentHash || backfilled.UpdatedAt != asset.UpdatedAt {
		t.Fatalf("backfilled image = %#v", backfilled)
	}
	for range 2 {
		listed, err := store.List("")
		if err != nil || !reflect.DeepEqual(listed, assets) {
			t.Fatalf("repeated list changed metadata: %#v, %v", listed, err)
		}
	}
}
