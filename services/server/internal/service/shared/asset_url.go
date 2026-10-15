package shared

import (
	"net/url"
	"strings"
)

// MediaAssetIDFromURL extracts a media asset ID from a media asset content URL.
// It accepts both the current `…/media-assets/<id>/content` shape and the legacy
// `…/media/assets/<id>/content` shape, with or without a host, and unescapes the
// ID segment. Anything else returns "".
func MediaAssetIDFromURL(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	parsed, err := url.Parse(value)
	if err != nil {
		return ""
	}
	segments := strings.Split(strings.Trim(parsed.EscapedPath(), "/"), "/")
	for index, segment := range segments {
		if segment == "media-assets" && index+2 < len(segments) && segments[index+2] == "content" {
			return unescapeAssetIDSegment(segments[index+1])
		}
		if segment == "media" && index+3 < len(segments) && segments[index+1] == "assets" && segments[index+3] == "content" {
			return unescapeAssetIDSegment(segments[index+2])
		}
	}
	return ""
}

func unescapeAssetIDSegment(segment string) string {
	id, err := url.PathUnescape(segment)
	if err != nil {
		return strings.TrimSpace(segment)
	}
	return strings.TrimSpace(id)
}

// DocumentMediaAssetReference reports one media asset embedded as an inline
// markdown image in a workspace document body.
type DocumentMediaAssetReference struct {
	DocumentID       string
	DocumentTitle    string
	DocumentCategory string
	AssetID          string
}
