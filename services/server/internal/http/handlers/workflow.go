package handlers

import (
	"context"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/mediago-dev/mediago-drama/services/server/internal/http/dto"
	httpresponse "github.com/mediago-dev/mediago-drama/services/server/internal/http/response"
	workflowservice "github.com/mediago-dev/mediago-drama/services/server/internal/service/workflow"
)

// WorkflowService supplies workflow document and template operations.
type WorkflowService interface {
	CreateWorkflow(ctx context.Context, request dto.CreateWorkflowRequest) (dto.WorkflowDocument, error)
	GetWorkflow(ctx context.Context, id string) (dto.WorkflowDocument, error)
	ListWorkflows(ctx context.Context, projectID string, shotName string, documentID string) (dto.WorkflowListResponse, error)
	UpdateWorkflow(ctx context.Context, id string, request dto.UpdateWorkflowRequest) (dto.WorkflowDocument, error)
	DeleteWorkflow(ctx context.Context, id string) error
	ListTemplates(ctx context.Context, category string) (dto.WorkflowTemplateListResponse, error)
}

// Workflows handles workflow document and template HTTP routes.
type Workflows struct {
	service WorkflowService
}

// NewWorkflows returns a workflow route handler.
func NewWorkflows(service WorkflowService) Workflows {
	return Workflows{service: service}
}

// HandleListWorkflows godoc
// @Summary 列出工作流
// @Description 按项目（可选分镜、文档）列出工作流摘要。
// @Tags Workflow
// @Produce json
// @Param projectId query string true "Project ID"
// @Param shotName query string false "Shot name"
// @Param documentId query string false "Document ID"
// @Success 200 {object} SwaggerEnvelope
// @Failure 400 {object} SwaggerEnvelope
// @Failure 500 {object} SwaggerEnvelope
// @Router /api/v1/workflows [get]
func (handler Workflows) HandleListWorkflows(context *gin.Context) {
	projectID, ok := requiredProjectID(context)
	if !ok {
		return
	}

	result, err := handler.service.ListWorkflows(
		context.Request.Context(),
		projectID,
		context.Query("shotName"),
		context.Query("documentId"),
	)
	if err != nil {
		writeWorkflowError(context, err)
		return
	}

	httpresponse.OK(context, result)
}

// HandleGetWorkflow godoc
// @Summary 获取工作流详情
// @Description 返回包含 schemaVersion 4 画布的工作流文档。
// @Tags Workflow
// @Produce json
// @Param id path string true "Workflow ID"
// @Success 200 {object} SwaggerEnvelope
// @Failure 404 {object} SwaggerEnvelope
// @Failure 500 {object} SwaggerEnvelope
// @Router /api/v1/workflows/{id} [get]
func (handler Workflows) HandleGetWorkflow(context *gin.Context) {
	id, ok := requiredPathParam(context, "id", "工作流 ID")
	if !ok {
		return
	}

	document, err := handler.service.GetWorkflow(context.Request.Context(), id)
	if err != nil {
		writeWorkflowError(context, err)
		return
	}

	httpresponse.OK(context, document)
}

// HandleCreateWorkflow godoc
// @Summary 创建工作流
// @Description 创建空白工作流，或从模板库复制画布。
// @Tags Workflow
// @Accept json
// @Produce json
// @Param payload body SwaggerObject true "Workflow creation payload"
// @Success 200 {object} SwaggerEnvelope
// @Failure 400 {object} SwaggerEnvelope
// @Failure 404 {object} SwaggerEnvelope
// @Failure 500 {object} SwaggerEnvelope
// @Router /api/v1/workflows [post]
func (handler Workflows) HandleCreateWorkflow(context *gin.Context) {
	payload, err := decodeJSON[dto.CreateWorkflowRequest](context)
	if err != nil {
		httpresponse.ErrorFromStatus(context, http.StatusBadRequest, err)
		return
	}

	document, err := handler.service.CreateWorkflow(context.Request.Context(), payload)
	if err != nil {
		writeWorkflowError(context, err)
		return
	}

	httpresponse.OK(context, document)
}

// HandleUpdateWorkflow godoc
// @Summary 更新工作流
// @Description 更新名称、描述或 schemaVersion 4 画布；修改模板画布会断开模板引用。
// @Tags Workflow
// @Accept json
// @Produce json
// @Param id path string true "Workflow ID"
// @Param payload body SwaggerObject true "Workflow update payload"
// @Success 200 {object} SwaggerEnvelope
// @Failure 400 {object} SwaggerEnvelope
// @Failure 404 {object} SwaggerEnvelope
// @Failure 500 {object} SwaggerEnvelope
// @Router /api/v1/workflows/{id} [put]
func (handler Workflows) HandleUpdateWorkflow(context *gin.Context) {
	id, ok := requiredPathParam(context, "id", "工作流 ID")
	if !ok {
		return
	}
	payload, err := decodeJSON[dto.UpdateWorkflowRequest](context)
	if err != nil {
		httpresponse.ErrorFromStatus(context, http.StatusBadRequest, err)
		return
	}

	document, err := handler.service.UpdateWorkflow(context.Request.Context(), id, payload)
	if err != nil {
		writeWorkflowError(context, err)
		return
	}

	httpresponse.OK(context, document)
}

// HandleDeleteWorkflow godoc
// @Summary 删除工作流
// @Description 删除一个工作流文档。
// @Tags Workflow
// @Produce json
// @Param id path string true "Workflow ID"
// @Success 200 {object} SwaggerEnvelope
// @Failure 404 {object} SwaggerEnvelope
// @Failure 500 {object} SwaggerEnvelope
// @Router /api/v1/workflows/{id} [delete]
func (handler Workflows) HandleDeleteWorkflow(context *gin.Context) {
	id, ok := requiredPathParam(context, "id", "工作流 ID")
	if !ok {
		return
	}

	if err := handler.service.DeleteWorkflow(context.Request.Context(), id); err != nil {
		writeWorkflowError(context, err)
		return
	}

	httpresponse.OK(context, dto.DeleteWorkflowResponse{Deleted: true})
}

// HandleListWorkflowTemplates godoc
// @Summary 列出工作流模板
// @Description 返回内置或自定义工作流模板。
// @Tags Workflow
// @Produce json
// @Param category query string false "builtin or custom"
// @Success 200 {object} SwaggerEnvelope
// @Failure 400 {object} SwaggerEnvelope
// @Failure 500 {object} SwaggerEnvelope
// @Router /api/v1/workflow-templates [get]
func (handler Workflows) HandleListWorkflowTemplates(context *gin.Context) {
	result, err := handler.service.ListTemplates(context.Request.Context(), context.Query("category"))
	if err != nil {
		writeWorkflowError(context, err)
		return
	}

	httpresponse.OK(context, result)
}

func writeWorkflowError(context *gin.Context, err error) {
	var validationErr *workflowservice.ValidationError
	switch {
	case errors.As(err, &validationErr):
		httpresponse.Error(context, http.StatusBadRequest, validationErr.Message)
	case errors.Is(err, workflowservice.ErrWorkflowNotFound):
		httpresponse.Error(context, http.StatusNotFound, "工作流不存在")
	case errors.Is(err, workflowservice.ErrTemplateNotFound):
		httpresponse.Error(context, http.StatusNotFound, "工作流模板不存在")
	case errors.Is(err, workflowservice.ErrProjectNotFound):
		httpresponse.Error(context, http.StatusBadRequest, "项目不存在")
	default:
		httpresponse.Fail(context, http.StatusInternalServerError, "internal error", err)
	}
}
