import { parseWorkflowWorkspace, type WorkflowDraftNode } from "./workflow-draft";
import {
	type NodeDataType,
	type WorkflowGraph,
	type WorkflowEdge,
	type WorkflowNode,
	emptyWorkflowGraphV4,
	getDefaultHandles,
} from "./workflow-schema-v4";

const record = (value: unknown): value is Record<string, unknown> =>
	!!value && typeof value === "object" && !Array.isArray(value);
const point = (value: unknown): value is Record<string, unknown> & { x: number; y: number } =>
	record(value) && Number.isFinite(value.x) && Number.isFinite(value.y);
const dataType = (value: unknown): value is NodeDataType =>
	typeof value === "string" &&
	[
		"STRING",
		"INT",
		"FLOAT",
		"BOOLEAN",
		"IMAGE",
		"MASK",
		"VIDEO",
		"AUDIO",
		"TEXT",
		"MODEL",
		"*",
	].includes(value);
const node = (value: unknown): value is WorkflowNode => {
	if (
		!record(value) ||
		typeof value.id !== "string" ||
		typeof value.type !== "string" ||
		!point(value.position) ||
		!record(value.data) ||
		typeof value.data.label !== "string" ||
		!Array.isArray(value.data.handles)
	)
		return false;
	const handles = value.data.handles;
	const data = value.data;
	return (
		handles.every(
			(handle: unknown) =>
				record(handle) &&
				typeof handle.id === "string" &&
				(handle.type === "source" || handle.type === "target") &&
				(dataType(handle.dataType) ||
					(Array.isArray(handle.dataType) && handle.dataType.every(dataType))),
		) &&
		(data.config === undefined ||
			(record(data.config) &&
				(data.config.prompt === undefined || typeof data.config.prompt === "string") &&
				(data.config.modelId === undefined || typeof data.config.modelId === "string") &&
				(data.config.params === undefined || record(data.config.params)))) &&
		(data.outputs === undefined ||
			(record(data.outputs) &&
				Object.values(data.outputs).every(
					(output) => record(output) && dataType(output.dataType),
				))) &&
		(data.status === undefined ||
			["idle", "generating", "succeeded", "failed"].includes(String(data.status))) &&
		(data.error === undefined || typeof data.error === "string")
	);
};
const edge = (value: unknown): value is WorkflowEdge =>
	record(value) &&
	["id", "source", "target", "sourceHandle", "targetHandle"].every(
		(key) => typeof value[key] === "string",
	) &&
	(value.dataType === undefined || dataType(value.dataType));

/**
 * v3 节点类型 → v4 节点类型
 */
const nodeKindToType = (kind: string): string => {
	switch (kind) {
		case "video":
			return "videoGeneration";
		case "image":
			return "imageGeneration";
		case "audio":
			return "audioGeneration";
		case "text":
			return "textNode";
		default:
			return "videoGeneration"; // fallback
	}
};

/**
 * v3 节点类型 → v4 数据类型
 */
const kindToDataType = (kind: string): NodeDataType => {
	switch (kind) {
		case "video":
			return "VIDEO";
		case "image":
			return "IMAGE";
		case "audio":
			return "AUDIO";
		case "text":
			return "TEXT";
		default:
			return "VIDEO";
	}
};

/**
 * 迁移单个 v3 节点到 v4
 */
const migrateNodeV3ToV4 = (v3Node: WorkflowDraftNode): WorkflowNode => {
	const nodeType = nodeKindToType(v3Node.kind);
	const handles = getDefaultHandles(nodeType);

	// 如果 v3 节点有输出值，迁移到 v4 的 outputs
	const outputs: WorkflowNode["data"]["outputs"] = {};
	if (v3Node.value.assetId || v3Node.value.url) {
		outputs.output = {
			dataType: kindToDataType(v3Node.kind),
			value: v3Node.value.assetId || v3Node.value.url,
		};
	}

	return {
		id: v3Node.id,
		type: nodeType,
		position: v3Node.position,
		data: {
			label: v3Node.title,
			handles,
			config: {
				prompt: v3Node.config.prompt,
				params: v3Node.config.params,
			},
			outputs: Object.keys(outputs).length > 0 ? outputs : undefined,
			status: v3Node.value.assetId ? "succeeded" : "idle",
		},
	};
};

/**
 * v3 → v4 迁移
 */
export const migrateWorkflowGraph = (raw: unknown): WorkflowGraph => {
	// 类型守卫
	const isRecord = (value: unknown): value is Record<string, unknown> =>
		!!value && typeof value === "object" && !Array.isArray(value);

	if (!isRecord(raw) || typeof raw.schemaVersion !== "number") {
		throw new Error("无效的工作流数据：缺少 schemaVersion");
	}

	// v4 直接返回
	if (raw.schemaVersion === 4) {
		if (
			!Array.isArray(raw.nodes) ||
			!raw.nodes.every(node) ||
			!Array.isArray(raw.edges) ||
			!raw.edges.every(edge) ||
			!isRecord(raw.viewport) ||
			typeof raw.viewport.x !== "number" ||
			typeof raw.viewport.y !== "number" ||
			typeof raw.viewport.zoom !== "number"
		) {
			throw new Error("无效的 v4 工作流数据：缺少必需字段");
		}
		if (!point(raw.viewport) || !Number.isFinite(raw.viewport.zoom) || raw.viewport.zoom <= 0)
			throw new Error("无效的 v4 工作流视口");
		return {
			schemaVersion: 4,
			nodes: raw.nodes,
			edges: raw.edges,
			viewport: { x: raw.viewport.x, y: raw.viewport.y, zoom: raw.viewport.zoom },
		};
	}

	// v3 → v4 迁移
	if (raw.schemaVersion === 3) {
		const v3 = parseWorkflowWorkspace(
			JSON.stringify({
				version: 1,
				activeDocumentId: "migration",
				documents: [{ id: "migration", name: "migration", graph: raw }],
			}),
		).documents[0].graph;

		return {
			schemaVersion: 4,
			nodes: v3.nodes.map(migrateNodeV3ToV4),
			edges: v3.edges.map((edge) => ({
				id: edge.id,
				source: edge.source,
				sourceHandle: edge.sourcePort,
				target: edge.target,
				targetHandle: edge.targetPort,
			})),
			viewport: { x: 0, y: 0, zoom: 1 }, // v3 没有 viewport，使用默认值
		};
	}

	throw new Error(`不支持的工作流版本：${raw.schemaVersion}`);
};

/**
 * 验证工作流数据是否有效
 */
export const validateWorkflowGraph = (graph: WorkflowGraph): boolean => {
	// 检查必需字段
	if (
		!Array.isArray(graph.nodes) ||
		!Array.isArray(graph.edges) ||
		!graph.viewport ||
		typeof graph.viewport.x !== "number" ||
		typeof graph.viewport.y !== "number" ||
		typeof graph.viewport.zoom !== "number"
	) {
		return false;
	}

	// 检查节点 ID 唯一性
	const nodeIds = new Set(graph.nodes.map((node) => node.id));
	if (nodeIds.size !== graph.nodes.length) {
		return false;
	}

	// 检查边的端点存在
	for (const edge of graph.edges) {
		if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
			return false;
		}
	}

	return true;
};

/**
 * 向后兼容：尝试从任意数据加载工作流
 */
export const loadWorkflowGraph = (raw: unknown): WorkflowGraph => {
	try {
		const graph = migrateWorkflowGraph(raw);
		if (!validateWorkflowGraph(graph)) {
			throw new Error("工作流数据验证失败");
		}
		return graph;
	} catch (error) {
		console.error("工作流数据加载失败，使用空白画布", error);
		return emptyWorkflowGraphV4();
	}
};
