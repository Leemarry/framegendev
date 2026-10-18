import { describe, expect, it } from "vitest";
import { createWorkflowNode, emptyWorkflowGraph } from "./workflow-draft";
import { emptyWorkflowGraphV4 } from "./workflow-schema-v4";
import { migrateWorkflowGraph } from "./workflow-migration";

describe("workflow migration validation", () => {
	it("preserves valid v3 prompts and rejects incomplete node data", () => {
		const node = createWorkflowNode("image");
		node.config.prompt = "原始提示词";
		const graph = { ...emptyWorkflowGraph(), nodes: [node] };
		expect(migrateWorkflowGraph(graph).nodes[0].data.config?.prompt).toBe("原始提示词");
		expect(() => migrateWorkflowGraph({ ...graph, nodes: [{ id: "broken" }] })).toThrow();
	});
	it("validates v4 node contents rather than only checking arrays", () => {
		expect(migrateWorkflowGraph(emptyWorkflowGraphV4())).toEqual(emptyWorkflowGraphV4());
		expect(() => migrateWorkflowGraph({ ...emptyWorkflowGraphV4(), nodes: [null] })).toThrow();
		expect(() =>
			migrateWorkflowGraph({ ...emptyWorkflowGraphV4(), viewport: { x: 0, y: 0, zoom: NaN } }),
		).toThrow();
	});
});
