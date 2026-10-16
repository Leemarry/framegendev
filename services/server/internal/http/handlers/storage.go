package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	httpresponse "github.com/mediago-dev/mediago-drama/services/server/internal/http/response"
	servicedocument "github.com/mediago-dev/mediago-drama/services/server/internal/service/document"
	servicestorage "github.com/mediago-dev/mediago-drama/services/server/internal/service/storage"
)

type storageProjectSource interface {
	Dir() string
	ListRegisteredProjectStorageRoots() ([]servicedocument.ProjectStorageRoot, error)
}

// Storage exposes classified workspace usage and generated-poster cleanup.
type Storage struct {
	source  storageProjectSource
	service *servicestorage.Service
}

// NewStorage returns a storage route handler.
func NewStorage(source storageProjectSource) Storage {
	return Storage{source: source, service: servicestorage.New(source.Dir())}
}

// HandleStatistics godoc
// @Summary 获取分类存储统计
// @Description 返回已登记项目、全局素材库、应用元数据和生成海报缓存的实际占用。
// @Tags Storage
// @Produce json
// @Success 200 {object} SwaggerEnvelope
// @Failure 500 {object} SwaggerEnvelope
// @Router /api/v1/storage/statistics [get]
func (handler Storage) HandleStatistics(context *gin.Context) {
	projects, err := handler.projectRoots()
	if err != nil {
		httpresponse.Fail(context, http.StatusInternalServerError, "storage scan failed", err)
		return
	}
	httpresponse.OK(context, handler.service.Scan(projects))
}

// HandlePosterPreview godoc
// @Summary 预览生成海报缓存清理
// @Description 返回规范缓存目录中的海报候选项，不修改文件。
// @Tags Storage
// @Produce json
// @Success 200 {object} SwaggerEnvelope
// @Failure 500 {object} SwaggerEnvelope
// @Router /api/v1/storage/poster-cache/preview [post]
func (handler Storage) HandlePosterPreview(context *gin.Context) {
	projects, err := handler.projectRoots()
	if err != nil {
		httpresponse.Fail(context, http.StatusInternalServerError, "poster cache preview failed", err)
		return
	}
	preview, err := handler.service.Preview(projects)
	if err != nil {
		httpresponse.Fail(context, http.StatusInternalServerError, "poster cache preview failed", err)
		return
	}
	httpresponse.OK(context, preview)
}

type cleanupPostersRequest struct {
	IDs []string `json:"ids" binding:"required,min=1,max=500,dive,required,max=64"`
}

// HandlePosterCleanup godoc
// @Summary 清理生成海报缓存
// @Description 仅删除当前预览中的未变化海报候选项，并返回逐项结果。
// @Tags Storage
// @Accept json
// @Produce json
// @Param request body cleanupPostersRequest true "Preview candidate IDs"
// @Success 200 {object} SwaggerEnvelope
// @Failure 400 {object} SwaggerEnvelope
// @Failure 500 {object} SwaggerEnvelope
// @Router /api/v1/storage/poster-cache/cleanup [post]
func (handler Storage) HandlePosterCleanup(context *gin.Context) {
	var request cleanupPostersRequest
	if err := context.ShouldBindJSON(&request); err != nil {
		httpresponse.Error(context, http.StatusBadRequest, "valid poster candidate ids are required")
		return
	}
	httpresponse.OK(context, handler.service.Cleanup(request.IDs))
}

func (handler Storage) projectRoots() ([]servicestorage.ProjectRoot, error) {
	registered, err := handler.source.ListRegisteredProjectStorageRoots()
	if err != nil {
		return nil, err
	}
	projects := make([]servicestorage.ProjectRoot, 0, len(registered))
	for _, project := range registered {
		projects = append(projects, servicestorage.ProjectRoot{ID: project.ID, Path: project.Path})
	}
	return projects, nil
}
