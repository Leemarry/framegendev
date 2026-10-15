package generation

import (
	"path/filepath"
	"reflect"
	"testing"

	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
)

func TestGenerationAssetDownloadPathConfiguredRoots(t *testing.T) {
	root, mediaDir, projectDir := t.TempDir(), t.TempDir(), t.TempDir()
	options := GenerationTaskPaths{WorkspaceRoot: root}
	for _, tc := range []struct {
		name    string
		asset   domain.AssetModel
		options GenerationTaskPaths
		want    string
	}{
		{"global", domain.AssetModel{RelPath: "library/day/image.png"}, options, filepath.Join(root, "library", "day", "image.png")},
		{"custom media directory", domain.AssetModel{RelPath: "library/day/image.png"}, GenerationTaskPaths{WorkspaceRoot: root, MediaDir: mediaDir}, filepath.Join(mediaDir, "day", "image.png")},
		{"legacy root relative", domain.AssetModel{RelPath: ".mediago-drama/library/image.png"}, GenerationTaskPaths{WorkspaceRoot: root, MediaDir: mediaDir}, filepath.Join(root, ".mediago-drama", "library", "image.png")},
		{"absolute", domain.AssetModel{RelPath: filepath.Join(mediaDir, "image.png")}, options, filepath.Join(mediaDir, "image.png")},
		{"empty", domain.AssetModel{}, options, ""},
		{"project directory", domain.AssetModel{ProjectID: domain.StringPtr("p"), Project: &domain.WorkspaceProjectModel{ProjectDir: projectDir}, RelPath: "library/image.png"}, options, filepath.Join(projectDir, "library", "image.png")},
		{"project relative fallback", domain.AssetModel{ProjectID: domain.StringPtr("p"), Project: &domain.WorkspaceProjectModel{RelativeDir: "projects/p"}, RelPath: "library/image.png"}, options, filepath.Join(root, "projects", "p", "library", "image.png")},
		{"project missing directory", domain.AssetModel{ProjectID: domain.StringPtr("p"), Project: &domain.WorkspaceProjectModel{}, RelPath: "library/image.png"}, options, ""},
	} {
		t.Run(tc.name, func(t *testing.T) {
			before := tc.asset
			if got := generationAssetDownloadPath(tc.asset, tc.options); got != tc.want {
				t.Errorf("path=%q want=%q", got, tc.want)
			}
			if !reflect.DeepEqual(before, tc.asset) {
				t.Fatal("path projection changed its source model")
			}
		})
	}
}
