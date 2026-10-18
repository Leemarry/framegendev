package dto

import "time"

// WorkflowExecutionStatus represents the overall execution status.
type WorkflowExecutionStatus string

const (
	ExecutionStatusPending   WorkflowExecutionStatus = "pending"
	ExecutionStatusRunning   WorkflowExecutionStatus = "running"
	ExecutionStatusCompleted WorkflowExecutionStatus = "completed"
	ExecutionStatusFailed    WorkflowExecutionStatus = "failed"
	ExecutionStatusCancelled WorkflowExecutionStatus = "cancelled"
)

// WorkflowNodeStatus represents the status of a single node.
type WorkflowNodeStatus string

const (
	NodeStatusPending   WorkflowNodeStatus = "pending"
	NodeStatusRunning   WorkflowNodeStatus = "running"
	NodeStatusCompleted WorkflowNodeStatus = "completed"
	NodeStatusFailed    WorkflowNodeStatus = "failed"
	NodeStatusSkipped   WorkflowNodeStatus = "skipped"
)

// ExecuteWorkflowRequest is the request to execute a workflow.
type ExecuteWorkflowRequest struct {
	TriggerNodeIds []string `json:"triggerNodeIds,omitempty"`
}

// ExecuteWorkflowResponse is the response after starting execution.
type ExecuteWorkflowResponse struct {
	Execution WorkflowExecutionRecord `json:"execution"`
}

// WorkflowExecutionRecord represents the overall execution state.
type WorkflowExecutionRecord struct {
	ID           string                               `json:"id"`
	WorkflowID   string                               `json:"workflowId"`
	Status       WorkflowExecutionStatus              `json:"status"`
	Progress     float64                              `json:"progress"`
	StartedAt    *time.Time                           `json:"startedAt,omitempty"`
	CompletedAt  *time.Time                           `json:"completedAt,omitempty"`
	Error        string                               `json:"error,omitempty"`
	NodeStatuses map[string]WorkflowNodeExecutionStatus `json:"nodeStatuses"`
	CreatedAt    time.Time                            `json:"createdAt"`
	UpdatedAt    time.Time                            `json:"updatedAt"`
}

// WorkflowNodeExecutionStatus represents the status of one node.
type WorkflowNodeExecutionStatus struct {
	NodeID         string             `json:"nodeId"`
	Status         WorkflowNodeStatus `json:"status"`
	StartedAt      *time.Time         `json:"startedAt,omitempty"`
	CompletedAt    *time.Time         `json:"completedAt,omitempty"`
	Error          string             `json:"error,omitempty"`
	OutputAssetIds []string           `json:"outputAssetIds"`
}

// WorkflowAssetRecord represents a generated asset.
type WorkflowAssetRecord struct {
	ID         string    `json:"id"`
	WorkflowID string    `json:"workflowId"`
	NodeID     string    `json:"nodeId"`
	AssetPath  string    `json:"assetPath"`
	AssetType  string    `json:"assetType"`
	SizeBytes  int64     `json:"sizeBytes"`
	CreatedAt  time.Time `json:"createdAt"`
}

// WorkflowOutputBindingRecord binds workflow output to a shot.
type WorkflowOutputBindingRecord struct {
	ID          string    `json:"id"`
	WorkflowID  string    `json:"workflowId"`
	NodeID      string    `json:"nodeId"`
	OutputIndex int       `json:"outputIndex"`
	ShotID      string    `json:"shotId"`
	CreatedAt   time.Time `json:"createdAt"`
}

// WorkflowExecutionDetailResponse is the detailed execution state.
type WorkflowExecutionDetailResponse struct {
	Execution WorkflowExecutionRecord `json:"execution"`
}

// ListWorkflowOutputsResponse lists all output assets.
type ListWorkflowOutputsResponse struct {
	Assets []WorkflowAssetRecord `json:"assets"`
}

// RetryWorkflowExecutionRequest is the request to retry failed nodes.
type RetryWorkflowExecutionRequest struct {
	FailedNodeIds []string `json:"failedNodeIds"`
}

// RetryWorkflowExecutionResponse is the response after retry.
type RetryWorkflowExecutionResponse struct {
	Execution WorkflowExecutionRecord `json:"execution"`
}
