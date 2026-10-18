import { validateConnection } from "./node-connection";
import type { WorkflowGraph, WorkflowNode } from "./workflow-schema-v4";

export const isWorkflowGenerator = (node: WorkflowNode) =>
	["imageGeneration", "videoGeneration", "audioGeneration"].includes(node.type) ||
	(node.type === "textNode" && !!node.data.config?.modelId);

/** Build a dependency order and reject missing inputs before submitting any paid task. */
export function workflowRunPlan(graph: WorkflowGraph): string[] {
	const nodes = graph.nodes.filter((node) => node.type !== "canvasGroup");
	const byId = new Map(nodes.map((node) => [node.id, node]));
	for (const edge of graph.edges) {
		const source = byId.get(edge.source);
		const target = byId.get(edge.target);
		if (!source || !target) throw new Error("画布包含失效连线，请删除后重连");
		const validation = validateConnection(
			source,
			edge.sourceHandle,
			target,
			edge.targetHandle,
			graph.edges.filter((item) => item.id !== edge.id),
		);
		if (!validation.valid) throw new Error(`${target.data.label}：${validation.reason}`);
		if (!isWorkflowGenerator(source)) {
			const output = source.data.outputs?.[edge.sourceHandle];
			if (!output || typeof output.value !== "string" || !output.value.trim())
				throw new Error(`请先填写或上传「${source.data.label}」的内容`);
		}
	}
	const remaining = new Set(nodes.map((node) => node.id));
	const queue: string[] = [];
	while (remaining.size) {
		const ready = nodes.filter(
			(node) =>
				remaining.has(node.id) &&
				!graph.edges.some((edge) => edge.target === node.id && remaining.has(edge.source)),
		);
		if (!ready.length) throw new Error("工作流包含循环依赖");
		for (const node of ready) {
			remaining.delete(node.id);
			if (!isWorkflowGenerator(node)) continue;
			if (!node.data.config?.modelId) throw new Error(`请为「${node.data.label}」选择模型`);
			if (node.data.status === "generating")
				throw new Error(`「${node.data.label}」正在生成，请等待结束`);
			queue.push(node.id);
		}
	}
	if (!queue.length) throw new Error("请先添加图片、视频或音频生成节点");
	return queue;
}

export const workflowTopology = (graph: WorkflowGraph) =>
	JSON.stringify({
		nodes: graph.nodes.map((node) => [node.id, node.type]).sort(),
		edges: graph.edges
			.map((edge) => [edge.source, edge.sourceHandle, edge.target, edge.targetHandle])
			.sort(),
	});
