import type {
	GenerationMessageRequest,
	GenerationMessageResponse,
	GenerationModelsResponse,
} from "../api/generation";
import type { WorkflowGraph, WorkflowNode } from "./workflow-schema-v4";

/** Resolve the configured catalog route and connected values before sending a real request. */
export function workflowNodeRequest(
	graph: WorkflowGraph,
	node: WorkflowNode,
	catalog: GenerationModelsResponse,
	scope: { projectId: string; documentId: string; workflowId: string },
): GenerationMessageRequest {
	const kind =
		node.type === "imageGeneration"
			? "image"
			: node.type === "videoGeneration"
				? "video"
				: node.type === "audioGeneration"
					? "audio"
					: node.type === "textNode"
						? "text"
						: undefined;
	if (!kind) throw new Error("该节点不支持生成");
	const id = node.data.config?.modelId;
	if (!id) throw new Error("请先选择生成模型");
	const route = catalog.routes.find(
		(item) => item.kind === kind && (item.id === id || item.legacyModelId === id),
	);
	const model = catalog.models.find((item) => item.kind === kind && item.id === id);
	if (!route && !model) throw new Error("请先选择可用的生成模型");
	if (route && (route.status !== "available" || route.configured === false))
		throw new Error(route.statusReason || "模型尚未配置，请在生成设置中完成配置");
	const references = graph.edges
		.filter((edge) => edge.target === node.id)
		.map((edge) => {
			const source = graph.nodes.find((item) => item.id === edge.source);
			const output = source?.data.outputs?.[edge.sourceHandle];
			if (!output || typeof output.value !== "string" || !output.value.trim())
				throw new Error(`引用节点「${source?.data.label ?? edge.source}」还没有输出`);
			return { output, assetId: source?.data.config?.params?.assetId };
		});
	const prompt = [
		...references
			.filter(({ output }) => ["TEXT", "STRING"].includes(output.dataType))
			.map(({ output }) => output.value),
		node.data.config?.prompt ?? "",
	]
		.filter(Boolean)
		.join("\n\n")
		.trim();
	if (!prompt) throw new Error("请输入提示词或连接文本节点");
	const media = references.filter(({ output }) => !["TEXT", "STRING"].includes(output.dataType));
	if (kind === "audio" && media.length > 1) throw new Error("音频生成只能引用一份图片或音频");
	if (media.length && !(route ?? model)!.supportsReferenceUrls)
		throw new Error("当前模型不支持引用素材");
	if (route?.maxReferenceUrls && media.length > route.maxReferenceUrls)
		throw new Error(`当前模型最多支持 ${route.maxReferenceUrls} 份引用素材`);
	const params = Object.fromEntries(
		(route?.params ?? model?.params ?? [])
			.filter((param) => param.default !== undefined)
			.map((param) => [param.name, param.default]),
	);
	Object.assign(params, node.data.config?.params);
	delete params.assetId;
	for (const param of route?.params ?? model?.params ?? [])
		if (param.required && (params[param.name] === undefined || params[param.name] === ""))
			throw new Error(`请配置${param.label}`);
	return {
		kind,
		projectId: scope.projectId,
		documentId: scope.documentId,
		sessionId: `workflow-${scope.workflowId}-${node.id}`,
		routeId: route?.id ?? "",
		modelId: model?.id ?? route?.legacyModelId ?? "",
		model: route?.model ?? model!.model,
		provider: route?.provider ?? model!.provider,
		prompt,
		assetTitle: node.data.label,
		referenceUrls: [...new Set(media.map(({ output }) => String(output.value)))],
		referenceAssetIds: [
			...new Set(
				media.map(({ assetId }) => (typeof assetId === "string" ? assetId : "")).filter(Boolean),
			),
		],
		params,
	};
}

/** Keep candidates and update only the selected output; failures never fake a successful result. */
export function workflowNodeResult(
	node: WorkflowNode,
	result: GenerationMessageResponse,
): Partial<WorkflowNode["data"]> {
	if (["failed", "error", "cancelled"].includes(result.status) || result.error)
		return {
			status: "failed",
			error: result.error || result.message || "生成失败",
			taskId: undefined,
		};
	if (["submitted", "queued", "pending", "running", "processing"].includes(result.status))
		return { status: "generating", taskId: result.id };
	if (node.type === "textNode" && result.text?.trim()) {
		const handle = node.data.handles.find((item) => item.type === "source");
		return {
			status: "succeeded",
			taskId: undefined,
			error: undefined,
			outputs: {
				...node.data.outputs,
				[handle?.id ?? "output"]: { dataType: "TEXT", value: result.text },
			},
		};
	}
	const candidates = result.assets.flatMap((asset) => {
		const url =
			asset.url ||
			(asset.base64 && asset.mimeType
				? `data:${asset.mimeType};base64,${asset.base64}`
				: undefined);
		if (!url) return [];
		const dataType =
			asset.kind === "image"
				? ("IMAGE" as const)
				: asset.kind === "video"
					? ("VIDEO" as const)
					: asset.kind === "audio"
						? ("AUDIO" as const)
						: undefined;
		return dataType ? [{ url, dataType, assetId: asset.assetId }] : [];
	});
	if (!candidates.length) {
		if (["completed", "succeeded", "success"].includes(result.status))
			return { status: "failed", error: "任务已结束，但未返回可用素材", taskId: undefined };
		return { status: "generating", taskId: result.id };
	}
	const handle = node.data.handles.find((item) => item.type === "source");
	return {
		status: "succeeded",
		error: undefined,
		taskId: undefined,
		candidates,
		selectedCandidate: 0,
		config: {
			...node.data.config,
			params: { ...node.data.config?.params, assetId: candidates[0].assetId },
		},
		outputs: {
			...node.data.outputs,
			[handle?.id ?? "output"]: { dataType: candidates[0].dataType, value: candidates[0].url },
		},
	};
}
