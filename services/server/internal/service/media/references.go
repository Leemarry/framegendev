package media

import (
	"fmt"
	"sort"
	"strings"

	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	"github.com/mediago-dev/mediago-drama/services/server/internal/repository"
	"github.com/mediago-dev/mediago-drama/services/server/internal/service/shared"
)

// MediaAssetReferenceSourceSelection marks a reference stored as a project
// creative selection ("选入资源").
const MediaAssetReferenceSourceSelection = "selection"

// MediaAssetReferenceSourceDocument marks a reference embedded in a document
// body as an inline markdown image.
const MediaAssetReferenceSourceDocument = "document"

// DocumentAssetReferenceSource reads document-body media asset usage for one
// project. It is satisfied by the document service and defined here, in the
// consumer, per Go interface convention.
type DocumentAssetReferenceSource interface {
	ListDocumentMediaAssetReferences(projectID string) ([]shared.DocumentMediaAssetReference, error)
}

// MediaAssetReference describes one project-level usage of a media asset.
type MediaAssetReference struct {
	ProjectID     string `json:"projectId"`
	ProjectName   string `json:"projectName"`
	DocumentID    string `json:"documentId,omitempty"`
	ResourceTitle string `json:"resourceTitle,omitempty"`
	ResourceType  string `json:"resourceType,omitempty"`
	Source        string `json:"source"`
	SortOrder     int    `json:"sortOrder"`
	CreatedAt     string `json:"createdAt"`
	UpdatedAt     string `json:"updatedAt"`
}

// MediaAssetReferencesResponse is the payload for media asset reference details.
type MediaAssetReferencesResponse struct {
	References []MediaAssetReference `json:"references"`
}

// ListAssetReferences returns the projects that still keep one media asset either
// through a stored creative selection ("选入资源") or as an inline image inside a
// document body. Document-body links are reported only when a document reader is
// wired; otherwise only selections are returned.
// A missing asset reports found=false so callers can answer 404 without guessing.
func (store *MediaAssets) ListAssetReferences(assetID string) (MediaAssetReferencesResponse, bool, error) {
	response := MediaAssetReferencesResponse{References: []MediaAssetReference{}}
	if store.initErr != nil {
		return response, false, store.initErr
	}
	assetID = strings.TrimSpace(assetID)
	if assetID == "" {
		return response, false, nil
	}

	selected, found, err := store.selectionAssetReferences(assetID)
	if err != nil {
		return response, false, err
	}
	if !found {
		return response, false, nil
	}
	documentRefs, err := store.documentAssetReferences(assetID)
	if err != nil {
		return response, false, err
	}

	references := selected
	references = append(references, documentRefs...)
	names, err := store.projectNamesForReferences(references)
	if err != nil {
		return response, false, err
	}
	for index := range references {
		references[index].ProjectName = names[references[index].ProjectID]
	}
	sort.SliceStable(references, func(i int, j int) bool {
		if references[i].ProjectID != references[j].ProjectID {
			return references[i].ProjectID < references[j].ProjectID
		}
		if references[i].SortOrder != references[j].SortOrder {
			return references[i].SortOrder < references[j].SortOrder
		}
		if references[i].Source != references[j].Source {
			return references[i].Source < references[j].Source
		}
		return references[i].DocumentID < references[j].DocumentID
	})

	response.References = references
	return response, true, nil
}

// selectionAssetReferences loads the stored project selections for one asset and
// reports whether the asset itself exists.
func (store *MediaAssets) selectionAssetReferences(assetID string) ([]MediaAssetReference, bool, error) {
	store.mu.RLock()
	defer store.mu.RUnlock()

	if _, err := store.repo.GetMediaAsset(assetID); err != nil {
		if repository.IsRecordNotFound(err) {
			return nil, false, nil
		}
		return nil, false, err
	}

	selected, err := store.repo.ListProjectSelectedAssetReferences(assetID)
	if err != nil {
		return nil, false, err
	}

	references := make([]MediaAssetReference, 0, len(selected))
	for _, model := range selected {
		references = append(references, MediaAssetReference{
			ProjectID:     model.ProjectID,
			ResourceTitle: domain.StringValue(model.ResourceTitle),
			ResourceType:  model.ResourceType,
			Source:        MediaAssetReferenceSourceSelection,
			SortOrder:     model.SortOrder,
			CreatedAt:     domain.StringFromTime(model.CreatedAt),
			UpdatedAt:     domain.StringFromTime(model.UpdatedAt),
		})
	}
	return references, true, nil
}

// documentAssetReferences scans each project's documents for the asset
// embedded as an inline markdown image. It is a no-op when the document reader
// is not wired.
func (store *MediaAssets) documentAssetReferences(assetID string) ([]MediaAssetReference, error) {
	if store.documentReferences == nil || store.workspaceRepo == nil {
		return nil, nil
	}
	projects, err := store.workspaceRepo.ListProjectsByStatus(repository.ProjectStatusAll)
	if err != nil {
		return nil, fmt.Errorf("listing projects for asset references: %w", err)
	}

	references := []MediaAssetReference{}
	for _, project := range projects {
		entries, err := store.documentReferences.ListDocumentMediaAssetReferences(project.ID)
		if err != nil {
			return nil, fmt.Errorf("scanning document references for project %s: %w", project.ID, err)
		}
		for _, entry := range entries {
			if entry.AssetID != assetID {
				continue
			}
			references = append(references, MediaAssetReference{
				ProjectID:     project.ID,
				DocumentID:    entry.DocumentID,
				ResourceTitle: entry.DocumentTitle,
				ResourceType:  entry.DocumentCategory,
				Source:        MediaAssetReferenceSourceDocument,
			})
		}
	}
	return references, nil
}

// projectNamesForReferences resolves display names once per distinct project.
func (store *MediaAssets) projectNamesForReferences(references []MediaAssetReference) (map[string]string, error) {
	names := make(map[string]string, len(references))
	if store.workspaceRepo == nil {
		return names, nil
	}
	for _, reference := range references {
		if _, resolved := names[reference.ProjectID]; resolved {
			continue
		}
		project, err := store.workspaceRepo.GetProject(reference.ProjectID)
		if err != nil {
			return nil, err
		}
		names[reference.ProjectID] = project.Name
	}
	return names, nil
}
