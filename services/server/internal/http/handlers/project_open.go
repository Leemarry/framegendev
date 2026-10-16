package handlers

import (
	"context"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	mediamcp "github.com/mediago-dev/mediago-drama/packages/mcp/pkg/mcp"
	"github.com/mediago-dev/mediago-drama/services/server/internal/http/response"
	"github.com/mediago-dev/mediago-drama/services/server/internal/service/document"
)

// ProjectDirectoryStore previews and opens existing local projects.
type ProjectDirectoryStore interface {
	PreviewProjectDirectory(context.Context, string) (document.ProjectDirectoryPreview, error)
	OpenProjectDirectory(context.Context, string, string) (mediamcp.Project, error)
}

// ProjectDirectories handles existing project directory registration.
type ProjectDirectories struct{ store ProjectDirectoryStore }

// NewProjectDirectories creates the directory handler.
func NewProjectDirectories(store ProjectDirectoryStore) ProjectDirectories {
	return ProjectDirectories{store: store}
}

type projectDirectoryRequest struct {
	Directory   string `json:"directory" binding:"required"`
	Fingerprint string `json:"fingerprint"`
}

// HandlePreview godoc
// @Summary 只读预览已有项目目录
// @Tags Projects
// @Accept json
// @Produce json
// @Param payload body projectDirectoryRequest true "Local directory"
// @Success 200 {object} SwaggerEnvelope
// @Failure 400,409,500 {object} SwaggerEnvelope
// @Router /api/v1/projects/open/preview [post]
func (handler ProjectDirectories) HandlePreview(c *gin.Context) {
	payload, err := decodeJSON[projectDirectoryRequest](c)
	if err != nil {
		response.ErrorFromStatus(c, http.StatusBadRequest, err)
		return
	}
	result, err := handler.store.PreviewProjectDirectory(c.Request.Context(), payload.Directory)
	if err != nil {
		writeProjectDirectoryError(c, err)
		return
	}
	response.OK(c, result)
}

// HandleOpen godoc
// @Summary 确认打开已有项目目录
// @Tags Projects
// @Accept json
// @Produce json
// @Param payload body projectDirectoryRequest true "Confirmed local directory"
// @Success 200 {object} SwaggerEnvelope
// @Failure 400,409,500 {object} SwaggerEnvelope
// @Router /api/v1/projects/open [post]
func (handler ProjectDirectories) HandleOpen(c *gin.Context) {
	payload, err := decodeJSON[projectDirectoryRequest](c)
	if err != nil {
		response.ErrorFromStatus(c, http.StatusBadRequest, err)
		return
	}
	result, err := handler.store.OpenProjectDirectory(c.Request.Context(), payload.Directory, payload.Fingerprint)
	if err != nil {
		writeProjectDirectoryError(c, err)
		return
	}
	response.OK(c, result)
}

func writeProjectDirectoryError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, document.ErrInvalidProjectDirectory):
		response.ErrorFromStatus(c, http.StatusBadRequest, err)
	case errors.Is(err, document.ErrProjectDirectoryConflict):
		response.ErrorFromStatus(c, http.StatusConflict, err)
	default:
		response.Fail(c, http.StatusInternalServerError, "打开项目目录失败，请重试", err)
	}
}
