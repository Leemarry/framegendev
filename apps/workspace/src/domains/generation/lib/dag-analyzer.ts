import type { WorkflowGraph, WorkflowNode } from "./workflow-schema-v4";

/**
 * 节点依赖关系
 */
export interface NodeDependencies {
	nodeId: string;
	upstreamIds: string[]; // 上游节点 IDs
	downstreamIds: string[]; // 下游节点 IDs
}

/**
 * 拓扑排序结果（按执行层级）
 */
export type TopologicalLayers = string[][];

/**
 * 分析工作流依赖关系
 */
export const analyzeDependencies = (graph: WorkflowGraph): Map<string, NodeDependencies> => {
	const depsMap = new Map<string, NodeDependencies>();

	// 初始化所有节点
	for (const node of graph.nodes) {
		depsMap.set(node.id, {
			nodeId: node.id,
			upstreamIds: [],
			downstreamIds: [],
		});
	}

	// 根据边构建依赖关系
	for (const edge of graph.edges) {
		const sourceDeps = depsMap.get(edge.source);
		const targetDeps = depsMap.get(edge.target);

		if (sourceDeps && targetDeps) {
			// source 是 target 的上游
			targetDeps.upstreamIds.push(edge.source);
			// target 是 source 的下游
			sourceDeps.downstreamIds.push(edge.source);
		}
	}

	return depsMap;
};

/**
 * 拓扑排序（Kahn 算法）
 * 返回按层级分组的节点 ID
 */
export const topologicalSort = (graph: WorkflowGraph): TopologicalLayers => {
	const depsMap = analyzeDependencies(graph);
	const layers: TopologicalLayers = [];
	const visited = new Set<string>();
	const inDegree = new Map<string, number>();

	// 计算每个节点的入度
	for (const [nodeId, deps] of depsMap) {
		inDegree.set(nodeId, deps.upstreamIds.length);
	}

	// 循环直到所有节点被访问
	while (visited.size < graph.nodes.length) {
		// 找出当前层：入度为 0 的节点
		const currentLayer: string[] = [];
		for (const [nodeId, degree] of inDegree) {
			if (degree === 0 && !visited.has(nodeId)) {
				currentLayer.push(nodeId);
			}
		}

		if (currentLayer.length === 0) {
			// 没有入度为 0 的节点，说明存在循环
			throw new Error("工作流存在循环依赖，无法执行");
		}

		layers.push(currentLayer);

		// 标记为已访问，并减少下游节点的入度
		for (const nodeId of currentLayer) {
			visited.add(nodeId);
			const deps = depsMap.get(nodeId);
			if (deps) {
				for (const downstreamId of deps.downstreamIds) {
					const currentDegree = inDegree.get(downstreamId) || 0;
					inDegree.set(downstreamId, currentDegree - 1);
				}
			}
		}
	}

	return layers;
};

/**
 * 检测循环依赖
 */
export const detectCycles = (graph: WorkflowGraph): string[] | null => {
	try {
		topologicalSort(graph);
		return null; // 没有循环
	} catch {
		// 简单实现：返回所有节点 ID（实际应该返回循环路径）
		return graph.nodes.map((n) => n.id);
	}
};

/**
 * 检查节点是否可以执行
 * 可执行条件：所有上游节点都已成功完成
 */
export const canExecuteNode = (
	nodeId: string,
	graph: WorkflowGraph,
	completedNodes: Set<string>,
): boolean => {
	const depsMap = analyzeDependencies(graph);
	const deps = depsMap.get(nodeId);

	if (!deps) return false;

	// 所有上游节点都必须已完成
	return deps.upstreamIds.every((upstreamId) => completedNodes.has(upstreamId));
};

/**
 * 获取节点的所有输入值
 * 从连接的上游节点的输出中提取
 */
export const getNodeInputValues = (
	node: WorkflowNode,
	graph: WorkflowGraph,
): Record<string, { dataType: string; value: unknown }> => {
	const inputs: Record<string, { dataType: string; value: unknown }> = {};

	// 找到所有连接到这个节点的边
	const incomingEdges = graph.edges.filter((edge) => edge.target === node.id);

	for (const edge of incomingEdges) {
		// 找到源节点
		const sourceNode = graph.nodes.find((n) => n.id === edge.source);
		if (!sourceNode) continue;

		// 从源节点的输出中提取值
		const sourceOutput = sourceNode.data.outputs?.[edge.sourceHandle];
		if (sourceOutput) {
			inputs[edge.targetHandle] = {
				dataType: sourceOutput.dataType,
				value: sourceOutput.value,
			};
		}
	}

	return inputs;
};

/**
 * 获取执行计划（可读的文本描述）
 */
export const getExecutionPlan = (graph: WorkflowGraph): string => {
	try {
		const layers = topologicalSort(graph);
		const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));

		let plan = `执行计划（共 ${layers.length} 层）：\n\n`;

		for (let i = 0; i < layers.length; i++) {
			plan += `第 ${i + 1} 层（并行执行）：\n`;
			for (const nodeId of layers[i]) {
				const node = nodeMap.get(nodeId);
				if (node) {
					plan += `  - ${node.data.label} (${node.type})\n`;
				}
			}
			plan += "\n";
		}

		return plan;
	} catch (error) {
		return `❌ ${error}`;
	}
};
