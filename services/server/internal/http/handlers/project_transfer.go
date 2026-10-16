package handlers

import (
	"context"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/mediago-dev/mediago-drama/services/server/internal/http/response"
	"github.com/mediago-dev/mediago-drama/services/server/internal/service/document"
)

// ProjectTransferStore exposes project package operations to HTTP handlers.
type ProjectTransferStore interface {
	PreviewProjectPackage(context.Context, string) (document.ProjectPackagePreview, error)
	ExportProjectPackage(context.Context, string, string) (string, error)
	ImportProjectPackage(context.Context, string, string, string) (document.WorkspaceProjectRecord, error)
}

// ProjectTransfers handles local project package preview, import and export.
type ProjectTransfers struct{ store ProjectTransferStore }

// NewProjectTransfers creates the project package handlers.
func NewProjectTransfers(store ProjectTransferStore) ProjectTransfers {
	return ProjectTransfers{store: store}
}

type projectPackagePreviewRequest struct {
	Archive string `json:"archive" binding:"required"`
}
type projectPackageExportRequest struct {
	Destination string `json:"destination" binding:"required"`
}
type projectPackageImportRequest struct {
	Archive     string `json:"archive" binding:"required"`
	Destination string `json:"destination" binding:"required"`
	Fingerprint string `json:"fingerprint" binding:"required"`
}

// HandlePreview godoc
// @Summary 只读预览项目包
// @Tags Projects
// @Accept json
// @Produce json
// @Param payload body projectPackagePreviewRequest true "Project package"
// @Success 200 {object} SwaggerEnvelope
// @Failure 400,409,500 {object} SwaggerEnvelope
// @Router /api/v1/projects/packages/preview [post]
func (handler ProjectTransfers) HandlePreview(c *gin.Context) {
	var payload projectPackagePreviewRequest
	if err := c.ShouldBindJSON(&payload); err != nil {
		response.Error(c, http.StatusBadRequest, "项目包路径不能为空")
		return
	}
	result, err := handler.store.PreviewProjectPackage(c.Request.Context(), payload.Archive)
	if err != nil {
		writeProjectTransferError(c, err)
		return
	}
	response.OK(c, result)
}

// HandleExport godoc
// @Summary 导出项目包
// @Tags Projects
// @Accept json
// @Produce json
// @Param projectId path string true "Project ID"
// @Param payload body projectPackageExportRequest true "Export destination"
// @Success 200 {object} SwaggerEnvelope
// @Failure 400,409,500 {object} SwaggerEnvelope
// @Router /api/v1/projects/{projectId}/package/export [post]
func (handler ProjectTransfers) HandleExport(c *gin.Context) {
	projectID, ok := requiredProjectID(c)
	if !ok {
		return
	}
	var payload projectPackageExportRequest
	if err := c.ShouldBindJSON(&payload); err != nil {
		response.Error(c, http.StatusBadRequest, "导出目录不能为空")
		return
	}
	result, err := handler.store.ExportProjectPackage(c.Request.Context(), projectID, payload.Destination)
	if err != nil {
		writeProjectTransferError(c, err)
		return
	}
	response.OK(c, gin.H{"path": result})
}

// HandleImport godoc
// @Summary 导入项目包
// @Tags Projects
// @Accept json
// @Produce json
// @Param payload body projectPackageImportRequest true "Project package and destination"
// @Success 200 {object} SwaggerEnvelope
// @Failure 400,409,500 {object} SwaggerEnvelope
// @Router /api/v1/projects/packages/import [post]
func (handler ProjectTransfers) HandleImport(c *gin.Context) {
	var payload projectPackageImportRequest
	if err := c.ShouldBindJSON(&payload); err != nil {
		response.Error(c, http.StatusBadRequest, "项目包、目标目录和预览指纹不能为空")
		return
	}
	result, err := handler.store.ImportProjectPackage(c.Request.Context(), payload.Archive, payload.Destination, payload.Fingerprint)
	if err != nil {
		writeProjectTransferError(c, err)
		return
	}
	response.OK(c, result)
}

func writeProjectTransferError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, document.ErrInvalidProjectPackage):
		response.ErrorFromStatus(c, http.StatusBadRequest, err)
	case errors.Is(err, document.ErrProjectPackageConflict):
		response.ErrorFromStatus(c, http.StatusConflict, err)
	case errors.Is(err, context.Canceled), errors.Is(err, context.DeadlineExceeded):
		response.ErrorFromStatus(c, http.StatusRequestTimeout, err)
	default:
		response.Fail(c, http.StatusInternalServerError, "项目包操作失败，请重试", err)
	}
}
