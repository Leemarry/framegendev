package handlers

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	httpresponse "github.com/mediago-dev/mediago-drama/services/server/internal/http/response"
	"github.com/mediago-dev/mediago-drama/services/server/internal/repository"
	"github.com/mediago-dev/mediago-drama/services/server/internal/service/media"
)

type assetCatalogPage struct {
	Items      []assetCatalogItem `json:"items"`
	NextCursor string             `json:"nextCursor,omitempty"`
	Revision   string             `json:"revision"`
}

type assetCatalogItem struct {
	media.MediaAsset
	Revision    string            `json:"revision"`
	Status      string            `json:"status"`
	StorageKind string            `json:"storageKind"`
	Scope       assetCatalogScope `json:"scope"`
}

type assetCatalogScope struct {
	Kind string `json:"kind"`
	ID   string `json:"id,omitempty"`
}

func toAssetCatalogItem(asset media.MediaAsset) assetCatalogItem {
	status, scope := "ready", assetCatalogScope{Kind: "global"}
	if asset.TrashedAt != "" {
		status = "trashed"
	} else if asset.StorageStatus == media.StorageStatusMissing {
		status = media.StorageStatusMissing
	}
	if asset.ProjectID != "" {
		scope = assetCatalogScope{Kind: "project", ID: asset.ProjectID}
	}
	return assetCatalogItem{
		MediaAsset:  asset,
		Revision:    asset.UpdatedAt,
		Status:      status,
		StorageKind: "local",
		Scope:       scope,
	}
}

type assetCatalogCursor struct {
	UpdatedAt string `json:"updatedAt"`
	ID        string `json:"id"`
}

// HandleAssetCatalogAssets godoc
// @Summary List asset-catalog assets
// @Description Returns a filtered cursor page of global or project media assets.
// @Tags Asset Catalog
// @Produce json
// @Param projectId query string false "Project ID"
// @Param cursor query string false "Opaque page cursor"
// @Param limit query int false "Page size (1-200)"
// @Param kind query string false "Media kind"
// @Param q query string false "Search text"
// @Param tag query string false "Tag"
// @Param folder query string false "Folder ID"
// @Param source query string false "Asset source"
// @Param favorite query boolean false "Favorites only"
// @Param minRating query int false "Minimum rating"
// @Param status query string false "Asset status"
// @Success 200 {object} SwaggerEnvelope
// @Failure 400 {object} SwaggerEnvelope
// @Failure 500 {object} SwaggerEnvelope
// @Router /api/v1/asset-catalog/assets [get]
func (handler MediaAssets) HandleAssetCatalogAssets(context *gin.Context) {
	limit := 100
	if raw := context.Query("limit"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed < 1 || parsed > 200 {
			httpresponse.Error(context, http.StatusBadRequest, "invalid limit")
			return
		}
		limit = parsed
	}

	var cursor assetCatalogCursor
	if raw := context.Query("cursor"); raw != "" {
		decoded, err := base64.RawURLEncoding.DecodeString(raw)
		if err != nil || json.Unmarshal(decoded, &cursor) != nil || cursor.ID == "" || cursor.UpdatedAt == "" {
			httpresponse.Error(context, http.StatusBadRequest, "invalid cursor")
			return
		}
		if _, err := time.Parse(time.RFC3339Nano, cursor.UpdatedAt); err != nil {
			httpresponse.Error(context, http.StatusBadRequest, "invalid cursor")
			return
		}
	}

	var minRating *int
	if raw := context.Query("minRating"); raw != "" {
		value, err := strconv.Atoi(raw)
		if err != nil || value < 0 || value > 5 {
			httpresponse.Error(context, http.StatusBadRequest, "invalid minRating")
			return
		}
		minRating = &value
	}
	favorite := false
	if raw := context.Query("favorite"); raw != "" {
		var err error
		favorite, err = strconv.ParseBool(raw)
		if err != nil {
			httpresponse.Error(context, http.StatusBadRequest, "invalid favorite")
			return
		}
	}
	assets, revision, err := handler.service.ListCatalogPage(repository.AssetCatalogPageQuery{
		ProjectID: optionalProjectID(context),
		CursorAt:  cursor.UpdatedAt,
		CursorID:  cursor.ID,
		Kind:      context.Query("kind"),
		Query:     strings.ToLower(strings.TrimSpace(context.Query("q"))),
		Tag:       strings.TrimSpace(context.Query("tag")),
		FolderID:  context.Query("folder"),
		Source:    context.Query("source"),
		MinRating: minRating,
		Favorite:  favorite,
		Trashed:   context.Query("status") == "trashed",
		Limit:     limit + 1,
	})
	if err != nil {
		httpresponse.Fail(context, http.StatusInternalServerError, "internal error", err)
		return
	}

	page := assetCatalogPage{Revision: revision}
	if len(assets) > limit {
		last := assets[limit-1]
		encoded, _ := json.Marshal(assetCatalogCursor{UpdatedAt: last.UpdatedAt, ID: last.ID})
		page.NextCursor = base64.RawURLEncoding.EncodeToString(encoded)
		assets = assets[:limit]
	}
	page.Items = make([]assetCatalogItem, 0, len(assets))
	for _, asset := range assets {
		page.Items = append(page.Items, toAssetCatalogItem(asset))
	}
	httpresponse.OK(context, page)
}

// HandleGetAssetCatalogAsset godoc
// @Summary Get one asset-catalog asset
// @Tags Asset Catalog
// @Produce json
// @Param assetId path string true "Asset ID"
// @Param projectId query string false "Project ID"
// @Success 200 {object} SwaggerEnvelope
// @Failure 404 {object} SwaggerEnvelope
// @Failure 500 {object} SwaggerEnvelope
// @Router /api/v1/asset-catalog/assets/{assetId} [get]
func (handler MediaAssets) HandleGetAssetCatalogAsset(context *gin.Context) {
	asset, found, err := handler.service.GetCatalog(strings.TrimSpace(context.Param("assetId")), optionalProjectID(context))
	if err != nil {
		httpresponse.Fail(context, http.StatusInternalServerError, "internal error", err)
		return
	}
	if !found {
		httpresponse.Error(context, http.StatusNotFound, "media asset not found")
		return
	}
	httpresponse.OK(context, toAssetCatalogItem(asset))
}

// HandlePatchAssetCatalogAsset godoc
// @Summary Update asset-catalog metadata
// @Description Updates one asset only when expectedRevision matches; operationId makes retries idempotent.
// @Tags Asset Catalog
// @Accept json
// @Produce json
// @Param assetId path string true "Asset ID"
// @Param projectId query string false "Project ID"
// @Param payload body SwaggerObject true "Metadata and mutation tokens"
// @Success 200 {object} SwaggerEnvelope
// @Failure 400 {object} SwaggerEnvelope
// @Failure 404 {object} SwaggerEnvelope
// @Failure 409 {object} SwaggerEnvelope
// @Failure 500 {object} SwaggerEnvelope
// @Router /api/v1/asset-catalog/assets/{assetId} [patch]
func (handler MediaAssets) HandlePatchAssetCatalogAsset(context *gin.Context) {
	id := strings.TrimSpace(context.Param("assetId"))
	if id == "" {
		httpresponse.Error(context, http.StatusBadRequest, "asset id is required")
		return
	}
	request, err := decodeJSON[media.AssetCatalogUpdateRequest](context)
	if err != nil {
		httpresponse.ErrorFromStatus(context, http.StatusBadRequest, err)
		return
	}
	asset, found, err := handler.service.UpdateCatalog(id, optionalProjectID(context), request)
	if err != nil {
		switch {
		case errors.Is(err, media.ErrAssetCatalogRevisionConflict):
			httpresponse.ErrorFromStatus(context, http.StatusConflict, err)
		case errors.Is(err, media.ErrInvalidAssetCatalogMutation), errors.Is(err, media.ErrInvalidMediaAssetUpdate):
			httpresponse.ErrorFromStatus(context, http.StatusBadRequest, err)
		case errors.Is(err, media.ErrLibraryFolderNotFound):
			httpresponse.ErrorFromStatus(context, http.StatusNotFound, err)
		default:
			httpresponse.Fail(context, http.StatusInternalServerError, "internal error", err)
		}
		return
	}
	if !found {
		httpresponse.Error(context, http.StatusNotFound, "media asset not found")
		return
	}
	httpresponse.OK(context, asset)
}

// HandleDeleteAssetCatalogAsset godoc
// @Summary Permanently delete an asset-catalog asset
// @Tags Asset Catalog
// @Accept json
// @Produce json
// @Param assetId path string true "Asset ID"
// @Param projectId query string false "Project ID"
// @Param payload body SwaggerObject true "Mutation tokens"
// @Success 200 {object} SwaggerEnvelope
// @Failure 400 {object} SwaggerEnvelope
// @Failure 404 {object} SwaggerEnvelope
// @Failure 409 {object} SwaggerEnvelope
// @Failure 500 {object} SwaggerEnvelope
// @Router /api/v1/asset-catalog/assets/{assetId} [delete]
func (handler MediaAssets) HandleDeleteAssetCatalogAsset(context *gin.Context) {
	request, err := decodeJSON[media.AssetCatalogMutationRequest](context)
	if err != nil {
		httpresponse.ErrorFromStatus(context, http.StatusBadRequest, err)
		return
	}
	deleted, found, err := handler.service.DeleteCatalog(strings.TrimSpace(context.Param("assetId")), optionalProjectID(context), request)
	if err != nil {
		handleAssetCatalogMutationError(context, err)
		return
	}
	if !found {
		httpresponse.Error(context, http.StatusNotFound, "media asset not found")
		return
	}
	httpresponse.OK(context, gin.H{"deleted": deleted})
}

// HandleRestoreAssetCatalogAsset restores one trashed catalog asset.
// @Summary Restore an asset-catalog asset
// @Tags Asset Catalog
// @Accept json
// @Produce json
// @Param assetId path string true "Asset ID"
// @Param projectId query string false "Project ID"
// @Param payload body SwaggerObject true "Mutation tokens"
// @Success 200 {object} SwaggerEnvelope
// @Failure 400 {object} SwaggerEnvelope
// @Failure 404 {object} SwaggerEnvelope
// @Failure 409 {object} SwaggerEnvelope
// @Failure 500 {object} SwaggerEnvelope
// @Router /api/v1/asset-catalog/assets/{assetId}/restore [post]
func (handler MediaAssets) HandleRestoreAssetCatalogAsset(context *gin.Context) {
	request, err := decodeJSON[media.AssetCatalogMutationRequest](context)
	if err != nil {
		httpresponse.ErrorFromStatus(context, http.StatusBadRequest, err)
		return
	}
	asset, found, err := handler.service.RestoreCatalog(strings.TrimSpace(context.Param("assetId")), optionalProjectID(context), request)
	if err != nil {
		handleAssetCatalogMutationError(context, err)
		return
	}
	if !found {
		httpresponse.Error(context, http.StatusNotFound, "media asset not found")
		return
	}
	httpresponse.OK(context, asset)
}

// HandleCopyAssetCatalogAsset copies one catalog asset into a project.
// @Summary Copy an asset-catalog asset into a project
// @Tags Asset Catalog
// @Accept json
// @Produce json
// @Param assetId path string true "Asset ID"
// @Param projectId query string false "Source project ID"
// @Param payload body SwaggerObject true "Target project and operation ID"
// @Success 200 {object} SwaggerEnvelope
// @Failure 400 {object} SwaggerEnvelope
// @Failure 404 {object} SwaggerEnvelope
// @Failure 500 {object} SwaggerEnvelope
// @Router /api/v1/asset-catalog/assets/{assetId}/copy-to-project [post]
func (handler MediaAssets) HandleCopyAssetCatalogAsset(context *gin.Context) {
	request, err := decodeJSON[media.AssetCatalogCopyRequest](context)
	if err != nil {
		httpresponse.ErrorFromStatus(context, http.StatusBadRequest, err)
		return
	}
	asset, found, err := handler.service.CopyCatalogAsset(
		strings.TrimSpace(context.Param("assetId")),
		optionalProjectID(context),
		request,
	)
	if err != nil {
		if errors.Is(err, media.ErrInvalidAssetCatalogMutation) {
			httpresponse.ErrorFromStatus(context, http.StatusBadRequest, err)
		} else {
			httpresponse.Fail(context, http.StatusInternalServerError, "internal error", err)
		}
		return
	}
	if !found {
		httpresponse.Error(context, http.StatusNotFound, "media asset not found")
		return
	}
	httpresponse.OK(context, asset)
}

func handleAssetCatalogMutationError(context *gin.Context, err error) {
	switch {
	case errors.Is(err, media.ErrAssetCatalogRevisionConflict):
		httpresponse.ErrorFromStatus(context, http.StatusConflict, err)
	case errors.Is(err, media.ErrInvalidAssetCatalogMutation), errors.Is(err, media.ErrInvalidMediaAssetUpdate):
		httpresponse.ErrorFromStatus(context, http.StatusBadRequest, err)
	case errors.Is(err, media.ErrLibraryFolderNotFound):
		httpresponse.ErrorFromStatus(context, http.StatusNotFound, err)
	default:
		httpresponse.Fail(context, http.StatusInternalServerError, "internal error", err)
	}
}
