import type { WorkflowGraph } from "./workflow-schema-v4";

export interface CanvasOperation {
	label: string;
	before: WorkflowGraph;
	after: WorkflowGraph;
}

/** Copy only selected nodes and their internal connections, with fresh IDs. */
export function pasteWorkflowNodes(
	graph: WorkflowGraph,
	selection: Pick<WorkflowGraph, "nodes" | "edges">,
	position: { x: number; y: number },
): WorkflowGraph {
	if (!selection.nodes.length) return graph;
	const ids = new Map(selection.nodes.map((node) => [node.id, crypto.randomUUID()]));
	const origin = {
		x: Math.min(...selection.nodes.map((node) => node.position.x)),
		y: Math.min(...selection.nodes.map((node) => node.position.y)),
	};
	return {
		...graph,
		nodes: [
			...graph.nodes,
			...selection.nodes.map((node) => ({
				...structuredClone(node),
				id: ids.get(node.id)!,
				position: {
					x: node.position.x - origin.x + position.x,
					y: node.position.y - origin.y + position.y,
				},
			})),
		],
		edges: [
			...graph.edges,
			...selection.edges
				.filter((edge) => ids.has(edge.source) && ids.has(edge.target))
				.map((edge) => ({
					...edge,
					id: crypto.randomUUID(),
					source: ids.get(edge.source)!,
					target: ids.get(edge.target)!,
				})),
		],
	};
}

/** Lay out a DAG in columns. Cyclic legacy nodes stay in a final column. */
export function arrangeWorkflowNodes(graph: WorkflowGraph): WorkflowGraph {
	const levels = new Map<string, number>();
	const remaining = new Set(graph.nodes.map((node) => node.id));
	while (remaining.size) {
		const ready = [...remaining].filter(
			(id) => !graph.edges.some((edge) => edge.target === id && remaining.has(edge.source)),
		);
		if (!ready.length) break;
		for (const id of ready) {
			const parents = graph.edges.filter((edge) => edge.target === id);
			levels.set(id, Math.max(0, ...parents.map((edge) => (levels.get(edge.source) ?? -1) + 1)));
			remaining.delete(id);
		}
	}
	const lastLevel = Math.max(0, ...levels.values()) + 1;
	const rows = new Map<number, number>();
	return {
		...graph,
		nodes: graph.nodes.map((node) => {
			const column = levels.get(node.id) ?? lastLevel;
			const row = rows.get(column) ?? 0;
			rows.set(column, row + 1);
			return { ...node, position: { x: column * 384, y: row * 272 } };
		}),
	};
}
