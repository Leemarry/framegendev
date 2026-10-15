package document

import (
	"fmt"
	"sort"
	"strings"

	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	serviceshared "github.com/mediago-dev/mediago-drama/services/server/internal/service/shared"
	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/ast"
	"github.com/yuin/goldmark/text"
)

// ListDocumentMediaAssetReferences returns every media asset embedded as an
// inline markdown image in one project's regular workspace documents. It is a
// read-only scan used to report real asset usage; it never mutates documents.
// Results are de-duplicated per (document, asset) and sorted by document ID
// then asset ID.
func (store *Service) ListDocumentMediaAssetReferences(projectID string) ([]serviceshared.DocumentMediaAssetReference, error) {
	if err := store.requireReady(); err != nil {
		return nil, err
	}
	projectID = domain.CleanProjectID(projectID)
	if projectID == "" {
		return nil, fmt.Errorf("projectId is required")
	}

	state, err := store.load(projectID)
	if err != nil {
		return nil, err
	}

	references := []serviceshared.DocumentMediaAssetReference{}
	for _, document := range RegularWorkspaceDocuments(state.Documents) {
		seen := map[string]bool{}
		content := []byte(document.Content)
		root := goldmark.DefaultParser().Parse(text.NewReader(content))
		if err := ast.Walk(root, func(node ast.Node, entering bool) (ast.WalkStatus, error) {
			image, ok := node.(*ast.Image)
			if !entering || !ok {
				return ast.WalkContinue, nil
			}
			var alt strings.Builder
			for child := image.FirstChild(); child != nil; child = child.NextSibling() {
				if value, ok := child.(*ast.Text); ok {
					alt.Write(value.Value(content))
				}
			}
			if isDocumentPlaceholderImage(alt.String(), string(image.Destination)) {
				return ast.WalkContinue, nil
			}
			assetID := serviceshared.MediaAssetIDFromURL(string(image.Destination))
			if assetID == "" || seen[assetID] {
				return ast.WalkContinue, nil
			}
			seen[assetID] = true
			references = append(references, serviceshared.DocumentMediaAssetReference{
				DocumentID:       document.ID,
				DocumentTitle:    strings.TrimSpace(document.Title),
				DocumentCategory: NormalizeDocumentCategoryValue(document.Category),
				AssetID:          assetID,
			})
			return ast.WalkContinue, nil
		}); err != nil {
			return nil, fmt.Errorf("reading document image references: %w", err)
		}
	}

	sort.SliceStable(references, func(i int, j int) bool {
		if references[i].DocumentID != references[j].DocumentID {
			return references[i].DocumentID < references[j].DocumentID
		}
		return references[i].AssetID < references[j].AssetID
	})
	return references, nil
}

// isDocumentPlaceholderImage reports placeholder images that must not count as
// real asset references.
func isDocumentPlaceholderImage(alt string, source string) bool {
	return workspacePlaceholderAltPattern.MatchString(alt) ||
		strings.HasPrefix(source, "data:image/svg+xml")
}
