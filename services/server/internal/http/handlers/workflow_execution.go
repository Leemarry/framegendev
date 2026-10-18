package handlers

import (
	"errors"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/mediago-dev/mediago-drama/services/server/internal/http/dto"
	"github.com/mediago-dev/mediago-drama/services/server/internal/http/response"
	"github.com/mediago-dev/mediago-drama/services/server/internal/service/workflow"
)

// WorkflowExecutionHandler owns HTTP routes for workflow execution, bindings, and assets.
type WorkflowExecutionHandler struct {
	executionSvc *workflow.ExecutionService
}

// NewWorkflowExecutionHandler returns a handler wired to the workflow execution service.
func NewWorkflowExecutionHandler(executionSvc *workflow.ExecutionService) *WorkflowExecutionHandler {
	return &WorkflowExecutionHandler{executionSvc: executionSvc}
}

// --- Output Bindings ---

// CreateOutputBinding creates a new output binding.
// @Summary Workflow execution POST /api/v1/workflows/outputs
// @Tags Workflows
// @Produce json
// @Success 200 {object} SwaggerEnvelope
// @Router /api/v1/workflows/outputs [post]
func (h *WorkflowExecutionHandler) CreateOutputBinding(c *gin.Context) {
	var req dto.CreateOutputBindingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "invalid request body")
		return
	}

	result, err := h.executionSvc.CreateOutputBinding(c.Request.Context(), req)
	if err != nil {
		h.handleExecutionError(c, err)
		return
	}

	response.OK(c, result)
}

// ListOutputBindings lists output bindings for a workflow.
// @Summary Workflow execution GET /api/v1/workflows/:id/outputs
// @Tags Workflows
// @Produce json
// @Success 200 {object} SwaggerEnvelope
// @Router /api/v1/workflows/{id}/outputs [get]
func (h *WorkflowExecutionHandler) ListOutputBindings(c *gin.Context) {
	workflowID := c.Param("id")

	result, err := h.executionSvc.ListOutputBindings(c.Request.Context(), workflowID)
	if err != nil {
		h.handleExecutionError(c, err)
		return
	}

	response.OK(c, result)
}

// UpdateOutputBinding updates an output binding.
// @Summary Workflow execution PATCH /api/v1/workflows/outputs/:id
// @Tags Workflows
// @Produce json
// @Success 200 {object} SwaggerEnvelope
// @Router /api/v1/workflows/outputs/{id} [patch]
func (h *WorkflowExecutionHandler) UpdateOutputBinding(c *gin.Context) {
	bindingID := c.Param("id")

	var req dto.UpdateOutputBindingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "invalid request body")
		return
	}

	result, err := h.executionSvc.UpdateOutputBinding(c.Request.Context(), bindingID, req)
	if err != nil {
		h.handleExecutionError(c, err)
		return
	}

	response.OK(c, result)
}

// DeleteOutputBinding deletes an output binding.
// @Summary Workflow execution DELETE /api/v1/workflows/outputs/:id
// @Tags Workflows
// @Produce json
// @Success 200 {object} SwaggerEnvelope
// @Router /api/v1/workflows/outputs/{id} [delete]
func (h *WorkflowExecutionHandler) DeleteOutputBinding(c *gin.Context) {
	bindingID := c.Param("id")

	err := h.executionSvc.DeleteOutputBinding(c.Request.Context(), bindingID)
	if err != nil {
		h.handleExecutionError(c, err)
		return
	}

	response.OK(c, gin.H{"deleted": true})
}

// SetMainBinding sets the main output binding for a workflow.
// @Summary Workflow execution POST /api/v1/workflows/:id/outputs/main
// @Tags Workflows
// @Produce json
// @Success 200 {object} SwaggerEnvelope
// @Router /api/v1/workflows/{id}/outputs/main [post]
func (h *WorkflowExecutionHandler) SetMainBinding(c *gin.Context) {
	workflowID := c.Param("id")

	var req dto.SetMainBindingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "invalid request body")
		return
	}

	err := h.executionSvc.SetMainBinding(c.Request.Context(), workflowID, req.BindingID)
	if err != nil {
		h.handleExecutionError(c, err)
		return
	}

	response.OK(c, gin.H{"success": true})
}

// --- Assets ---

// RegisterAsset registers a new workflow asset.
// @Summary Workflow execution POST /api/v1/workflows/assets
// @Tags Workflows
// @Produce json
// @Success 200 {object} SwaggerEnvelope
// @Router /api/v1/workflows/assets [post]
func (h *WorkflowExecutionHandler) RegisterAsset(c *gin.Context) {
	var req dto.RegisterAssetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "invalid request body")
		return
	}

	result, err := h.executionSvc.RegisterAsset(c.Request.Context(), req)
	if err != nil {
		h.handleExecutionError(c, err)
		return
	}

	response.OK(c, result)
}

// ListWorkflowAssets lists all assets for a workflow.
// @Summary Workflow execution GET /api/v1/workflows/:id/assets
// @Tags Workflows
// @Produce json
// @Success 200 {object} SwaggerEnvelope
// @Router /api/v1/workflows/{id}/assets [get]
func (h *WorkflowExecutionHandler) ListWorkflowAssets(c *gin.Context) {
	workflowID := c.Param("id")

	result, err := h.executionSvc.ListAssets(c.Request.Context(), workflowID)
	if err != nil {
		h.handleExecutionError(c, err)
		return
	}

	response.OK(c, result)
}

// ListNodeAssets lists all assets for a specific node.
// @Summary Workflow execution GET /api/v1/workflows/:id/nodes/:nodeId/assets
// @Tags Workflows
// @Produce json
// @Success 200 {object} SwaggerEnvelope
// @Router /api/v1/workflows/{id}/nodes/{nodeId}/assets [get]
func (h *WorkflowExecutionHandler) ListNodeAssets(c *gin.Context) {
	workflowID := c.Param("id")
	nodeID := c.Param("nodeId")

	result, err := h.executionSvc.ListAssetsByNode(c.Request.Context(), workflowID, nodeID)
	if err != nil {
		h.handleExecutionError(c, err)
		return
	}

	response.OK(c, result)
}

// DeleteAsset deletes a workflow asset.
// @Summary Workflow execution DELETE /api/v1/workflows/assets/:id
// @Tags Workflows
// @Produce json
// @Success 200 {object} SwaggerEnvelope
// @Router /api/v1/workflows/assets/{id} [delete]
func (h *WorkflowExecutionHandler) DeleteAsset(c *gin.Context) {
	assetID := c.Param("id")

	err := h.executionSvc.DeleteAsset(c.Request.Context(), assetID)
	if err != nil {
		h.handleExecutionError(c, err)
		return
	}

	response.OK(c, gin.H{"deleted": true})
}

// --- Node Tasks ---

// ExecuteNode starts execution of a workflow node.
// @Summary Workflow execution POST /api/v1/workflows/nodes/execute
// @Tags Workflows
// @Produce json
// @Success 200 {object} SwaggerEnvelope
// @Router /api/v1/workflows/nodes/execute [post]
func (h *WorkflowExecutionHandler) ExecuteNode(c *gin.Context) {
	var req dto.ExecuteNodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "invalid request body")
		return
	}

	result, err := h.executionSvc.ExecuteNode(c.Request.Context(), req)
	if err != nil {
		h.handleExecutionError(c, err)
		return
	}

	response.OK(c, result)
}

// GetNodeTask retrieves the task for a specific node.
// @Summary Workflow execution GET /api/v1/workflows/:id/nodes/:nodeId/task
// @Tags Workflows
// @Produce json
// @Success 200 {object} SwaggerEnvelope
// @Router /api/v1/workflows/{id}/nodes/{nodeId}/task [get]
func (h *WorkflowExecutionHandler) GetNodeTask(c *gin.Context) {
	workflowID := c.Param("id")
	nodeID := c.Param("nodeId")

	result, err := h.executionSvc.GetNodeTask(c.Request.Context(), workflowID, nodeID)
	if err != nil {
		h.handleExecutionError(c, err)
		return
	}

	response.OK(c, result)
}

// ListNodeTasks lists all tasks for a workflow.
// @Summary Workflow execution GET /api/v1/workflows/:id/tasks
// @Tags Workflows
// @Produce json
// @Success 200 {object} SwaggerEnvelope
// @Router /api/v1/workflows/{id}/tasks [get]
func (h *WorkflowExecutionHandler) ListNodeTasks(c *gin.Context) {
	workflowID := c.Param("id")

	result, err := h.executionSvc.ListNodeTasks(c.Request.Context(), workflowID)
	if err != nil {
		h.handleExecutionError(c, err)
		return
	}

	response.OK(c, result)
}

// UpdateNodeTaskStatus updates a node task's execution status.
// @Summary Workflow execution PATCH /api/v1/workflows/tasks/:id/status
// @Tags Workflows
// @Produce json
// @Success 200 {object} SwaggerEnvelope
// @Router /api/v1/workflows/tasks/{id}/status [patch]
func (h *WorkflowExecutionHandler) UpdateNodeTaskStatus(c *gin.Context) {
	taskID := c.Param("id")

	var req dto.UpdateNodeTaskStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "invalid request body")
		return
	}

	result, err := h.executionSvc.UpdateNodeTaskStatus(c.Request.Context(), taskID, req)
	if err != nil {
		h.handleExecutionError(c, err)
		return
	}

	response.OK(c, result)
}

// ExecuteWorkflow starts full workflow execution.
// @Summary Workflow execution POST /api/v1/workflows/:id/execute
// @Tags Workflows
// @Produce json
// @Success 200 {object} SwaggerEnvelope
// @Router /api/v1/workflows/{id}/execute [post]
func (h *WorkflowExecutionHandler) ExecuteWorkflow(c *gin.Context) {
	workflowID := c.Param("id")

	var req dto.ExecuteWorkflowRequest
	if err := c.ShouldBindJSON(&req); err != nil && !errors.Is(err, io.EOF) {
		response.Error(c, http.StatusBadRequest, "invalid request body")
		return
	}

	executionRecord, err := h.executionSvc.StartExecution(c.Request.Context(), workflowID, req.TriggerNodeIds)
	if err != nil {
		h.handleExecutionError(c, err)
		return
	}

	response.OK(c, dto.ExecuteWorkflowResponse{
		Execution: executionRecord,
	})
}

// --- Error handling ---

// GetExecution retrieves execution details.
// @Summary Workflow execution GET /api/v1/workflows/:id/executions/:execId
// @Tags Workflows
// @Produce json
// @Success 200 {object} SwaggerEnvelope
// @Router /api/v1/workflows/{id}/executions/{execId} [get]
func (h *WorkflowExecutionHandler) GetExecution(c *gin.Context) {
	workflowID := c.Param("id")
	executionID := c.Param("execId")

	execution, err := h.executionSvc.GetExecution(c.Request.Context(), workflowID, executionID)
	if err != nil {
		h.handleExecutionError(c, err)
		return
	}

	response.OK(c, dto.WorkflowExecutionDetailResponse{
		Execution: execution,
	})
}

// CancelExecution cancels a running workflow execution.
// @Summary Workflow execution DELETE /api/v1/workflows/:id/executions/:execId
// @Tags Workflows
// @Produce json
// @Success 200 {object} SwaggerEnvelope
// @Router /api/v1/workflows/{id}/executions/{execId} [delete]
func (h *WorkflowExecutionHandler) CancelExecution(c *gin.Context) {
	workflowID := c.Param("id")
	executionID := c.Param("execId")

	err := h.executionSvc.CancelExecution(c.Request.Context(), workflowID, executionID)
	if err != nil {
		h.handleExecutionError(c, err)
		return
	}

	response.OK(c, gin.H{"success": true})
}

// RetryExecution retries failed nodes in an execution.
// @Summary Workflow execution POST /api/v1/workflows/:id/executions/:execId/retry
// @Tags Workflows
// @Produce json
// @Success 200 {object} SwaggerEnvelope
// @Router /api/v1/workflows/{id}/executions/{execId}/retry [post]
func (h *WorkflowExecutionHandler) RetryExecution(c *gin.Context) {
	workflowID := c.Param("id")
	executionID := c.Param("execId")

	var req dto.RetryWorkflowExecutionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "invalid request body")
		return
	}

	execution, err := h.executionSvc.RetryExecution(c.Request.Context(), workflowID, executionID, req.FailedNodeIds)
	if err != nil {
		h.handleExecutionError(c, err)
		return
	}

	response.OK(c, dto.RetryWorkflowExecutionResponse{
		Execution: execution,
	})
}

func (h *WorkflowExecutionHandler) handleExecutionError(c *gin.Context, err error) {
	var valErr *workflow.ValidationError
	if errors.As(err, &valErr) {
		response.Error(c, http.StatusBadRequest, valErr.Message)
		return
	}

	switch {
	case errors.Is(err, workflow.ErrExecutionUnavailable):
		response.Error(c, http.StatusNotImplemented, err.Error())
	case errors.Is(err, workflow.ErrWorkflowNotFound):
		response.Error(c, http.StatusNotFound, "workflow not found")
	default:
		response.Fail(c, http.StatusInternalServerError, "internal server error", err)
	}
}
