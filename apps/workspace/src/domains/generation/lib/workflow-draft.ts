export type WorkflowKind = "video" | "image" | "audio" | "text";
export const workflowKindLabels: Record<WorkflowKind, string> = {
	video: "视频",
	image: "图片",
	audio: "音频",
	text: "文字",
};

export interface WorkflowDraftNode {
	id: string;
	kind: WorkflowKind;
	title: string;
	position: { x: number; y: number };
	config: { prompt: string; candidateCount: number; params: Record<string, unknown> };
	value: { assetId?: string; url?: string; text?: string };
}

export interface WorkflowDraftGraph {
	schemaVersion: 3;
	nodes: WorkflowDraftNode[];
	edges: { id: string; source: string; sourcePort: string; target: string; targetPort: string }[];
	initialization: { seedResourcePrompt: false };
}

export interface WorkflowDraftDocument {
	id: string;
	name: string;
	graph: WorkflowDraftGraph;
}

export interface WorkflowDraftWorkspace {
	version: 1;
	activeDocumentId: string;
	documents: WorkflowDraftDocument[];
}

export const createWorkflowNode = (
	kind: WorkflowKind,
	position = { x: 0, y: 0 },
): WorkflowDraftNode => ({
	id: crypto.randomUUID(),
	kind,
	title: workflowKindLabels[kind],
	position,
	config: { prompt: "", candidateCount: 1, params: {} },
	value: {},
});

export const emptyWorkflowGraph = (): WorkflowDraftGraph => ({
	schemaVersion: 3,
	nodes: [],
	edges: [],
	initialization: { seedResourcePrompt: false },
});

export const initialWorkflowWorkspace = (): WorkflowDraftWorkspace => ({
	version: 1,
	activeDocumentId: "manual",
	documents: [
		{
			id: "manual",
			name: "手动创建工作流",
			graph: { ...emptyWorkflowGraph(), nodes: [createWorkflowNode("video")] },
		},
	],
});

export const activeWorkflowDocument = (state: WorkflowDraftWorkspace) => {
	const document = state.documents.find((item) => item.id === state.activeDocumentId);
	if (!document) throw new Error("当前工作流不存在");
	return document;
};

export const updateWorkflowGraph = (
	state: WorkflowDraftWorkspace,
	graph: WorkflowDraftGraph,
): WorkflowDraftWorkspace => ({
	...state,
	documents: state.documents.map((document) =>
		document.id === state.activeDocumentId ? { ...document, graph } : document,
	),
});

export const createWorkflowDocument = (
	state: WorkflowDraftWorkspace,
	name: string,
): WorkflowDraftWorkspace => {
	const base = name.trim();
	if (!base) throw new Error("请输入工作流名称");
	let unique = base;
	for (let index = 2; state.documents.some((document) => document.name === unique); index++)
		unique = `${base} ${index}`;
	const document = { id: crypto.randomUUID(), name: unique, graph: emptyWorkflowGraph() };
	return { ...state, activeDocumentId: document.id, documents: [...state.documents, document] };
};

const record = (value: unknown): value is Record<string, unknown> =>
	!!value && typeof value === "object" && !Array.isArray(value);

// Validate local drafts before rendering or replacing them; malformed data stays on disk.
export const parseWorkflowWorkspace = (raw: string): WorkflowDraftWorkspace => {
	const value: unknown = JSON.parse(raw);
	if (
		!record(value) ||
		value.version !== 1 ||
		typeof value.activeDocumentId !== "string" ||
		!Array.isArray(value.documents) ||
		!value.documents.length
	)
		throw new Error("本地工作流数据无效，原始数据已保留");
	const documents: WorkflowDraftDocument[] = value.documents.map((document: unknown) => {
		if (
			!record(document) ||
			typeof document.id !== "string" ||
			typeof document.name !== "string" ||
			!record(document.graph)
		)
			throw new Error("工作流文档无效");
		const graph = document.graph;
		if (graph.schemaVersion !== 3 || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges))
			throw new Error("工作流图数据无效");
		const nodes: WorkflowDraftNode[] = graph.nodes.map((node: unknown) => {
			if (
				!record(node) ||
				typeof node.id !== "string" ||
				!["video", "image", "audio", "text"].includes(String(node.kind)) ||
				typeof node.title !== "string" ||
				!record(node.position) ||
				typeof node.position.x !== "number" ||
				!Number.isFinite(node.position.x) ||
				typeof node.position.y !== "number" ||
				!Number.isFinite(node.position.y) ||
				!record(node.config) ||
				typeof node.config.prompt !== "string" ||
				typeof node.config.candidateCount !== "number" ||
				!record(node.config.params) ||
				!record(node.value)
			)
				throw new Error("工作流节点无效");
			const kind = node.kind as WorkflowKind;
			for (const key of ["assetId", "url", "text"])
				if (node.value[key] !== undefined && typeof node.value[key] !== "string")
					throw new Error("工作流素材无效");
			return {
				id: node.id,
				kind,
				title: node.title,
				position: { x: node.position.x, y: node.position.y },
				config: {
					prompt: node.config.prompt,
					candidateCount: node.config.candidateCount,
					params: node.config.params,
				},
				value: node.value,
			};
		});
		const ids = new Set(nodes.map((node) => node.id));
		if (ids.size !== nodes.length) throw new Error("工作流节点重复");
		const edges = graph.edges.map((edge: unknown) => {
			if (
				!record(edge) ||
				typeof edge.id !== "string" ||
				typeof edge.source !== "string" ||
				typeof edge.target !== "string" ||
				typeof edge.sourcePort !== "string" ||
				typeof edge.targetPort !== "string" ||
				!ids.has(edge.source) ||
				!ids.has(edge.target)
			)
				throw new Error("工作流连线无效");
			return {
				id: edge.id,
				source: edge.source,
				target: edge.target,
				sourcePort: edge.sourcePort,
				targetPort: edge.targetPort,
			};
		});
		return {
			id: document.id,
			name: document.name,
			graph: { ...emptyWorkflowGraph(), nodes, edges },
		};
	});
	if (new Set(documents.map((document) => document.id)).size !== documents.length)
		throw new Error("工作流文档重复");
	const state: WorkflowDraftWorkspace = {
		version: 1,
		activeDocumentId: value.activeDocumentId,
		documents,
	};
	activeWorkflowDocument(state);
	return state;
};
