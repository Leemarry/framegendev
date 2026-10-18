import type { WorkflowGraph, WorkflowNode, WorkflowEdge } from "./workflow-schema-v4";
import { validateConnection, inferEdgeDataType } from "./node-connection";

export interface PendingConnection {
	nodeId: string;
	handleId: string;
	type: "source" | "target";
}

/** Resolve the opposite compatible handle, including reverse drags from an input. */
export function connectionToNewNode(
	graph: WorkflowGraph,
	pending: PendingConnection,
	node: WorkflowNode,
): WorkflowEdge | undefined {
	const origin = graph.nodes.find((item) => item.id === pending.nodeId);
	if (!origin) return;
	for (const handle of node.data.handles) {
		if (handle.type === pending.type) continue;
		const source = pending.type === "source" ? origin : node;
		const target = pending.type === "source" ? node : origin;
		const sourceHandle = pending.type === "source" ? pending.handleId : handle.id;
		const targetHandle = pending.type === "source" ? handle.id : pending.handleId;
		if (validateConnection(source, sourceHandle, target, targetHandle, graph.edges).valid) {
			return {
				id: crypto.randomUUID(),
				source: source.id,
				target: target.id,
				sourceHandle,
				targetHandle,
				dataType: inferEdgeDataType(source, sourceHandle),
			};
		}
	}
}

export type SelectionLayout = "horizontal" | "vertical" | "grid";

export function workflowAbsolutePosition(node: WorkflowNode, nodes: WorkflowNode[]) {
	const position = { ...node.position };
	const visited = new Set([node.id]);
	let parent = nodes.find((item) => item.id === node.parentId);
	while (parent && !visited.has(parent.id)) {
		visited.add(parent.id);
		position.x += parent.position.x;
		position.y += parent.position.y;
		parent = nodes.find((item) => item.id === parent!.parentId);
	}
	return position;
}

export function workflowSelectionTree(nodes: WorkflowNode[], selected: string[]) {
	const ids = new Set(selected);
	let changed = true;
	while (changed) {
		changed = false;
		for (const node of nodes)
			if (node.parentId && ids.has(node.parentId) && !ids.has(node.id)) {
				ids.add(node.id);
				changed = true;
			}
	}
	return nodes.filter((node) => ids.has(node.id));
}

export function groupWorkflowNodes(
	graph: WorkflowGraph,
	selected: string[],
	sizes: Map<string, { width?: number; height?: number }> = new Map(),
): WorkflowGraph {
	const tree = workflowSelectionTree(graph.nodes, selected);
	const ids = new Set(tree.map((node) => node.id));
	const roots = tree.filter((node) => !node.parentId || !ids.has(node.parentId));
	if (!roots.length) return graph;
	const positions = roots.map((node) => workflowAbsolutePosition(node, graph.nodes));
	const x = Math.min(...positions.map((point) => point.x)) - 24;
	const y = Math.min(...positions.map((point) => point.y)) - 40;
	const group: WorkflowNode = {
		id: crypto.randomUUID(),
		type: "canvasGroup",
		position: { x, y },
		width:
			Math.max(
				...roots.map(
					(node, i) => positions[i].x + (sizes.get(node.id)?.width ?? node.width ?? 360),
				),
			) -
			x +
			24,
		height:
			Math.max(
				...roots.map(
					(node, i) => positions[i].y + (sizes.get(node.id)?.height ?? node.height ?? 180),
				),
			) -
			y +
			24,
		data: { label: "分组", handles: [] },
	};
	const rootPositions = new Map(roots.map((node, index) => [node.id, positions[index]]));
	return {
		...graph,
		nodes: [
			group,
			...graph.nodes.map((node) => {
				const point = rootPositions.get(node.id);
				return point
					? { ...node, parentId: group.id, position: { x: point.x - x, y: point.y - y } }
					: node;
			}),
		],
	};
}

export function ungroupWorkflowNodes(graph: WorkflowGraph, selected: string[]): WorkflowGraph {
	const groups = new Set(
		selected.filter((id) =>
			graph.nodes.some((node) => node.id === id && node.type === "canvasGroup"),
		),
	);
	return {
		...graph,
		nodes: graph.nodes
			.filter((node) => !groups.has(node.id))
			.map((node) => {
				if (!node.parentId || !groups.has(node.parentId)) return node;
				const absolute = workflowAbsolutePosition(node, graph.nodes);
				let parentId: string | undefined = node.parentId;
				while (parentId && groups.has(parentId))
					parentId = graph.nodes.find((item) => item.id === parentId)?.parentId;
				const parent = graph.nodes.find((item) => item.id === parentId);
				const origin = parent ? workflowAbsolutePosition(parent, graph.nodes) : { x: 0, y: 0 };
				return {
					...node,
					parentId,
					position: { x: absolute.x - origin.x, y: absolute.y - origin.y },
				};
			}),
	};
}

/** Arrange just the selection using measured card sizes, preserving unrelated nodes. */
export function arrangeWorkflowSelection(
	graph: WorkflowGraph,
	selected: string[],
	layout: SelectionLayout,
	sizes: Map<string, { width?: number; height?: number }> = new Map(),
): WorkflowGraph {
	const ids = new Set(selected);
	const nodes = graph.nodes.filter(
		(node) => ids.has(node.id) && (!node.parentId || !ids.has(node.parentId)),
	);
	if (nodes.length < 2) return graph;
	const absolute = nodes.map((node) => workflowAbsolutePosition(node, graph.nodes));
	const origin = {
		x: Math.min(...absolute.map((point) => point.x)),
		y: Math.min(...absolute.map((point) => point.y)),
	};
	const columns =
		layout === "horizontal"
			? nodes.length
			: layout === "vertical"
				? 1
				: Math.ceil(Math.sqrt(nodes.length));
	const widths = Array.from({ length: columns }, () => 0);
	const heights: number[] = [];
	nodes.forEach((node, index) => {
		widths[index % columns] = Math.max(
			widths[index % columns],
			sizes.get(node.id)?.width ?? (node.type.endsWith("Generation") ? 360 : 220),
		);
		const row = Math.floor(index / columns);
		heights[row] = Math.max(heights[row] ?? 0, sizes.get(node.id)?.height ?? 180);
	});
	const positions = new Map(
		nodes.map((node, index) => [
			node.id,
			{
				x: origin.x + widths.slice(0, index % columns).reduce((sum, width) => sum + width + 64, 0),
				y:
					origin.y +
					heights
						.slice(0, Math.floor(index / columns))
						.reduce((sum, height) => sum + height + 64, 0),
			},
		]),
	);
	return {
		...graph,
		nodes: graph.nodes.map((node) => {
			const position = positions.get(node.id);
			if (!position) return node;
			const parent = graph.nodes.find((item) => item.id === node.parentId);
			const origin = parent ? workflowAbsolutePosition(parent, graph.nodes) : { x: 0, y: 0 };
			return { ...node, position: { x: position.x - origin.x, y: position.y - origin.y } };
		}),
	};
}

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
	const roots = selection.nodes.filter((node) => !node.parentId || !ids.has(node.parentId));
	const origin = {
		x: Math.min(...roots.map((node) => workflowAbsolutePosition(node, graph.nodes).x)),
		y: Math.min(...roots.map((node) => workflowAbsolutePosition(node, graph.nodes).y)),
	};
	return {
		...graph,
		nodes: [
			...graph.nodes,
			...selection.nodes.map((node) => ({
				...structuredClone(node),
				data: {
					...structuredClone(node.data),
					taskId: undefined,
					status: node.data.status === "generating" ? ("idle" as const) : node.data.status,
				},
				id: ids.get(node.id)!,
				parentId: node.parentId ? ids.get(node.parentId) : undefined,
				position:
					node.parentId && ids.has(node.parentId)
						? { ...node.position }
						: {
								x: workflowAbsolutePosition(node, graph.nodes).x - origin.x + position.x,
								y: workflowAbsolutePosition(node, graph.nodes).y - origin.y + position.y,
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
export function arrangeWorkflowNodes(
	graph: WorkflowGraph,
	sizes: Map<string, { width?: number; height?: number }> = new Map(),
): WorkflowGraph {
	const roots = graph.nodes.filter((node) => !node.parentId);
	const rootId = (id: string) => {
		let node = graph.nodes.find((item) => item.id === id);
		const visited = new Set<string>();
		while (node?.parentId && !visited.has(node.id)) {
			visited.add(node.id);
			node = graph.nodes.find((item) => item.id === node!.parentId);
		}
		return node?.id ?? id;
	};
	const dependencies = graph.edges
		.map((edge) => ({ source: rootId(edge.source), target: rootId(edge.target) }))
		.filter((edge) => edge.source !== edge.target);
	const levels = new Map<string, number>();
	const remaining = new Set(roots.map((node) => node.id));
	while (remaining.size) {
		const ready = [...remaining].filter(
			(id) => !dependencies.some((edge) => edge.target === id && remaining.has(edge.source)),
		);
		if (!ready.length) break;
		for (const id of ready) {
			const parents = dependencies.filter((edge) => edge.target === id);
			levels.set(id, Math.max(0, ...parents.map((edge) => (levels.get(edge.source) ?? -1) + 1)));
			remaining.delete(id);
		}
	}
	const lastLevel = Math.max(0, ...levels.values()) + 1;
	const widths = Array.from({ length: lastLevel + 1 }, () => 0);
	for (const node of roots) {
		const column = levels.get(node.id) ?? lastLevel;
		widths[column] = Math.max(
			widths[column],
			sizes.get(node.id)?.width ?? node.width ?? (node.type.endsWith("Generation") ? 360 : 220),
		);
	}
	const rows = new Map<number, number>();
	return {
		...graph,
		nodes: graph.nodes.map((node) => {
			if (node.parentId) return node;
			const column = levels.get(node.id) ?? lastLevel;
			const row = rows.get(column) ?? 0;
			rows.set(column, row + (sizes.get(node.id)?.height ?? node.height ?? 180) + 80);
			return {
				...node,
				position: {
					x: widths.slice(0, column).reduce((sum, width) => sum + width + 80, 0),
					y: row,
				},
			};
		}),
	};
}
