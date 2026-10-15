package media

import (
	"sort"
	"strings"

	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	"github.com/mediago-dev/mediago-drama/services/server/internal/repository"
)

// MediaAssetReference describes one project-level usage of a media asset.
type MediaAssetReference struct {
	ProjectID     string `json:"projectId"`
	ProjectName   string `json:"projectName"`
	ResourceTitle string `json:"resourceTitle,omitempty"`
	ResourceType  string `json:"resourceType,omitempty"`
	SortOrder     int    `json:"sortOrder"`
	CreatedAt     string `json:"createdAt"`
	UpdatedAt     string `json:"updatedAt"`
}

// MediaAssetReferencesResponse is the payload for media asset reference details.
type MediaAssetReferencesResponse struct {
	References []MediaAssetReference `json:"references"`
}

// ListAssetReferences returns the projects that still keep one media asset
// through a stored creative selection ("选入资源").
// A missing asset reports found=false so callers can answer 404 without guessing.
// Only stored project selections are reported; document body links are out of scope.
func (store *MediaAssets) ListAssetReferences(assetID string) (MediaAssetReferencesResponse, bool, error) {
	response := MediaAssetReferencesResponse{References: []MediaAssetReference{}}
	if store.initErr != nil {
		return response, false, store.initErr
	}
	assetID = strings.TrimSpace(assetID)
	if assetID == "" {
		return response, false, nil
	}

	store.mu.RLock()
	defer store.mu.RUnlock()

	if _, err := store.repo.GetMediaAsset(assetID); err != nil {
		if repository.IsRecordNotFound(err) {
			return response, false, nil
		}
		return response, false, err
	}

	selected, err := store.repo.ListProjectSelectedAssetReferences(assetID)
	if err != nil {
		return response, false, err
	}

	references := make([]MediaAssetReference, 0, len(selected))
	for _, model := range selected {
		references = append(references, MediaAssetReference{
			ProjectID:     model.ProjectID,
			ResourceTitle: domain.StringValue(model.ResourceTitle),
			ResourceType:  model.ResourceType,
			SortOrder:     model.SortOrder,
			CreatedAt:     domain.StringFromTime(model.CreatedAt),
			UpdatedAt:     domain.StringFromTime(model.UpdatedAt),
		})
	}

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
		return references[i].SortOrder < references[j].SortOrder
	})

	response.References = references
	return response, true, nil
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
