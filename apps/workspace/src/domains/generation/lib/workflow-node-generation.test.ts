import { describe, expect, it } from "vitest";
import { workflowNodeRequest, workflowNodeResult } from "./workflow-node-generation";
import { emptyWorkflowGraphV4, getDefaultHandles, type WorkflowNode } from "./workflow-schema-v4";
import type { GenerationModelsResponse, GenerationMessageResponse } from "../api/generation";

const node: WorkflowNode = {
	id: "generate",
	type: "imageGeneration",
	position: { x: 0, y: 0 },
	data: {
		label: "图片",
		handles: getDefaultHandles("imageGeneration"),
		config: { modelId: "configured-image", prompt: "日落", params: { assetId: "old-output" } },
	},
};
const catalog: GenerationModelsResponse = {
	families: [],
	versions: [],
	providers: [],
	routes: [],
	models: [
		{
			id: "configured-image",
			kind: "image",
			provider: "local",
			model: "image-model",
			label: "Image",
			adapter: "local",
			docUrl: "",
			async: false,
			supportsReferenceUrls: true,
			params: [],
		},
	],
};
const scope = { projectId: "project", documentId: "doc", workflowId: "flow" };
const response: GenerationMessageResponse = {
	id: "task",
	role: "assistant",
	status: "completed",
	message: "",
	assets: [
		{ kind: "image", url: "/first.png", assetId: "first" },
		{ kind: "image", url: "/second.png" },
	],
	usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, reasoningTokens: 0, cachedTokens: 0 },
};

describe("workflow node generation", () => {
	it("collects connected text and media while keeping internal asset metadata out of parameters", () => {
		const text: WorkflowNode = {
			...node,
			id: "text",
			type: "textNode",
			data: {
				label: "提示",
				handles: getDefaultHandles("textNode"),
				outputs: { output: { dataType: "TEXT", value: "海边" } },
			},
		};
		const image: WorkflowNode = {
			...node,
			id: "image",
			type: "imageNode",
			data: {
				label: "参考",
				handles: getDefaultHandles("imageNode"),
				config: { params: { assetId: "reference" } },
				outputs: { output: { dataType: "IMAGE", value: "/reference.png" } },
			},
		};
		const graph = {
			...emptyWorkflowGraphV4(),
			nodes: [text, image, node],
			edges: [text, image].map((source) => ({
				id: source.id,
				source: source.id,
				sourceHandle: "output",
				target: node.id,
				targetHandle: "in",
			})),
		};
		const request = workflowNodeRequest(graph, node, catalog, scope);
		expect(request.prompt).toBe("海边\n\n日落");
		expect(request.referenceUrls).toEqual(["/reference.png"]);
		expect(request.referenceAssetIds).toEqual(["reference"]);
		expect(request.params).not.toHaveProperty("assetId");
		delete text.data.outputs;
		expect(() => workflowNodeRequest(graph, node, catalog, scope)).toThrow("还没有输出");
	});
	it("keeps queued results pending and stores every real candidate on completion", () => {
		expect(workflowNodeResult(node, { ...response, status: "submitted" })).toEqual({
			status: "generating",
			taskId: "task",
		});
		const result = workflowNodeResult(node, response);
		expect(result.candidates).toHaveLength(2);
		expect(result.outputs?.image.value).toBe("/first.png");
		expect(result.config?.params?.assetId).toBe("first");
		expect(workflowNodeResult(node, { ...response, assets: [] }).status).toBe("failed");
		expect(
			workflowNodeResult(node, { ...response, status: "failed", error: "provider unavailable" }),
		).toMatchObject({ status: "failed", error: "provider unavailable" });
	});
});
