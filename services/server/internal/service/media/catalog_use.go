package media

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	"github.com/mediago-dev/mediago-drama/services/server/internal/repository"
	"github.com/mediago-dev/mediago-drama/services/server/internal/service/shared"
)

// ErrAssetCatalogUseInvalid reports a malformed use-for-creation request.
var ErrAssetCatalogUseInvalid = errors.New("invalid asset catalog use request")

// ErrCatalogSectionNotFound reports a target section that the project does not have.
var ErrCatalogSectionNotFound = errors.New("asset catalog target section not found")

// AssetCatalogUseTarget binds the saved assets to one document section.
type AssetCatalogUseTarget struct {
	DocumentID string `json:"documentId"`
	SectionID  string `json:"sectionId"`
}

// AssetCatalogUseRequest is the official POST /asset-catalog/use payload.
type AssetCatalogUseRequest struct {
	OperationID     string                 `json:"operationId"`
	SourceProjectID string                 `json:"sourceProjectId"`
	ProjectID       string                 `json:"projectId"`
	Target          *AssetCatalogUseTarget `json:"target,omitempty"`
	AssetIDs        []string               `json:"assetIds"`
}

// AssetCatalogUseItem reports the outcome of one requested asset.
type AssetCatalogUseItem struct {
	SourceID string `json:"sourceId"`
	AssetID  string `json:"assetId,omitempty"`
	Added    bool   `json:"added"`
	Error    string `json:"error,omitempty"`
}

// AssetCatalogUseResponse mirrors the official per-item result envelope.
type AssetCatalogUseResponse struct {
	Items []AssetCatalogUseItem `json:"items"`
}

// UseForCreation saves the requested assets into the target project library and
// optionally adds them to one section's candidate list. The operation ID makes
// retries idempotent: a replay returns the first response instead of copying
// the assets twice.
func (store *MediaAssets) UseForCreation(ctx context.Context, request AssetCatalogUseRequest) (AssetCatalogUseResponse, error) {
	if store.initErr != nil {
		return AssetCatalogUseResponse{}, store.initErr
	}

	request.OperationID = strings.TrimSpace(request.OperationID)
	request.SourceProjectID = domain.CleanProjectID(request.SourceProjectID)
	request.ProjectID = domain.CleanProjectID(request.ProjectID)
	if request.OperationID == "" {
		return AssetCatalogUseResponse{}, fmt.Errorf("%w: operationId is required", ErrAssetCatalogUseInvalid)
	}
	if request.ProjectID == "" {
		return AssetCatalogUseResponse{}, fmt.Errorf("%w: projectId is required", ErrAssetCatalogUseInvalid)
	}
	assetIDs := catalogUseAssetIDs(request.AssetIDs)
	if len(assetIDs) == 0 {
		return AssetCatalogUseResponse{}, fmt.Errorf("%w: assetIds is required", ErrAssetCatalogUseInvalid)
	}

	if cached, ok, err := store.replayCatalogUse(request.OperationID); err != nil {
		return AssetCatalogUseResponse{}, err
	} else if ok {
		return cached, nil
	}

	target, err := store.resolveCatalogUseTarget(request)
	if err != nil {
		return AssetCatalogUseResponse{}, err
	}

	items := make([]AssetCatalogUseItem, 0, len(assetIDs))
	for _, assetID := range assetIDs {
		items = append(items, store.useOneAsset(ctx, request, target, assetID))
	}

	response := AssetCatalogUseResponse{Items: items}
	if err := store.recordCatalogUse(request.OperationID, response); err != nil {
		return AssetCatalogUseResponse{}, err
	}
	return response, nil
}

type catalogUseSection struct {
	documentID   string
	sectionID    string
	title        string
	resourceType string
}

// resolveCatalogUseTarget validates the optional section binding once per request.
func (store *MediaAssets) resolveCatalogUseTarget(request AssetCatalogUseRequest) (*catalogUseSection, error) {
	if request.Target == nil {
		return nil, nil
	}
	documentID := strings.TrimSpace(request.Target.DocumentID)
	sectionID := strings.TrimSpace(request.Target.SectionID)
	if documentID == "" || sectionID == "" {
		return nil, fmt.Errorf("%w: target needs documentId and sectionId", ErrAssetCatalogUseInvalid)
	}

	section, err := store.repo.GetDocumentSection(request.ProjectID, documentID, sectionID)
	if repository.IsRecordNotFound(err) {
		return nil, fmt.Errorf("%w: %s", ErrCatalogSectionNotFound, sectionID)
	}
	if err != nil {
		return nil, err
	}

	resourceType := strings.TrimSpace(section.Type)
	if !isGenerationCandidateResourceType(resourceType) {
		return nil, fmt.Errorf("%w: section %s is not a creative section", ErrAssetCatalogUseInvalid, sectionID)
	}
	return &catalogUseSection{
		documentID:   documentID,
		sectionID:    sectionID,
		title:        firstNonEmpty(section.Title, section.ObservedTitle),
		resourceType: resourceType,
	}, nil
}

// useOneAsset saves one asset and reports its per-item outcome. Item errors stay
// inside the response so one bad asset never fails the whole batch.
func (store *MediaAssets) useOneAsset(ctx context.Context, request AssetCatalogUseRequest, target *catalogUseSection, assetID string) AssetCatalogUseItem {
	item := AssetCatalogUseItem{SourceID: assetID}

	asset, found, err := store.Get(assetID)
	if err != nil {
		item.Error = err.Error()
		return item
	}
	if !found || asset.TrashedAt != "" {
		item.Error = "素材不存在或已移入回收站"
		return item
	}
	if request.SourceProjectID != "" && asset.ProjectID != request.SourceProjectID {
		item.Error = "素材不属于来源项目"
		return item
	}

	saved, err := store.copyAssetIntoProject(asset, request.ProjectID)
	if err != nil {
		item.Error = err.Error()
		return item
	}
	item.AssetID = saved.ID

	if target == nil || !isGenerationCandidateKind(saved.Kind) {
		return item
	}
	if err := store.addCatalogUseCandidate(request.ProjectID, target, saved); err != nil {
		item.Error = err.Error()
		return item
	}
	item.Added = true
	return item
}

// copyAssetIntoProject makes one asset available in the target project library.
// Assets that already live there, or whose content is already present, are
// reused instead of duplicated.
func (store *MediaAssets) copyAssetIntoProject(asset MediaAsset, projectID string) (MediaAsset, error) {
	if asset.ProjectID == projectID {
		return asset, nil
	}

	if existing, ok, err := store.findProjectAssetByContent(asset.ContentHash, asset.Kind, projectID); err != nil {
		return MediaAsset{}, err
	} else if ok {
		return existing, nil
	}

	filePath := strings.TrimSpace(asset.FilePath)
	if filePath == "" {
		return MediaAsset{}, fmt.Errorf("素材没有可用的本地文件")
	}
	data, err := os.ReadFile(filePath)
	if err != nil {
		return MediaAsset{}, fmt.Errorf("读取素材文件失败：%w", err)
	}

	return store.saveBytesWithKind(data, asset.Kind, asset.Filename, asset.MIMEType, asset.SourceURL, MediaAssetSaveOptions{
		ProjectID: projectID,
		Source:    MediaSourceImported,
	})
}

// findProjectAssetByContent returns a visible asset of the target project with
// identical content.
func (store *MediaAssets) findProjectAssetByContent(contentHash string, kind string, projectID string) (MediaAsset, bool, error) {
	if strings.TrimSpace(contentHash) == "" {
		return MediaAsset{}, false, nil
	}

	model, err := store.repo.FindMediaAssetByContentHashKindInScope(contentHash, kind, projectID)
	if repository.IsRecordNotFound(err) {
		return MediaAsset{}, false, nil
	}
	if err != nil {
		return MediaAsset{}, false, err
	}
	return store.mediaAssetRecordFromModel(model), true, nil
}

// addCatalogUseCandidate puts a saved image or video into the section candidate list.
func (store *MediaAssets) addCatalogUseCandidate(projectID string, target *catalogUseSection, asset MediaAsset) error {
	id, err := shared.RandomID("selected")
	if err != nil {
		return err
	}
	sourceType := MediaSourceImported
	documentID := target.documentID
	sectionID := target.sectionID
	title := target.title
	_, err = store.repo.EnsureProjectSelectedAssetCandidate(domain.ProjectSelectedAssetModel{
		ID:               id,
		ProjectID:        projectID,
		ResourceType:     target.resourceType,
		ResourceID:       &sectionID,
		ResourceTitle:    &title,
		AssetID:          asset.ID,
		SourceType:       &sourceType,
		SourceDocumentID: &documentID,
	})
	if err != nil {
		return fmt.Errorf("加入章节候选失败：%w", err)
	}
	return nil
}

// replayCatalogUse returns a stored response for one operation ID.
func (store *MediaAssets) replayCatalogUse(operationID string) (AssetCatalogUseResponse, bool, error) {
	model, err := store.repo.GetAssetCatalogOperation(operationID)
	if repository.IsRecordNotFound(err) {
		return AssetCatalogUseResponse{}, false, nil
	}
	if err != nil {
		return AssetCatalogUseResponse{}, false, err
	}
	if strings.TrimSpace(model.ResponseJSON) == "" {
		return AssetCatalogUseResponse{}, false, nil
	}

	response := AssetCatalogUseResponse{}
	if err := json.Unmarshal([]byte(model.ResponseJSON), &response); err != nil {
		return AssetCatalogUseResponse{}, false, fmt.Errorf("decoding asset catalog operation: %w", err)
	}
	return response, true, nil
}

// recordCatalogUse stores the response so a retry can replay it.
func (store *MediaAssets) recordCatalogUse(operationID string, response AssetCatalogUseResponse) error {
	payload, err := json.Marshal(response)
	if err != nil {
		return fmt.Errorf("encoding asset catalog operation: %w", err)
	}
	id, err := shared.RandomID("op")
	if err != nil {
		return err
	}
	return store.repo.CreateAssetCatalogOperation(domain.AssetCatalogOperationModel{
		ID:           id,
		OperationID:  operationID,
		ResponseJSON: string(payload),
	})
}

// catalogUseAssetIDs trims and de-duplicates the requested asset IDs.
func catalogUseAssetIDs(ids []string) []string {
	seen := make(map[string]struct{}, len(ids))
	result := make([]string, 0, len(ids))
	for _, id := range ids {
		trimmed := strings.TrimSpace(id)
		if trimmed == "" {
			continue
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		result = append(result, trimmed)
	}
	return result
}

func isGenerationCandidateKind(kind string) bool {
	return kind == MediaKindImage || kind == MediaKindVideo
}

func isGenerationCandidateResourceType(value string) bool {
	switch value {
	case "character", "scene", "storyboard", "prop":
		return true
	default:
		return false
	}
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}
