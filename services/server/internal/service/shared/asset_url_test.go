package shared

import "testing"

func TestMediaAssetIDFromURLParsesSupportedShapes(t *testing.T) {
	cases := []struct {
		name  string
		value string
		want  string
	}{
		{"global content path", "/api/v1/media-assets/asset-a/content", "asset-a"},
		{"project content path", "/api/v1/projects/project-a/media-assets/asset-b/content", "asset-b"},
		{"legacy media assets path", "/api/media/assets/asset-c/content", "asset-c"},
		{"absolute host with encoded id", "http://127.0.0.1:48273/api/v1/media-assets/media%20a/content", "media a"},
		{"encoded slash stays one segment", "/api/v1/media-assets/media%2Fa/content", "media/a"},
		{"encoded percent decoded once", "/api/v1/media-assets/media%2520a/content", "media%20a"},
		{"relative without leading slash", "media-assets/asset-d/content", "asset-d"},
		{"poster is not content", "/api/v1/media-assets/asset-e/poster", ""},
		{"plain text", "just some text", ""},
		{"empty", "   ", ""},
	}
	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			if got := MediaAssetIDFromURL(testCase.value); got != testCase.want {
				t.Fatalf("MediaAssetIDFromURL(%q) = %q, want %q", testCase.value, got, testCase.want)
			}
		})
	}
}
