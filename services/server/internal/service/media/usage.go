package media

import (
	"context"
	"errors"
	"fmt"

	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	"github.com/mediago-dev/mediago-drama/services/server/internal/repository"
	"github.com/mediago-dev/mediago-drama/services/server/internal/service/shared"
)

// ListWithUsage projects durable usage without modifying media or production records.
func (store *MediaAssets) ListWithUsage(ctx context.Context, projectID string) ([]MediaAsset, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	assets, err := store.List(projectID)
	if err != nil || len(assets) == 0 {
		return assets, err
	}
	if store.documentReferences == nil || store.workspaceRepo == nil {
		return nil, errors.New("media usage document reader unavailable")
	}
	rows, err := store.repo.ListMediaAssetUsage(ctx, projectID)
	if err != nil {
		return nil, err
	}
	usage := make(map[string]*domain.MediaAssetUsage, len(rows))
	for _, row := range rows {
		usage[row.AssetID] = &row
	}
	inputs, err := store.repo.ListMediaUsageInputs(ctx, projectID)
	if err != nil {
		return nil, err
	}
	for _, input := range inputs {
		for _, id := range []string{domain.StringValue(input.AssetID), shared.MediaAssetIDFromURL(domain.StringValue(input.URL))} {
			if entry := usage[id]; entry != nil {
				entry.Reference = true
			}
		}
	}
	projectIDs := []string{domain.CleanProjectID(projectID)}
	if projectIDs[0] == "" {
		projects, err := store.workspaceRepo.ListProjectsByStatus(repository.ProjectStatusAll)
		if err != nil {
			return nil, fmt.Errorf("listing projects for media usage: %w", err)
		}
		projectIDs = nil
		for _, project := range projects {
			projectIDs = append(projectIDs, project.ID)
		}
	}
	for _, id := range projectIDs {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		references, err := store.documentReferences.ListDocumentMediaAssetReferences(id)
		if err != nil {
			return nil, fmt.Errorf("reading documents for media usage: %w", err)
		}
		for _, reference := range references {
			if entry := usage[reference.AssetID]; entry != nil {
				entry.Reference = true
			}
		}
	}
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	for index := range assets {
		assets[index].Usage = usage[assets[index].ID]
	}
	return assets, nil
}
