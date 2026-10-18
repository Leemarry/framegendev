import { describe, expect, it } from "vitest";
import {
	arrangeWorkflowNodes,
	pasteWorkflowNodes,
	groupWorkflowNodes,
	ungroupWorkflowNodes,
	workflowAbsolutePosition,
	workflowSelectionTree,
	connectionToNewNode,
	arrangeWorkflowSelection,
} from "./workflow-canvas-editing";
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
	it("preserves child world coordinates through grouping, copying and ungrouping", () => {
		const grouped = groupWorkflowNodes(graph, ["a", "b"]);
		const group = grouped.nodes[0];
		expect(group.type).toBe("canvasGroup");
		for (const id of ["a", "b"])
			expect(
				workflowAbsolutePosition(grouped.nodes.find((node) => node.id === id)!, grouped.nodes),
			).toEqual(graph.nodes.find((node) => node.id === id)!.position);
		const tree = workflowSelectionTree(grouped.nodes, [group.id]);
		const copied = pasteWorkflowNodes(
			grouped,
			{ nodes: tree, edges: grouped.edges },
			{ x: 600, y: 400 },
		);
		const clone = copied.nodes.slice(grouped.nodes.length);
		expect(clone).toHaveLength(3);
		expect(clone[1].parentId).toBe(clone[0].id);
		expect(clone[1].position).toEqual(grouped.nodes.find((node) => node.id === "a")!.position);
		const ungrouped = ungroupWorkflowNodes(grouped, [group.id]);
		expect(ungrouped.nodes).toHaveLength(3);
		expect(ungrouped.nodes.map((node) => node.position)).toEqual(
			graph.nodes.map((node) => node.position),
		);
	});
	it("arranges children in different groups in world coordinates", () => {
		const grouped = groupWorkflowNodes(graph, ["a"]);
		const arranged = arrangeWorkflowSelection(grouped, ["a", "c"], "vertical");
		const a = arranged.nodes.find((node) => node.id === "a")!;
		const c = arranged.nodes.find((node) => node.id === "c")!;
		expect(workflowAbsolutePosition(a, arranged.nodes).x).toBe(c.position.x);
		expect(c.position.y).toBeGreaterThan(workflowAbsolutePosition(a, arranged.nodes).y);
	});
	it("resolves both output and input drags, and rejects incompatible node types", () => {
		const image = {
			...graph.nodes[0],
			id: "image",
			type: "imageNode",
			data: { label: "image", handles: getDefaultHandles("imageNode") },
		};
		const generator = {
			...graph.nodes[1],
			id: "generator",
			type: "imageGeneration",
			data: { label: "generate", handles: getDefaultHandles("imageGeneration") },
		};
		const canvas = { ...graph, nodes: [image, generator], edges: [] };
		expect(
			connectionToNewNode(
				canvas,
				{ nodeId: image.id, handleId: "output", type: "source" },
				generator,
			),
		).toMatchObject({ source: image.id, target: generator.id, targetHandle: "in" });
		expect(
			connectionToNewNode(canvas, { nodeId: generator.id, handleId: "in", type: "target" }, image),
		).toMatchObject({ source: image.id, target: generator.id });
		expect(
			connectionToNewNode(
				canvas,
				{ nodeId: image.id, handleId: "output", type: "source" },
				{ ...generator, data: { ...generator.data, handles: getDefaultHandles("audioNode") } },
			),
		).toBeUndefined();
	});
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
