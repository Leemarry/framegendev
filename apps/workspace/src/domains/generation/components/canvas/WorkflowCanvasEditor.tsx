import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import useSWR from "swr";
import { useToast } from "@/hooks/useToast";
import { getMediaAssets, uploadMediaAsset, type MediaAsset } from "@/domains/workspace/api/media";
import { MaterialLibraryImportDialog } from "../MaterialLibraryImportDialog";
import {
	NodeConfigContext,
	WorkflowNodeView,
	nodeLabels,
	type CanvasNode,
} from "./WorkflowNodeView";
import {
	arrangeWorkflowNodes,
	pasteWorkflowNodes,
	type CanvasOperation,
} from "../../lib/workflow-canvas-editing";
import {
	ReactFlow,
	ReactFlowProvider,
	Background,
	MiniMap,
	addEdge,
	applyNodeChanges,
	applyEdgeChanges,
	type Edge,
	type NodeChange,
	type EdgeChange,
	type Connection,
	type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
	CircleHelp,
	Focus,
	FolderOpen,
	LayoutGrid,
	Magnet,
	Minus,
	Plus,
	Waypoints,
	X,
	Undo2,
	Redo2,
} from "lucide-react";
import type { WorkflowDocument } from "../../api/workflow";
import {
	getDefaultHandles,
	type WorkflowGraph,
	type WorkflowNode,
	type WorkflowEdge,
} from "../../lib/workflow-schema-v4";
import { inferEdgeDataType, validateConnection } from "../../lib/node-connection";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

interface WorkflowCanvasEditorProps {
	workflow: WorkflowDocument;
	onUpdate: (graphData: WorkflowGraph) => Promise<void>;
}

type CanvasEdge = Edge & WorkflowEdge;
function asCanvasNode(node: WorkflowNode): CanvasNode {
	return { id: node.id, type: "workflow", position: node.position, data: { node } };
}
function makeNode(type: string, position: { x: number; y: number }): WorkflowNode {
	return {
		id: crypto.randomUUID(),
		type,
		position,
		data: {
			label: nodeLabels[type] ?? "节点",
			handles: getDefaultHandles(type),
			config: {},
			outputs: {},
		},
	};
}

const nodeTypes = { workflow: WorkflowNodeView };

function WorkflowCanvasEditorInner({ workflow, onUpdate }: WorkflowCanvasEditorProps) {
	const [nodes, setNodes] = useState<CanvasNode[]>(() =>
		workflow.graphData.nodes.map(asCanvasNode),
	);
	const [edges, setEdges] = useState<CanvasEdge[]>(workflow.graphData.edges);
	const [viewport, setViewport] = useState(workflow.graphData.viewport);
	const [snapEnabled, setSnapEnabled] = useState(true);
	const [showEdges, setShowEdges] = useState(true);
	const [showMap, setShowMap] = useState(false);
	const toast = useToast();
	const [picker, setPicker] = useState<{
		kind: "image" | "video" | "audio";
		nodeId?: string;
		position: { x: number; y: number };
	} | null>(null);
	const media = useSWR(picker ? ["workflow-media", workflow.projectId] : null, () =>
		getMediaAssets({ projectId: workflow.projectId }),
	);
	const [libraryOpen, setLibraryOpen] = useState(false);
	const [helpOpen, setHelpOpen] = useState(false);
	const [edgeMenu, setEdgeMenu] = useState<{ id: string; x: number; y: number } | null>(null);
	const [history, setHistory] = useState<{ past: CanvasOperation[]; future: CanvasOperation[] }>({
		past: [],
		future: [],
	});
	const editGroup = useRef<string | null>(null);
	const clipboard = useRef<Pick<WorkflowGraph, "nodes" | "edges"> | null>(null);
	const uploadInput = useRef<HTMLInputElement>(null);
	const uploadPosition = useRef({ x: 0, y: 0 });
	const [uploading, setUploading] = useState(false);
	const [contextMenu, setContextMenu] = useState<{
		x: number;
		y: number;
		position: { x: number; y: number };
		nodeId?: string;
		mode: "actions" | "nodes";
	} | null>(null);
	const [status, setStatus] = useState<"idle" | "pending" | "saving" | "saved" | "error">("idle");
	const graphRef = useRef(workflow.graphData);
	const incomingGraph = useRef(workflow.graphData);
	const pending = useRef<WorkflowGraph | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const queue = useRef(Promise.resolve());
	const updateRef = useRef(onUpdate);
	const flowRef = useRef<ReactFlowInstance<CanvasNode, CanvasEdge> | null>(null);
	const canvasRef = useRef<HTMLDivElement>(null);
	updateRef.current = onUpdate;
	const graphFrom = (
		nextNodes: CanvasNode[],
		nextEdges: CanvasEdge[],
		nextViewport = viewport,
	): WorkflowGraph => ({
		...graphRef.current,
		nodes: nextNodes.map((node) => ({ ...node.data.node, position: node.position })),
		edges: nextEdges,
		viewport: nextViewport,
	});

	// A save flushed while switching tabs can finish after this canvas reopens.
	useEffect(() => {
		if (graphRef.current === incomingGraph.current && graphRef.current !== workflow.graphData) {
			graphRef.current = workflow.graphData;
			setNodes(workflow.graphData.nodes.map(asCanvasNode));
			setEdges(workflow.graphData.edges);
			setViewport(workflow.graphData.viewport);
		}
		incomingGraph.current = workflow.graphData;
	}, [workflow.graphData]);

	// Serialize writes so a slow earlier request cannot overwrite a later edit.
	const flush = useCallback((mounted = true) => {
		if (timer.current) clearTimeout(timer.current);
		timer.current = null;
		const graph = pending.current;
		if (!graph) return;
		pending.current = null;
		const update = updateRef.current;
		if (mounted) setStatus("saving");
		queue.current = queue.current.then(async () => {
			try {
				await update(graph);
				if (mounted && graphRef.current === graph) setStatus("saved");
			} catch {
				if (graphRef.current === graph) {
					pending.current = graph;
					if (mounted) setStatus("error");
				}
			}
		});
	}, []);

	const scheduleSave = useCallback(
		(graph: WorkflowGraph, label = "编辑画布", group?: string, record = true) => {
			const before = graphRef.current;
			if (record && before !== graph) {
				const merge = !!group && editGroup.current === group;
				setHistory((current) => {
					const last = current.past.at(-1);
					return {
						past:
							merge && last
								? [...current.past.slice(0, -1), { ...last, after: graph }]
								: [...current.past.slice(-99), { label, before, after: graph }],
						future: [],
					};
				});
				editGroup.current = group ?? null;
			}
			graphRef.current = graph;
			pending.current = graph;
			setStatus("pending");
			if (timer.current) clearTimeout(timer.current);
			timer.current = setTimeout(() => flush(), 500);
		},
		[flush],
	);

	const onNodesChange = (changes: NodeChange<CanvasNode>[]) => {
		const next = applyNodeChanges(changes, nodes);
		setNodes(next);
		if (changes.some((change) => change.type !== "select" && change.type !== "dimensions")) {
			const ids = new Set(next.map((node) => node.id));
			const remainingEdges = graphRef.current.edges.filter(
				(edge) => ids.has(edge.source) && ids.has(edge.target),
			);
			setEdges(remainingEdges);
			scheduleSave(
				graphFrom(next, remainingEdges),
				"移动或删除节点",
				changes.some((change) => change.type === "position") ? "drag" : undefined,
			);
			if (changes.some((change) => change.type === "position" && change.dragging === false))
				editGroup.current = null;
		}
	};
	const onEdgesChange = (changes: EdgeChange<CanvasEdge>[]) => {
		const next = applyEdgeChanges(changes, graphRef.current.edges as CanvasEdge[]);
		setEdges(next);
		if (changes.some((change) => change.type !== "select"))
			scheduleSave({ ...graphRef.current, edges: next }, "删除连线");
	};
	const onConnect = (connection: Connection) => {
		if (!connection.sourceHandle || !connection.targetHandle) return;
		const source = nodes.find((node) => node.id === connection.source)?.data.node;
		const target = nodes.find((node) => node.id === connection.target)?.data.node;
		if (
			!source ||
			!target ||
			!validateConnection(source, connection.sourceHandle, target, connection.targetHandle, edges)
				.valid
		)
			return;
		const next = addEdge(
			{
				...connection,
				id: crypto.randomUUID(),
				dataType: inferEdgeDataType(source, connection.sourceHandle),
			} as CanvasEdge,
			edges,
		);
		setEdges(next);
		scheduleSave(graphFrom(nodes, next));
	};
	const canvasPosition = (event: { clientX: number; clientY: number }) => {
		if (flowRef.current)
			return flowRef.current.screenToFlowPosition({ x: event.clientX, y: event.clientY });
		const rect = canvasRef.current?.getBoundingClientRect();
		return rect
			? {
					x: (event.clientX - rect.left - viewport.x) / viewport.zoom,
					y: (event.clientY - rect.top - viewport.y) / viewport.zoom,
				}
			: { x: 0, y: 0 };
	};
	const addNode = (type: string) => {
		if (!contextMenu) return;
		const next = [...nodes, asCanvasNode(makeNode(type, contextMenu.position))];
		setNodes(next);
		scheduleSave(graphFrom(next, edges));
		setContextMenu(null);
	};
	const removeNode = (id: string) => {
		const nextNodes = nodes.filter((node) => node.id !== id);
		const nextEdges = edges.filter((edge) => edge.source !== id && edge.target !== id);
		setNodes(nextNodes);
		setEdges(nextEdges);
		scheduleSave(graphFrom(nextNodes, nextEdges));
		setContextMenu(null);
	};
	const applyGraph = (graph: WorkflowGraph, label: string, record = true) => {
		setNodes(graph.nodes.map(asCanvasNode));
		setEdges(graph.edges);
		scheduleSave(graph, label, undefined, record);
	};
	const undo = () => {
		const operation = history.past.at(-1);
		if (!operation) return;
		applyGraph(
			{ ...operation.before, viewport: graphRef.current.viewport },
			operation.label,
			false,
		);
		setHistory({ past: history.past.slice(0, -1), future: [...history.future, operation] });
		editGroup.current = null;
		setContextMenu(null);
	};
	const redo = () => {
		const operation = history.future.at(-1);
		if (!operation) return;
		applyGraph({ ...operation.after, viewport: graphRef.current.viewport }, operation.label, false);
		setHistory({ past: [...history.past, operation], future: history.future.slice(0, -1) });
		editGroup.current = null;
		setContextMenu(null);
	};
	const selection = (id?: string) => {
		const selected = new Set(
			id ? [id] : nodes.filter((node) => node.selected).map((node) => node.id),
		);
		return {
			nodes: graphRef.current.nodes.filter((node) => selected.has(node.id)),
			edges: graphRef.current.edges.filter(
				(edge) => selected.has(edge.source) && selected.has(edge.target),
			),
		};
	};
	const copy = (id?: string) => {
		const copied = selection(id);
		if (!copied.nodes.length) return;
		clipboard.current = structuredClone(copied);
		setContextMenu(null);
	};
	const centerPosition = () => {
		const rect = canvasRef.current?.getBoundingClientRect();
		return rect
			? canvasPosition({ clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 })
			: { x: 0, y: 0 };
	};
	const paste = (position = centerPosition()) => {
		if (!clipboard.current) return;
		applyGraph(pasteWorkflowNodes(graphRef.current, clipboard.current, position), "粘贴节点");
		setContextMenu(null);
	};
	const duplicateNode = (id?: string) => {
		const copied = selection(id);
		if (!copied.nodes.length) return;
		const first = copied.nodes[0].position;
		applyGraph(
			pasteWorkflowNodes(graphRef.current, copied, { x: first.x + 32, y: first.y + 32 }),
			"创建副本",
		);
		setContextMenu(null);
	};
	const updateNodeData = (id: string, data: Partial<WorkflowNode["data"]>) => {
		const next = nodes.map((node) =>
			node.id === id
				? {
						...node,
						data: { node: { ...node.data.node, data: { ...node.data.node.data, ...data } } },
					}
				: node,
		);
		setNodes(next);
		scheduleSave(graphFrom(next, edges), "配置节点", `config:${id}`);
	};
	const insertAssets = (
		assets: MediaAsset[],
		position: { x: number; y: number },
		nodeId?: string,
	) => {
		let graph = graphRef.current;
		for (const [index, asset] of assets.entries()) {
			if (asset.kind === "text") continue;
			const existing = nodeId ? graph.nodes.find((node) => node.id === nodeId) : undefined;
			if (nodeId && !existing) continue;
			const node =
				existing ?? makeNode(`${asset.kind}Node`, { x: position.x + index * 272, y: position.y });
			const handle = node.data.handles.find((item) => item.type === "source");
			const next: WorkflowNode = {
				...node,
				data: {
					...node.data,
					label: existing?.data.label ?? asset.filename,
					config: {
						...node.data.config,
						params: { ...node.data.config?.params, assetId: asset.id },
					},
					outputs: {
						...node.data.outputs,
						[handle?.id ?? "output"]: {
							dataType:
								asset.kind === "image" ? "IMAGE" : asset.kind === "video" ? "VIDEO" : "AUDIO",
							value: asset.url,
						},
					},
				},
			};
			graph = {
				...graph,
				nodes: existing
					? graph.nodes.map((item) => (item.id === existing.id ? next : item))
					: [...graph.nodes, next],
			};
		}
		applyGraph(graph, "导入素材");
	};
	const uploadFiles = async (files: File[], position: { x: number; y: number }) => {
		setUploading(true);
		try {
			// Keep each successful import even when a later file fails.
			for (const [index, file] of files.entries()) {
				if (!/^(image|video|audio)\//.test(file.type)) {
					toast.error(`不支持的素材：${file.name}`);
					continue;
				}
				const asset = await uploadMediaAsset(file, workflow.projectId);
				insertAssets([asset], { x: position.x + index * 272, y: position.y });
			}
		} catch (error) {
			toast.error("上传失败", { description: String(error) });
		} finally {
			setUploading(false);
		}
	};
	const openUpload = () => {
		uploadPosition.current = contextMenu?.position ?? centerPosition();
		uploadInput.current?.click();
		setContextMenu(null);
	};
	const pasteText = (text: string, position: { x: number; y: number }) => {
		if (!text.trim()) return;
		const node = makeNode("textNode", position);
		node.data.config = { prompt: text };
		node.data.outputs = { output: { dataType: "TEXT", value: text } };
		applyGraph({ ...graphRef.current, nodes: [...graphRef.current.nodes, node] }, "粘贴文本");
	};
	const pasteFromMenu = async () => {
		const position = contextMenu?.position ?? centerPosition();
		if (clipboard.current) {
			paste(position);
			return;
		}
		setContextMenu(null);
		try {
			pasteText(await navigator.clipboard.readText(), position);
		} catch {
			toast.info("请在画布上使用 Ctrl / ⌘ + V 粘贴文本或媒体");
		}
	};

	useEffect(() => () => flush(false), [flush]);

	return (
		<NodeConfigContext.Provider
			value={{
				update: updateNodeData,
				pickMedia: (id) => {
					const node = nodes.find((item) => item.id === id);
					if (node)
						setPicker({
							kind:
								node.data.node.type === "videoNode"
									? "video"
									: node.data.node.type === "audioNode"
										? "audio"
										: "image",
							nodeId: id,
							position: node.position,
						});
				},
			}}
		>
			<div
				ref={canvasRef}
				className="relative h-full min-h-0 w-full overflow-hidden bg-background"
				tabIndex={0}
				aria-label="工作流画布"
				onClick={() => {
					setContextMenu(null);
					setEdgeMenu(null);
				}}
				onPointerDownCapture={(event) => {
					if (
						!(event.target instanceof Element) ||
						event.target.closest("input,textarea,select,[contenteditable=true]")
					)
						return;
					canvasRef.current?.focus({ preventScroll: true });
				}}
				onDragOver={(event) => {
					if (event.dataTransfer.types.includes("Files")) {
						event.preventDefault();
						event.dataTransfer.dropEffect = "copy";
					}
				}}
				onDrop={(event) => {
					if (event.dataTransfer.files.length) {
						event.preventDefault();
						void uploadFiles(Array.from(event.dataTransfer.files), canvasPosition(event));
					}
				}}
				onPaste={(event) => {
					if (
						event.target instanceof Element &&
						event.target.closest("input,textarea,[contenteditable=true]")
					)
						return;
					const files = Array.from(event.clipboardData.files);
					const text = event.clipboardData.getData("text/plain");
					event.preventDefault();
					if (files.length) void uploadFiles(files, centerPosition());
					else if (text) pasteText(text, centerPosition());
					else paste();
				}}
				onKeyDown={(event) => {
					if (
						event.target instanceof Element &&
						event.target.closest("input,textarea,select,[contenteditable=true]")
					)
						return;
					if (event.key === "Escape" && (contextMenu || edgeMenu || helpOpen || libraryOpen)) {
						event.preventDefault();
						event.stopPropagation();
						setContextMenu(null);
						setEdgeMenu(null);
						setHelpOpen(false);
						setLibraryOpen(false);
						return;
					}
					if (!(event.ctrlKey || event.metaKey)) return;
					const key = event.key.toLowerCase();
					if (key === "z") {
						event.preventDefault();
						if (event.shiftKey) redo();
						else undo();
					}
					if (key === "y") {
						event.preventDefault();
						redo();
					}
					if (key === "c" && selection().nodes.length) {
						event.preventDefault();
						copy();
					}
					if (key === "v" && clipboard.current) {
						event.preventDefault();
						paste();
					}
					if (key === "d") {
						event.preventDefault();
						duplicateNode();
					}
					if (key === "a") {
						event.preventDefault();
						setNodes((current) => current.map((node) => ({ ...node, selected: true })));
					}
				}}
			>
				<input
					ref={uploadInput}
					type="file"
					className="hidden"
					accept="image/*,video/*,audio/*"
					multiple
					aria-label="上传画布素材"
					onChange={(event) => {
						const files = Array.from(event.target.files ?? []);
						event.target.value = "";
						void uploadFiles(files, uploadPosition.current);
					}}
				/>
				<ReactFlow<CanvasNode, CanvasEdge>
					nodes={nodes}
					edges={showEdges ? edges : []}
					nodeTypes={nodeTypes}
					onNodesChange={onNodesChange}
					onEdgesChange={onEdgesChange}
					onConnect={onConnect}
					onInit={(flow) => {
						flowRef.current = flow;
					}}
					defaultViewport={viewport}
					minZoom={0.2}
					maxZoom={8}
					snapToGrid={snapEnabled}
					snapGrid={[16, 16]}
					panOnScroll
					zoomOnScroll={false}
					selectionOnDrag
					panOnDrag={[1, 2]}
					zoomOnDoubleClick={false}
					onNodeDragStart={() => {
						editGroup.current = null;
					}}
					onDoubleClick={(event) => {
						if (!(event.target instanceof Element) || !event.target.closest(".react-flow__pane"))
							return;
						event.preventDefault();
						setContextMenu({
							x: event.clientX - (canvasRef.current?.getBoundingClientRect().left ?? 0),
							y: event.clientY - (canvasRef.current?.getBoundingClientRect().top ?? 0),
							position: canvasPosition(event),
							mode: "nodes",
						});
					}}
					onPaneContextMenu={(event) => {
						event.preventDefault();
						setContextMenu({
							x: event.clientX - (canvasRef.current?.getBoundingClientRect().left ?? 0),
							y: event.clientY - (canvasRef.current?.getBoundingClientRect().top ?? 0),
							position: canvasPosition(event),
							mode: "actions",
						});
					}}
					onNodeContextMenu={(event, node) => {
						event.preventDefault();
						setContextMenu({
							x: event.clientX - (canvasRef.current?.getBoundingClientRect().left ?? 0),
							y: event.clientY - (canvasRef.current?.getBoundingClientRect().top ?? 0),
							position: node.position,
							nodeId: node.id,
							mode: "actions",
						});
					}}
					onEdgeClick={(event, edge) => {
						event.stopPropagation();
						const rect = canvasRef.current?.getBoundingClientRect();
						setEdgeMenu({
							id: edge.id,
							x: event.clientX - (rect?.left ?? 0),
							y: event.clientY - (rect?.top ?? 0),
						});
					}}
					onMove={(_, nextViewport) => setViewport(nextViewport)}
					onMoveEnd={(_, nextViewport) => {
						setViewport(nextViewport);
						scheduleSave(
							{ ...graphRef.current, viewport: nextViewport },
							"移动视图",
							undefined,
							false,
						);
					}}
					attributionPosition="bottom-left"
				>
					<Background gap={16} size={1} />
					{showMap && <MiniMap pannable zoomable />}
				</ReactFlow>
				<div
					role="status"
					className="absolute right-4 top-4 flex items-center gap-2 rounded-md border border-border bg-background/95 px-3 py-2 text-sm shadow-sm"
				>
					{status === "idle"
						? "自动保存"
						: status === "pending"
							? "未保存"
							: status === "saving"
								? "保存中..."
								: status === "saved"
									? "已保存"
									: "保存失败"}
					{status === "error" && (
						<Button size="sm" variant="outline" onClick={() => flush()}>
							重试保存
						</Button>
					)}
				</div>
				<div className="absolute bottom-4 left-4 z-20 flex items-center gap-0.5 rounded-lg border border-border bg-card/95 p-1 shadow-sm">
					<ToolButton label="素材库" onClick={() => setLibraryOpen((value) => !value)}>
						<FolderOpen />
					</ToolButton>
					<ToolButton
						label="整理画布"
						onClick={() => {
							applyGraph(arrangeWorkflowNodes(graphRef.current), "整理画布");
							requestAnimationFrame(() => {
								void flowRef.current?.fitView({ padding: 0.2, duration: 300 });
							});
						}}
					>
						<LayoutGrid />
					</ToolButton>
					<ToolButton
						label="显示或隐藏地图"
						pressed={showMap}
						onClick={() => setShowMap((value) => !value)}
					>
						<Focus />
					</ToolButton>
					<ToolButton
						label="网格吸附"
						pressed={snapEnabled}
						onClick={() => setSnapEnabled((value) => !value)}
					>
						<Magnet />
					</ToolButton>
					<ToolButton
						label="显示或隐藏连线"
						pressed={showEdges}
						onClick={() => setShowEdges((value) => !value)}
					>
						<Waypoints />
					</ToolButton>
					<ToolButton
						label="适应视图"
						onClick={() => flowRef.current?.fitView({ padding: 0.2, duration: 300 })}
					>
						<Focus />
					</ToolButton>
					<ToolButton label="缩小" onClick={() => flowRef.current?.zoomOut({ duration: 150 })}>
						<Minus />
					</ToolButton>
					<span className="min-w-12 text-center text-xs text-muted-foreground">
						{Math.round(viewport.zoom * 100)}%
					</span>
					<ToolButton label="放大" onClick={() => flowRef.current?.zoomIn({ duration: 150 })}>
						<Plus />
					</ToolButton>
					<ToolButton label="撤销" disabled={!history.past.length} onClick={undo}>
						<Undo2 />
					</ToolButton>
					<ToolButton label="重做" disabled={!history.future.length} onClick={redo}>
						<Redo2 />
					</ToolButton>
					<ToolButton
						label="帮助"
						pressed={helpOpen}
						onClick={() => setHelpOpen((value) => !value)}
					>
						<CircleHelp />
					</ToolButton>
				</div>
				{uploading && (
					<p role="status" className="absolute left-4 top-4 rounded bg-card p-2 text-sm">
						正在上传素材…
					</p>
				)}
				{!nodes.length && (
					<p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
						双击空白处创建节点，或拖入图片、视频、音频
					</p>
				)}
				{helpOpen && (
					<div
						data-workflow-popup=""
						className="absolute bottom-16 left-4 z-20 w-80 rounded-lg border border-border bg-card p-4 text-sm shadow-md"
					>
						<div className="mb-3 flex justify-between">
							<strong>画布操作</strong>
							<button aria-label="关闭帮助" onClick={() => setHelpOpen(false)}>
								<X className="size-4" />
							</button>
						</div>
						<p>双击空白处：添加节点；右键：操作菜单。</p>
						<p>左键拖动空白处框选；中键 / 右键或空格拖动画布；滚轮平移，Ctrl / ⌘ + 滚轮缩放。</p>
						<p>拖动端口连接；点击连线后选择断开。</p>
						<p>Ctrl / ⌘ + C、V、D：复制、粘贴、创建副本。</p>
						<p>Ctrl / ⌘ + Z：撤销；Shift + Z：重做。</p>
						<p>Delete / Backspace：删除选中的节点或连线。</p>
					</div>
				)}
				{edgeMenu && (
					<Button
						size="sm"
						variant="destructive"
						data-workflow-popup=""
						className="absolute z-30"
						style={{
							left: Math.max(0, Math.min(edgeMenu.x, (canvasRef.current?.clientWidth ?? 0) - 130)),
							top: Math.max(0, Math.min(edgeMenu.y, (canvasRef.current?.clientHeight ?? 0) - 40)),
						}}
						onClick={() => {
							applyGraph(
								{
									...graphRef.current,
									edges: graphRef.current.edges.filter((edge) => edge.id !== edgeMenu.id),
								},
								"断开连线",
							);
							setEdgeMenu(null);
						}}
					>
						断开连线
					</Button>
				)}
				{libraryOpen && (
					<div
						data-workflow-popup=""
						className="absolute bottom-16 left-4 z-20 flex gap-2 rounded border border-border bg-card p-2"
					>
						{(["image", "video", "audio"] as const).map((kind) => (
							<Button
								key={kind}
								size="sm"
								variant="outline"
								onClick={() => {
									setLibraryOpen(false);
									setPicker({ kind, position: centerPosition() });
								}}
							>
								{kind === "image" ? "图片" : kind === "video" ? "视频" : "音频"}
							</Button>
						))}
					</div>
				)}
				{picker && (
					<>
						{media.error ? (
							<div role="alert" className="absolute inset-x-4 top-16 z-30 bg-card p-3">
								素材加载失败<Button onClick={() => void media.mutate()}>重试</Button>
								<Button onClick={() => setPicker(null)}>关闭</Button>
							</div>
						) : (
							<MaterialLibraryImportDialog
								open
								assetKind={picker.kind}
								mediaAssets={media.data?.assets ?? []}
								selectionMode={picker.nodeId ? "single" : "multiple"}
								confirmLabel="加入画布"
								description="选择项目素材或上传本地文件。"
								onUploadAsset={(file) => uploadMediaAsset(file, workflow.projectId)}
								onOpenChange={(open) => {
									if (!open) setPicker(null);
								}}
								onConfirmSelection={(assets) => {
									insertAssets(assets, picker.position, picker.nodeId);
									setPicker(null);
								}}
							/>
						)}
					</>
				)}
				{contextMenu && (
					<CanvasContextMenu
						menu={contextMenu}
						bounds={{
							width: canvasRef.current?.clientWidth ?? 0,
							height: canvasRef.current?.clientHeight ?? 0,
						}}
						canUndo={!!history.past.length}
						canRedo={!!history.future.length}
						onUndo={undo}
						onRedo={redo}
						onCopy={copy}
						onPaste={() => void pasteFromMenu()}
						onUpload={openUpload}
						onAdd={addNode}
						onDelete={removeNode}
						onDuplicate={duplicateNode}
						onOpenNodes={() => setContextMenu({ ...contextMenu, nodeId: undefined, mode: "nodes" })}
						onBack={() => setContextMenu({ ...contextMenu, mode: "actions" })}
					/>
				)}
			</div>
		</NodeConfigContext.Provider>
	);
}

function ToolButton({
	disabled,
	label,
	pressed,
	onClick,
	children,
}: {
	disabled?: boolean;
	label: string;
	pressed?: boolean;
	onClick?: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			title={label}
			aria-label={label}
			aria-pressed={pressed}
			disabled={disabled}
			onClick={onClick}
			className={cn(
				"flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:pointer-events-none",
				pressed && "bg-primary/10 text-primary",
			)}
		>
			{children}
		</button>
	);
}

function CanvasContextMenu({
	bounds,
	canUndo,
	canRedo,
	onUndo,
	onRedo,
	onCopy,
	onPaste,
	onUpload,
	menu,
	onAdd,
	onDelete,
	onDuplicate,
	onOpenNodes,
	onBack,
}: {
	bounds: { width: number; height: number };
	canUndo: boolean;
	canRedo: boolean;
	onUndo: () => void;
	onRedo: () => void;
	onCopy: (id: string) => void;
	onPaste: () => void;
	onUpload: () => void;
	menu: {
		x: number;
		y: number;
		position: { x: number; y: number };
		nodeId?: string;
		mode: "actions" | "nodes";
	};
	onAdd: (type: string) => void;
	onDelete: (id: string) => void;
	onDuplicate: (id: string) => void;
	onOpenNodes: () => void;
	onBack: () => void;
}) {
	const types = [
		"textNode",
		"imageNode",
		"videoNode",
		"audioNode",
		"audioGeneration",
		"director3D",
		"imageGeneration",
		"videoGeneration",
	];
	return (
		<div
			data-workflow-popup=""
			role="menu"
			aria-label="画布操作"
			className="absolute z-30 max-h-full overflow-y-auto w-48 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
			style={{
				left: Math.max(0, Math.min(menu.x, bounds.width - 200)),
				top: Math.max(0, Math.min(menu.y, bounds.height - (menu.mode === "nodes" ? 340 : 260))),
			}}
			onClick={(event) => event.stopPropagation()}
		>
			{menu.nodeId ? (
				<>
					<MenuButton label="复制节点" onClick={() => onCopy(menu.nodeId!)} />
					<MenuButton label="创建副本" onClick={() => onDuplicate(menu.nodeId!)} />
					<MenuButton label="删除节点" onClick={() => onDelete(menu.nodeId!)} />
					<MenuButton label="添加节点" onClick={onOpenNodes} />
				</>
			) : menu.mode === "actions" ? (
				<>
					<MenuButton label="上传" onClick={onUpload} />
					<MenuButton label="添加节点" onClick={onOpenNodes} />
					<div className="my-1 border-t border-border" />
					<MenuButton label="撤销" disabled={!canUndo} onClick={onUndo} />
					<MenuButton label="重做" disabled={!canRedo} onClick={onRedo} />
					<div className="my-1 border-t border-border" />
					<MenuButton label="粘贴节点、文本或媒体" onClick={onPaste} />
				</>
			) : (
				<>
					<MenuButton label="返回操作菜单" onClick={onBack} />
					<div className="border-t border-border" />
					{types.map((type) => (
						<MenuButton key={type} label={nodeLabels[type] ?? type} onClick={() => onAdd(type)} />
					))}
				</>
			)}
		</div>
	);
}

function MenuButton({
	label,
	onClick,
	disabled,
}: {
	label: string;
	onClick?: () => void;
	disabled?: boolean;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			role="menuitem"
			className="disabled:opacity-40 disabled:pointer-events-none flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
		>
			<Plus className="size-4" />
			{label}
		</button>
	);
}

/** Canvas edits retain the complete v4 graph, including ports, outputs and viewport. */
export function WorkflowCanvasEditor(props: WorkflowCanvasEditorProps) {
	return (
		<ReactFlowProvider>
			<WorkflowCanvasEditorInner {...props} />
		</ReactFlowProvider>
	);
}
