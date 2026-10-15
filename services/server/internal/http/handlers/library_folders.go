package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/mediago-dev/mediago-drama/services/server/internal/domain"
	httpresponse "github.com/mediago-dev/mediago-drama/services/server/internal/http/response"
	service "github.com/mediago-dev/mediago-drama/services/server/internal/service/media"
)

// LibraryFolderRenameRequest changes only a logical folder's display name.
type LibraryFolderRenameRequest struct {
	Name string `json:"name"`
}

func libraryFolderFailure(c *gin.Context, err error) {
	status := http.StatusInternalServerError
	if errors.Is(err, service.ErrInvalidMediaAssetUpdate) {
		status = http.StatusBadRequest
	}
	if errors.Is(err, service.ErrLibraryFolderNotFound) {
		status = http.StatusNotFound
	}
	if errors.Is(err, service.ErrLibraryFolderNotEmpty) {
		status = http.StatusConflict
	}
	httpresponse.ErrorFromStatus(c, status, err)
}

// HandleLibraryFolders godoc
// @Summary List logical media folders in exactly one scope
// @Tags Media Assets
// @Produce json
// @Success 200 {object} SwaggerEnvelope
// @Failure 404 {object} SwaggerEnvelope
// @Failure 500 {object} SwaggerEnvelope
// @Router /api/v1/asset-library-folders [get]
func (handler MediaAssets) HandleLibraryFolders(c *gin.Context) {
	folders, err := handler.service.ListLibraryFolders(c.Request.Context(), optionalProjectID(c))
	if err != nil {
		libraryFolderFailure(c, err)
		return
	}
	httpresponse.OK(c, struct {
		Folders []domain.AssetLibraryFolderModel `json:"folders"`
	}{folders})
}

// HandleCreateLibraryFolder godoc
// @Summary Create a logical media folder
// @Tags Media Assets
// @Accept json
// @Produce json
// @Param payload body SwaggerObject true "Name and optional parentId"
// @Success 200 {object} SwaggerEnvelope
// @Failure 400 {object} SwaggerEnvelope
// @Failure 404 {object} SwaggerEnvelope
// @Failure 500 {object} SwaggerEnvelope
// @Router /api/v1/asset-library-folders [post]
func (handler MediaAssets) HandleCreateLibraryFolder(c *gin.Context) {
	payload, err := decodeJSON[service.LibraryFolderRequest](c)
	if err != nil {
		httpresponse.ErrorFromStatus(c, http.StatusBadRequest, err)
		return
	}
	folder, err := handler.service.CreateLibraryFolder(c.Request.Context(), optionalProjectID(c), payload)
	if err != nil {
		libraryFolderFailure(c, err)
		return
	}
	httpresponse.OK(c, folder)
}

// HandleRenameLibraryFolder godoc
// @Summary Rename a logical media folder
// @Tags Media Assets
// @Accept json
// @Produce json
// @Param folderId path string true "Folder ID"
// @Param payload body LibraryFolderRenameRequest true "Name; parentId cannot be changed"
// @Success 200 {object} SwaggerEnvelope
// @Failure 400 {object} SwaggerEnvelope
// @Failure 404 {object} SwaggerEnvelope
// @Failure 500 {object} SwaggerEnvelope
// @Router /api/v1/asset-library-folders/{folderId} [put]
func (handler MediaAssets) HandleRenameLibraryFolder(c *gin.Context) {
	payload, err := decodeJSON[LibraryFolderRenameRequest](c)
	if err != nil {
		httpresponse.ErrorFromStatus(c, http.StatusBadRequest, err)
		return
	}
	folder, err := handler.service.RenameLibraryFolder(c.Request.Context(), optionalProjectID(c), c.Param("folderId"), payload.Name)
	if err != nil {
		libraryFolderFailure(c, err)
		return
	}
	httpresponse.OK(c, folder)
}

// HandleDeleteLibraryFolder godoc
// @Summary Delete an empty logical media folder
// @Tags Media Assets
// @Produce json
// @Param folderId path string true "Folder ID"
// @Success 200 {object} SwaggerEnvelope
// @Failure 404 {object} SwaggerEnvelope
// @Failure 409 {object} SwaggerEnvelope
// @Failure 500 {object} SwaggerEnvelope
// @Router /api/v1/asset-library-folders/{folderId} [delete]
func (handler MediaAssets) HandleDeleteLibraryFolder(c *gin.Context) {
	if err := handler.service.DeleteLibraryFolder(c.Request.Context(), optionalProjectID(c), c.Param("folderId")); err != nil {
		libraryFolderFailure(c, err)
		return
	}
	httpresponse.OK(c, struct{}{})
}

// HandleProjectLibraryFolders godoc
// @Summary List logical project media folders
// @Tags Media Assets
// @Produce json
// @Param projectId path string true "Project ID"
// @Success 200 {object} SwaggerEnvelope
// @Failure 404 {object} SwaggerEnvelope
// @Failure 500 {object} SwaggerEnvelope
// @Router /api/v1/projects/{projectId}/asset-library-folders [get]
func (handler MediaAssets) HandleProjectLibraryFolders(c *gin.Context) {
	handler.HandleLibraryFolders(c)
}

// HandleCreateProjectLibraryFolder godoc
// @Summary Create a logical project media folder
// @Tags Media Assets
// @Accept json
// @Produce json
// @Param projectId path string true "Project ID"
// @Param payload body SwaggerObject true "Name and optional parentId"
// @Success 200 {object} SwaggerEnvelope
// @Failure 400 {object} SwaggerEnvelope
// @Failure 404 {object} SwaggerEnvelope
// @Failure 500 {object} SwaggerEnvelope
// @Router /api/v1/projects/{projectId}/asset-library-folders [post]
func (handler MediaAssets) HandleCreateProjectLibraryFolder(c *gin.Context) {
	handler.HandleCreateLibraryFolder(c)
}

// HandleRenameProjectLibraryFolder godoc
// @Summary Rename a logical project media folder
// @Tags Media Assets
// @Accept json
// @Produce json
// @Param projectId path string true "Project ID"
// @Param folderId path string true "Folder ID"
// @Param payload body LibraryFolderRenameRequest true "Name"
// @Success 200 {object} SwaggerEnvelope
// @Failure 400 {object} SwaggerEnvelope
// @Failure 404 {object} SwaggerEnvelope
// @Failure 500 {object} SwaggerEnvelope
// @Router /api/v1/projects/{projectId}/asset-library-folders/{folderId} [put]
func (handler MediaAssets) HandleRenameProjectLibraryFolder(c *gin.Context) {
	handler.HandleRenameLibraryFolder(c)
}

// HandleDeleteProjectLibraryFolder godoc
// @Summary Delete an empty logical project media folder
// @Tags Media Assets
// @Produce json
// @Param projectId path string true "Project ID"
// @Param folderId path string true "Folder ID"
// @Success 200 {object} SwaggerEnvelope
// @Failure 404 {object} SwaggerEnvelope
// @Failure 409 {object} SwaggerEnvelope
// @Failure 500 {object} SwaggerEnvelope
// @Router /api/v1/projects/{projectId}/asset-library-folders/{folderId} [delete]
func (handler MediaAssets) HandleDeleteProjectLibraryFolder(c *gin.Context) {
	handler.HandleDeleteLibraryFolder(c)
}
