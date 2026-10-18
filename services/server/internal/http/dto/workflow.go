package dto

import "github.com/mediago-dev/mediago-drama/services/server/internal/domain"

// CreateWorkflowRequest creates a workflow for one project document shot.
type CreateWorkflowRequest struct {
	ProjectID   string `json:"projectId"`
	DocumentID  string `json:"documentId"`
	ShotName    string `json:"shotName"`
	Name        string `json:"name"`
	Description string `json:"description"`
	TemplateRef string `json:"templateRef"`
}

// UpdateWorkflowRequest updates workflow metadata and/or the canvas. Omitted
// fields stay unchanged; an explicit graphData change forks template workflows.
type UpdateWorkflowRequest struct {
	Name        *string           `json:"name"`
	Description *string           `json:"description"`
	GraphData   *domain.GraphData `json:"graphData"`
}

// WorkflowSummary is one row of the workflow list.
type WorkflowSummary struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	ShotName    string  `json:"shotName"`
	NodeCount   int     `json:"nodeCount"`
	TemplateRef *string `json:"templateRef,omitempty"`
	UpdatedAt   string  `json:"updatedAt"`
}

// WorkflowDocument is the full workflow payload returned by create/get/update.
type WorkflowDocument struct {
	ID            string           `json:"id"`
	ProjectID     string           `json:"projectId"`
	DocumentID    string           `json:"documentId"`
	ShotName      string           `json:"shotName"`
	Name          string           `json:"name"`
	Description   string           `json:"description"`
	SchemaVersion int              `json:"schemaVersion"`
	GraphData     domain.GraphData `json:"graphData"`
	TemplateRef   *string          `json:"templateRef,omitempty"`
	CreatedAt     string           `json:"createdAt"`
	UpdatedAt     string           `json:"updatedAt"`
}

// WorkflowListResponse lists workflow summaries for one project.
type WorkflowListResponse struct {
	Workflows []WorkflowSummary `json:"workflows"`
}

// WorkflowTemplateSummary is one row of the global template library.
type WorkflowTemplateSummary struct {
	ID           string  `json:"id"`
	Name         string  `json:"name"`
	Description  string  `json:"description,omitempty"`
	Category     string  `json:"category"`
	ThumbnailURL *string `json:"thumbnailUrl,omitempty"`
	UsageCount   int     `json:"usageCount"`
	UpdatedAt    string  `json:"updatedAt"`
}

// WorkflowTemplateListResponse lists reusable workflow templates.
type WorkflowTemplateListResponse struct {
	Templates []WorkflowTemplateSummary `json:"templates"`
}

// DeleteWorkflowResponse acknowledges a workflow deletion.
type DeleteWorkflowResponse struct {
	Deleted bool `json:"deleted"`
}

// --- Output Binding DTOs ---

// CreateOutputBindingRequest creates a workflow output binding.
type CreateOutputBindingRequest struct {
	WorkflowID  string `json:"workflowId" binding:"required"`
	NodeID      string `json:"nodeId" binding:"required"`
	SegmentName string `json:"segmentName" binding:"required"`
	DisplayName string `json:"displayName" binding:"required"`
	SortOrder   int    `json:"sortOrder"`
}

// UpdateOutputBindingRequest updates a binding's display name or sort order.
type UpdateOutputBindingRequest struct {
	DisplayName *string `json:"displayName"`
	SortOrder   *int    `json:"sortOrder"`
}

// OutputBindingDTO represents a single output binding.
type OutputBindingDTO struct {
	ID          string `json:"id"`
	WorkflowID  string `json:"workflowId"`
	NodeID      string `json:"nodeId"`
	SegmentName string `json:"segmentName"`
	DisplayName string `json:"displayName"`
	SortOrder   int    `json:"sortOrder"`
	IsMain      bool   `json:"isMain"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}

// ListOutputBindingsResponse lists output bindings for a workflow.
type ListOutputBindingsResponse struct {
	Bindings []OutputBindingDTO `json:"bindings"`
}

// SetMainBindingRequest sets the main output binding for a workflow.
type SetMainBindingRequest struct {
	BindingID string `json:"bindingId" binding:"required"`
}

// --- Node Task DTOs ---

// NodeTaskDTO represents a workflow node execution task.
type NodeTaskDTO struct {
	ID         string  `json:"id"`
	WorkflowID string  `json:"workflowId"`
	NodeID     string  `json:"nodeId"`
	Status     string  `json:"status"`
	Progress   float64 `json:"progress"`
	ErrorMsg   string  `json:"errorMsg,omitempty"`
	StartedAt  *string `json:"startedAt,omitempty"`
	FinishedAt *string `json:"finishedAt,omitempty"`
	CreatedAt  string  `json:"createdAt"`
	UpdatedAt  string  `json:"updatedAt"`
}

// ListNodeTasksResponse lists node tasks for a workflow.
type ListNodeTasksResponse struct {
	Tasks []NodeTaskDTO `json:"tasks"`
}

// ExecuteNodeRequest starts execution of a workflow node.
type ExecuteNodeRequest struct {
	WorkflowID string `json:"workflowId" binding:"required"`
	NodeID     string `json:"nodeId" binding:"required"`
}

// UpdateNodeTaskStatusRequest updates a node task's execution status.
type UpdateNodeTaskStatusRequest struct {
	Status   string  `json:"status" binding:"required"`
	Progress float64 `json:"progress"`
	ErrorMsg string  `json:"errorMsg"`
}

// --- Asset DTOs ---

// WorkflowAssetDTO represents a workflow asset.
type WorkflowAssetDTO struct {
	ID         string `json:"id"`
	WorkflowID string `json:"workflowId"`
	NodeID     string `json:"nodeId"`
	AssetPath  string `json:"assetPath"`
	AssetType  string `json:"assetType"`
	SizeBytes  int64  `json:"sizeBytes"`
	CreatedAt  string `json:"createdAt"`
}

// ListWorkflowAssetsResponse lists assets for a workflow.
type ListWorkflowAssetsResponse struct {
	Assets []WorkflowAssetDTO `json:"assets"`
}

// RegisterAssetRequest registers a new workflow asset.
type RegisterAssetRequest struct {
	WorkflowID string `json:"workflowId" binding:"required"`
	NodeID     string `json:"nodeId" binding:"required"`
	AssetPath  string `json:"assetPath" binding:"required"`
	AssetType  string `json:"assetType" binding:"required"`
	SizeBytes  int64  `json:"sizeBytes"`
}

