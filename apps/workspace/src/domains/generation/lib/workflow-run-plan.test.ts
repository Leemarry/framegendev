import { describe, expect, it } from "vitest";
import { workflowRunPlan } from "./workflow-run-plan";
import { emptyWorkflowGraphV4, getDefaultHandles, type WorkflowNode } from "./workflow-schema-v4";

const node = (id: string, type: string): WorkflowNode => ({
	id,
	type,
	position: { x: 0, y: 0 },
	data: { label: id, handles: getDefaultHandles(type), config: { modelId: "configured" } },
});
describe("workflow run plan", () => {
	it("orders generators by dependencies even when canvas array order is reversed", () => {
		const graph = {
			...emptyWorkflowGraphV4(),
			nodes: [
				node("video", "videoGeneration"),
				node("image", "imageGeneration"),
				node("text", "textNode"),
			],
			edges: [
				{
					id: "ti",
					source: "text",
					sourceHandle: "output",
					target: "image",
					targetHandle: "in",
					dataType: "TEXT" as const,
				},
				{
					id: "iv",
					source: "image",
					sourceHandle: "image",
					target: "video",
					targetHandle: "in",
					dataType: "IMAGE" as const,
				},
			],
		};
		expect(workflowRunPlan(graph)).toEqual(["text", "image", "video"]);
		graph.nodes.find((item) => item.id === "text")!.data.config = {};
		expect(() => workflowRunPlan(graph)).toThrow("请先填写或上传");
		graph.nodes.find((item) => item.id === "text")!.data.outputs = {
			output: { dataType: "TEXT", value: "已写好的提示词" },
		};
		expect(workflowRunPlan(graph)).toEqual(["image", "video"]);
	});
	it("rejects cycles and nodes already generating before any requests are sent", () => {
		const graph = {
			...emptyWorkflowGraphV4(),
			nodes: [node("a", "imageGeneration"), node("b", "imageGeneration")],
			edges: [
				{ id: "ab", source: "a", sourceHandle: "image", target: "b", targetHandle: "in" },
				{ id: "ba", source: "b", sourceHandle: "image", target: "a", targetHandle: "in" },
			],
		};
		expect(() => workflowRunPlan(graph)).toThrow("循环");
		graph.edges = [];
		graph.nodes[0].data.status = "generating";
		expect(() => workflowRunPlan(graph)).toThrow("正在生成");
	});
});
