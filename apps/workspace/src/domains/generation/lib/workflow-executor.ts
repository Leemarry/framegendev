import type { NodeDataType, WorkflowGraph, WorkflowNode } from "./workflow-schema-v4";
import { canExecuteNode, getNodeInputValues, topologicalSort } from "./dag-analyzer";

/**
 * 执行模式
 */
export type ExecutionMode = "manual" | "auto";

/**
 * 节点执行器（由具体的节点类型实现）
 */
export interface NodeExecutor {
	nodeType: string;
	execute: (
		node: WorkflowNode,
		inputs: Record<string, { dataType: string; value: unknown }>,
	) => Promise<{ handleId: string; dataType: NodeDataType; value: unknown }[]>;
}

/**
 * 执行上下文
 */
export interface ExecutionContext {
	mode: ExecutionMode;
	graph: WorkflowGraph;
	executors: Map<string, NodeExecutor>; // nodeType → executor
	onNodeStart?: (nodeId: string) => void;
	onNodeComplete?: (nodeId: string, outputs: Record<string, unknown>) => void;
	onNodeError?: (nodeId: string, error: Error) => void;
}

/**
 * 执行结果
 */
export interface ExecutionResult {
	success: boolean;
	completedNodes: string[];
	failedNodes: Array<{ nodeId: string; error: string }>;
}

/**
 * 工作流执行器
 */
export class WorkflowExecutor {
	private context: ExecutionContext;
	private completedNodes = new Set<string>();
	private failedNodes = new Map<string, Error>();

	constructor(context: ExecutionContext) {
		this.context = context;
	}

	/**
	 * 执行单个节点（手动模式）
	 */
	async executeNode(nodeId: string): Promise<void> {
		const node = this.context.graph.nodes.find((n) => n.id === nodeId);
		if (!node) {
			throw new Error(`节点不存在：${nodeId}`);
		}

		// 检查是否可以执行
		if (!canExecuteNode(nodeId, this.context.graph, this.completedNodes)) {
			const upstreamIds = this.context.graph.edges
				.filter((e) => e.target === nodeId)
				.map((e) => e.source);

			const incompletedUpstreams = upstreamIds.filter((id) => !this.completedNodes.has(id));

			throw new Error(
				`节点无法执行：以下上游节点尚未完成：${incompletedUpstreams.map((id) => this.context.graph.nodes.find((n) => n.id === id)?.data.label || id).join("、")}`,
			);
		}

		// 获取执行器
		const executor = this.context.executors.get(node.type);
		if (!executor) {
			throw new Error(`未找到节点类型的执行器：${node.type}`);
		}

		// 获取输入值
		const inputs = getNodeInputValues(node, this.context.graph);

		// 执行节点
		try {
			this.context.onNodeStart?.(nodeId);

			// 更新节点状态为"生成中"
			node.data.status = "generating";

			// 调用执行器
			const outputs = await executor.execute(node, inputs);

			// 更新节点输出
			node.data.outputs = {};
			for (const output of outputs) {
				node.data.outputs[output.handleId] = {
					dataType: output.dataType,
					value: output.value,
				};
			}

			// 更新节点状态为"成功"
			node.data.status = "succeeded";
			this.completedNodes.add(nodeId);

			this.context.onNodeComplete?.(
				nodeId,
				Object.fromEntries(outputs.map((o) => [o.handleId, o.value])),
			);
		} catch (error) {
			// 更新节点状态为"失败"
			node.data.status = "failed";
			node.data.error = error instanceof Error ? error.message : String(error);
			this.failedNodes.set(nodeId, error instanceof Error ? error : new Error(String(error)));

			this.context.onNodeError?.(nodeId, error instanceof Error ? error : new Error(String(error)));

			throw error;
		}
	}

	/**
	 * 自动执行整个工作流（按拓扑排序）
	 */
	async executeAll(): Promise<ExecutionResult> {
		const layers = topologicalSort(this.context.graph);

		for (const layer of layers) {
			// 并行执行同一层的节点
			await Promise.allSettled(layer.map((nodeId) => this.executeNode(nodeId)));

			// 检查是否有失败的节点
			const failedInLayer = layer.filter((nodeId) => this.failedNodes.has(nodeId));
			if (failedInLayer.length > 0) {
				// 根据用户选择（问题1选A：保留部分结果）
				// 不回滚，停止执行后续层
				break;
			}
		}

		return {
			success: this.failedNodes.size === 0,
			completedNodes: Array.from(this.completedNodes),
			failedNodes: Array.from(this.failedNodes.entries()).map(([nodeId, error]) => ({
				nodeId,
				error: error.message,
			})),
		};
	}

	/**
	 * 重置执行状态
	 */
	reset(): void {
		this.completedNodes.clear();
		this.failedNodes.clear();

		// 重置所有节点状态
		for (const node of this.context.graph.nodes) {
			node.data.status = "idle";
			node.data.error = undefined;
		}
	}

	/**
	 * 获取已完成的节点集合
	 */
	getCompletedNodes(): Set<string> {
		return new Set(this.completedNodes);
	}
}

/**
 * Mock 节点执行器（开发用）
 */
export const createMockExecutor = (nodeType: string, delay = 2000): NodeExecutor => ({
	nodeType,
	execute: async (node, inputs) => {
		console.log(`[MockExecutor] ${nodeType} 开始执行`, { node, inputs });

		// 模拟延迟
		await new Promise((resolve) => setTimeout(resolve, delay));

		// 模拟输出
		const outputs = node.data.handles
			.filter((h) => h.type === "source")
			.map((h) => ({
				handleId: h.id,
				dataType: Array.isArray(h.dataType) ? h.dataType[0] : h.dataType,
				value: `mock-asset-${Math.random().toString(36).slice(2, 9)}`,
			}));

		console.log(`[MockExecutor] ${nodeType} 执行完成`, outputs);

		return outputs;
	},
});
