import useSWR from "swr";
import type { WorkflowGraph } from "../lib/workflow-schema-v4";
import http from "@/shared/lib/http";
import type {
	ExecuteWorkflowRequest,
	ExecuteWorkflowResponse,
	WorkflowExecutionDetailResponse,
	ListWorkflowOutputsResponse,
	RetryWorkflowExecutionRequest,
	RetryWorkflowExecutionResponse,
} from "@/api/types/workflow-execution";

/** Full document returned by the workflow HTTP API. */
export interface WorkflowDocument {
	id: string;
	projectId: string;
	documentId: string;
	shotName: string;
	name: string;
	description: string;
	schemaVersion: number;
	graphData: WorkflowGraph;
	templateRef?: string;
	createdAt: string;
	updatedAt: string;
}

/**
 * 工作流 API 响应类型
 */
export interface ListWorkflowsResponse {
	workflows: Array<{
		id: string;
		name: string;
		shotName: string;
		nodeCount: number;
		templateRef?: string;
		updatedAt: string;
	}>;
}

export interface WorkflowTemplateResponse {
	templates: Array<{
		id: string;
		name: string;
		category: "builtin" | "custom";
		thumbnailUrl?: string;
		usageCount: number;
	}>;
}

/**
 * 创建工作流请求
 */
export interface CreateWorkflowRequest {
	projectId: string;
	documentId: string;
	shotName: string;
	name: string;
	templateRef?: string;
}

/**
 * 更新工作流请求
 */
export interface UpdateWorkflowRequest {
	name?: string;
	graphData?: WorkflowGraph;
}

/**
 * SWR Key 生成器
 */
export const workflowKeys = {
	list: (projectId: string, shotName?: string) =>
		["/workflows", projectId, shotName].filter(Boolean).join("/"),
	detail: (id: string) => `/workflows/${id}`,
	templates: (category?: string) =>
		category ? `/workflow-templates?category=${category}` : "/workflow-templates",
	execution: (workflowId: string, executionId: string) =>
		`/workflows/${workflowId}/executions/${executionId}`,
	outputs: (workflowId: string, nodeId: string) =>
		`/workflows/${workflowId}/nodes/${nodeId}/assets`,
};

/**
 * 列出工作流（SWR Hook）
 */
export function useWorkflows(projectId: string, shotName?: string) {
	const key = workflowKeys.list(projectId, shotName);
	return useSWR<ListWorkflowsResponse>(key, async () => {
		const params: { projectId: string; shotName?: string } = { projectId };
		if (shotName) params.shotName = shotName;
		const res = await http.get<ListWorkflowsResponse>("/workflows", { params });
		return res.data;
	});
}

/**
 * 获取工作流详情（SWR Hook）
 */
export function useWorkflow(id: string | null) {
	const key = id ? workflowKeys.detail(id) : null;
	return useSWR<WorkflowDocument>(key, async () => {
		const res = await http.get<WorkflowDocument>(`/workflows/${id}`);
		return res.data;
	});
}

/**
 * 列出模板（SWR Hook）
 */
export function useWorkflowTemplates(category?: "builtin" | "custom") {
	const key = workflowKeys.templates(category);
	return useSWR<WorkflowTemplateResponse>(key, async () => {
		const res = await http.get<WorkflowTemplateResponse>("/workflow-templates", {
			params: category ? { category } : undefined,
		});
		return res.data;
	});
}

/**
 * 创建工作流（Mutation）
 */
export async function createWorkflow(req: CreateWorkflowRequest): Promise<WorkflowDocument> {
	const res = await http.post<WorkflowDocument>("/workflows", req);
	return res.data;
}

/**
 * 更新工作流（Mutation）
 */
export async function updateWorkflow(id: string, req: UpdateWorkflowRequest): Promise<void> {
	await http.put(`/workflows/${id}`, req);
}

/**
 * 删除工作流（Mutation）
 */
export async function deleteWorkflow(id: string): Promise<void> {
	await http.delete(`/workflows/${id}`);
}

/**
 * 执行工作流（Mutation）
 */
export async function executeWorkflow(
	workflowId: string,
	req: ExecuteWorkflowRequest = {},
): Promise<ExecuteWorkflowResponse> {
	const res = await http.post<ExecuteWorkflowResponse>(`/workflows/${workflowId}/execute`, req);
	return res.data;
}

/**
 * 获取工作流执行详情（SWR Hook）
 */
export function useWorkflowExecution(workflowId: string | null, executionId: string | null) {
	const key = workflowId && executionId ? workflowKeys.execution(workflowId, executionId) : null;
	return useSWR<WorkflowExecutionDetailResponse>(
		key,
		async () => {
			const res = await http.get<WorkflowExecutionDetailResponse>(
				`/workflows/${workflowId}/executions/${executionId}`,
			);
			return res.data;
		},
		{
			refreshInterval: 2000, // Poll every 2s for running executions
			revalidateOnFocus: true,
		},
	);
}

/**
 * 列出节点输出资产（SWR Hook）
 */
export function useWorkflowOutputs(workflowId: string | null, nodeId: string | null) {
	const key = workflowId && nodeId ? workflowKeys.outputs(workflowId, nodeId) : null;
	return useSWR<ListWorkflowOutputsResponse>(key, async () => {
		if (!key) return { assets: [] };
		const res = await http.get<ListWorkflowOutputsResponse>(key);
		return res.data;
	});
}

/**
 * 取消工作流执行（Mutation）
 */
export async function cancelWorkflowExecution(
	workflowId: string,
	executionId: string,
): Promise<void> {
	await http.delete(`/workflows/${workflowId}/executions/${executionId}`);
}

/**
 * 重试失败节点（Mutation）
 */
export async function retryWorkflowExecution(
	workflowId: string,
	executionId: string,
	req: RetryWorkflowExecutionRequest,
): Promise<RetryWorkflowExecutionResponse> {
	const res = await http.post<RetryWorkflowExecutionResponse>(
		`/workflows/${workflowId}/executions/${executionId}/retry`,
		req,
	);
	return res.data;
}
