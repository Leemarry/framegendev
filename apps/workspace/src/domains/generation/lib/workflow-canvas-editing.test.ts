import { describe, expect, it } from "vitest";
import { arrangeWorkflowNodes, pasteWorkflowNodes } from "./workflow-canvas-editing";
import { emptyWorkflowGraphV4, getDefaultHandles, type WorkflowGraph } from "./workflow-schema-v4";

const graph: WorkflowGraph = {
	...emptyWorkflowGraphV4(),
	nodes: ["a", "b", "c"].map((id, index) => ({
		id,
		type: "textNode",
		position: { x: index * 20, y: 40 },
		data: { label: id, handles: getDefaultHandles("textNode"), config: { prompt: id } },
	})),
	edges: [
		{ id: "ab", source: "a", sourceHandle: "output", target: "b", targetHandle: "in" },
		{ id: "bc", source: "b", sourceHandle: "output", target: "c", targetHandle: "in" },
	],
};

describe("canvas editing", () => {
	it("duplicates a selection with fresh internal links and independent node data", () => {
		const next = pasteWorkflowNodes(
			graph,
			{ nodes: graph.nodes.slice(0, 2), edges: graph.edges },
			{ x: 100, y: 200 },
		);
		expect(next.nodes).toHaveLength(5);
		expect(next.edges).toHaveLength(3);
		expect(next.nodes[3].position).toEqual({ x: 100, y: 200 });
		expect(next.nodes[4].position).toEqual({ x: 120, y: 200 });
		expect(next.edges[2]).toMatchObject({ source: next.nodes[3].id, target: next.nodes[4].id });
		next.nodes[3].data.config!.prompt = "edited";
		expect(graph.nodes[0].data.config?.prompt).toBe("a");
	});
	it("orders connected nodes left to right and terminates for cyclic legacy graphs", () => {
		const next = arrangeWorkflowNodes(graph);
		expect(next.nodes[0].position.x).toBeLessThan(next.nodes[1].position.x);
		expect(next.nodes[1].position.x).toBeLessThan(next.nodes[2].position.x);
		const cyclic = arrangeWorkflowNodes({
			...graph,
			edges: [
				...graph.edges,
				{ id: "ca", source: "c", sourceHandle: "output", target: "a", targetHandle: "in" },
			],
		});
		expect(new Set(cyclic.nodes.map((node) => `${node.position.x}:${node.position.y}`)).size).toBe(
			3,
		);
	});
});
