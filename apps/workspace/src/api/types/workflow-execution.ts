// Workflow execution API types mirroring Go backend DTOs

export type WorkflowExecutionStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export type WorkflowNodeStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export interface WorkflowExecutionRecord {
	id: string;
	workflowId: string;
	status: WorkflowExecutionStatus;
	progress: number;
	startedAt?: string;
	completedAt?: string;
	error?: string;
	nodeStatuses: Record<string, WorkflowNodeExecutionStatus>;
	createdAt: string;
	updatedAt: string;
}

export interface WorkflowNodeExecutionStatus {
	nodeId: string;
	status: WorkflowNodeStatus;
	startedAt?: string;
	completedAt?: string;
	error?: string;
	outputAssetIds: string[];
}

export interface WorkflowAssetRecord {
	id: string;
	workflowId: string;
	nodeId: string;
	assetPath: string;
	assetType: string;
	sizeBytes: number;
	createdAt: string;
}

export interface WorkflowOutputBindingRecord {
	id: string;
	workflowId: string;
	nodeId: string;
	outputIndex: number;
	shotId: string;
	createdAt: string;
}

export interface ExecuteWorkflowRequest {
	triggerNodeIds?: string[];
}

export interface ExecuteWorkflowResponse {
	execution: WorkflowExecutionRecord;
}

export interface WorkflowExecutionDetailResponse {
	execution: WorkflowExecutionRecord;
}

export interface ListWorkflowOutputsResponse {
	assets: WorkflowAssetRecord[];
}

export interface RetryWorkflowExecutionRequest {
	failedNodeIds: string[];
}

export interface RetryWorkflowExecutionResponse {
	execution: WorkflowExecutionRecord;
}
