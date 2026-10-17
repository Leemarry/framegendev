import {
	Background,
	Handle,
	Position,
	ReactFlow,
	ReactFlowProvider,
	useReactFlow,
	type Node,
	type NodeProps,
	type NodeChange,
	type EdgeChange,
	type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
	FileVideo,
	FolderOpen,
	Grid2X2,
	Layout,
	LockKeyhole,
	Maximize,
	Minus,
	Play,
	Plus,
	Unlock,
	Trash2,
} from "lucide-react";
import { createContext, useContext, useMemo, useRef, useState } from "react";
import type React from "react";
import useSWR from "swr";
import type { MarkdownSectionContext } from "@/domains/documents/components/MarkdownHybridEditor";
import { getMediaAssets, uploadMediaAsset } from "@/domains/workspace/api/media";
import { MaterialLibraryImportDialog } from "./MaterialLibraryImportDialog";
import {
	activeWorkflowDocument,
	createWorkflowDocument,
	createWorkflowNode,
	initialWorkflowWorkspace,
	parseWorkflowWorkspace,
	updateWorkflowGraph,
	workflowKindLabels,
	type WorkflowDraftGraph,
	type WorkflowDraftNode,
	type WorkflowDraftWorkspace,
	type WorkflowKind,
} from "../lib/workflow-draft";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Popover, PopoverAnchor, PopoverContent } from "@/shared/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectSeparator,
	SelectTrigger,
} from "@/shared/components/ui/select";
import { apiResourceURL } from "@/shared/lib/api-base";
import { cn } from "@/shared/lib/utils";

type CanvasNode = Node<{ node: WorkflowDraftNode }>;
const MediaPickerContext = createContext<(id: string) => void>(() => undefined);
interface Props {
	projectId?: string;
	section: MarkdownSectionContext;
}

export const WorkflowGenerationSurface = (props: Props) => {
	const scopeKey = `mediago.workflow.draft.v1:${props.projectId?.trim() || "global"}:${props.section.documentId}:${props.section.blockId}`;
	return (
		<ReactFlowProvider key={scopeKey}>
			<WorkflowSurface {...props} storageKey={scopeKey} />
		</ReactFlowProvider>
	);
};

const WorkflowSurface = ({ projectId, section, storageKey }: Props & { storageKey: string }) => {
	const [loaded] = useState(() => {
		try {
			const raw = localStorage.getItem(storageKey);
			return {
				state: raw ? parseWorkflowWorkspace(raw) : initialWorkflowWorkspace(),
				error: "",
				saved: !!raw,
			};
		} catch (error) {
			return { state: initialWorkflowWorkspace(), error: String(error), saved: false };
		}
	});
	const [state, setState] = useState(loaded.state);
	const latest = useRef(state);
	const [saveError, setSaveError] = useState("");
	const [saved, setSaved] = useState(loaded.saved);
	const [selected, setSelected] = useState<string | null>(
		activeWorkflowDocument(state).graph.nodes[0]?.id ?? null,
	);
	const [locked, setLocked] = useState(false);
	const [editor, setEditor] = useState<"create" | "rename" | null>(null);
	const [name, setName] = useState("");
	const [createPosition, setCreatePosition] = useState<{ x: number; y: number } | null>(null);
	const [pickerNodeId, setPickerNodeId] = useState<string | null>(null);
	const { fitView, zoomIn, zoomOut, screenToFlowPosition } = useReactFlow();
	const document = activeWorkflowDocument(state);
	const graph = document.graph;
	const selectedNode = graph.nodes.find((node) => node.id === selected);
	const pickerNode = graph.nodes.find((node) => node.id === pickerNodeId);
	const media = useSWR(pickerNodeId ? ["workflow-media", projectId] : null, () =>
		getMediaAssets({ projectId }),
	);

	// Synchronous local writes keep closing, switching and rapid typing from losing a pending debounce.
	const commit = (next: WorkflowDraftWorkspace) => {
		if (loaded.error) return false;
		latest.current = next;
		setState(next);
		try {
			localStorage.setItem(storageKey, JSON.stringify(next));
			setSaveError("");
			setSaved(true);
			return true;
		} catch {
			setSaveError("本地保存失败，请释放浏览器存储空间后重试；当前修改仍保留在画布中。");
			setSaved(false);
			return false;
		}
	};
	const changeGraph = (next: WorkflowDraftGraph) =>
		commit(updateWorkflowGraph(latest.current, next));
	const updateNode = (id: string, update: (node: WorkflowDraftNode) => WorkflowDraftNode) => {
		const current = activeWorkflowDocument(latest.current).graph;
		changeGraph({
			...current,
			nodes: current.nodes.map((node) => (node.id === id ? update(node) : node)),
		});
	};
	const switchDocument = (id: string) => {
		if (!commit(latest.current)) return;
		const target = latest.current.documents.find((item) => item.id === id);
		if (!target) return;
		if (commit({ ...latest.current, activeDocumentId: id }))
			setSelected(target.graph.nodes[0]?.id ?? null);
	};
	const submitName = (event: React.FormEvent) => {
		event.preventDefault();
		if (!name.trim() || !commit(latest.current)) return;
		const next =
			editor === "create"
				? createWorkflowDocument(latest.current, name)
				: {
						...latest.current,
						documents: latest.current.documents.map((item) =>
							item.id === latest.current.activeDocumentId ? { ...item, name: name.trim() } : item,
						),
					};
		if (commit(next)) {
			setEditor(null);
			if (editor === "create") setSelected(null);
		}
	};
	const addNode = (kind: WorkflowKind) => {
		const node = createWorkflowNode(kind, createPosition ?? { x: 0, y: 0 });
		changeGraph({ ...graph, nodes: [...graph.nodes, node] });
		setSelected(node.id);
		setCreatePosition(null);
	};
	const onNodesChange = (changes: NodeChange<CanvasNode>[]) => {
		const current = activeWorkflowDocument(latest.current).graph;
		const removed = new Set(
			changes.filter((change) => change.type === "remove").map((change) => change.id),
		);
		let nodes = current.nodes;
		for (const change of changes) {
			if (change.type === "select" && change.selected) setSelected(change.id);
			if (change.type === "position" && change.position) {
				const position = change.position;
				nodes = nodes.map((node) => (node.id === change.id ? { ...node, position } : node));
			}
		}
		if (removed.size) {
			nodes = nodes.filter((node) => !removed.has(node.id));
			if (selected && removed.has(selected)) setSelected(null);
		}
		if (nodes !== current.nodes)
			changeGraph({
				...current,
				nodes,
				edges: current.edges.filter(
					(edge) => !removed.has(edge.source) && !removed.has(edge.target),
				),
			});
	};
	const onEdgesChange = (changes: EdgeChange[]) => {
		const removed = new Set(
			changes.filter((change) => change.type === "remove").map((change) => change.id),
		);
		if (removed.size)
			changeGraph({ ...graph, edges: graph.edges.filter((edge) => !removed.has(edge.id)) });
	};
	const onConnect = (connection: Connection) => {
		if (
			connection.source === connection.target ||
			graph.edges.some(
				(edge) => edge.source === connection.source && edge.target === connection.target,
			)
		)
			return;
		changeGraph({
			...graph,
			edges: [
				...graph.edges,
				{
					id: crypto.randomUUID(),
					source: connection.source,
					target: connection.target,
					sourcePort: connection.sourceHandle ?? "output",
					targetPort: connection.targetHandle ?? "references",
				},
			],
		});
	};
	const nodes = useMemo<CanvasNode[]>(
		() =>
			graph.nodes.map((node) => ({
				id: node.id,
				type: "workflow",
				position: node.position,
				selected: node.id === selected,
				data: { node },
			})),
		[graph.nodes, selected],
	);
	const edges = useMemo(
		() =>
			graph.edges.map((edge) => ({
				...edge,
				sourceHandle: edge.sourcePort,
				targetHandle: edge.targetPort,
			})),
		[graph.edges],
	);
	const controls = [
		{ label: "放大", icon: Plus, run: () => void zoomIn() },
		{ label: "缩小", icon: Minus, run: () => void zoomOut() },
		{ label: "适配视图", icon: Maximize, run: () => void fitView({ padding: 0.5, maxZoom: 1 }) },
		{
			label: locked ? "解锁画布" : "锁定画布",
			icon: locked ? Unlock : LockKeyhole,
			run: () => setLocked(!locked),
		},
		{
			label: "自动布局",
			icon: Layout,
			run: () => {
				changeGraph({
					...graph,
					nodes: graph.nodes.map((node, index) => ({
						...node,
						position: { x: (index % 3) * 340, y: Math.floor(index / 3) * 260 },
					})),
				});
				requestAnimationFrame(() => void fitView({ padding: 0.5, maxZoom: 1 }));
			},
		},
	];
	if (loaded.error)
		return (
			<div role="alert" className="p-6 text-error-foreground">
				无法读取本地工作流：{loaded.error}。原始数据已保留，未覆盖。
			</div>
		);
	return (
		<div
			className="flex h-full min-h-0 bg-ide-editor text-foreground"
			data-testid="workflow-generation-surface"
		>
			<div className="flex min-w-0 flex-1 flex-col">
				<header className="flex shrink-0 items-center justify-between gap-2 px-4 py-2">
					<div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
						<Grid2X2 className="size-3.5 shrink-0" />
						<span className="truncate">{section.headingText}</span>
						<span className="shrink-0" role="status">
							{saved ? "本机已保存" : "未保存"}
						</span>
					</div>
					<Popover
						open={!!editor}
						onOpenChange={(open) => {
							if (!open) setEditor(null);
						}}
					>
						<PopoverAnchor asChild>
							<div className="shrink-0">
								<Select
									value={document.id}
									onValueChange={(value) => {
										if (value === "__create" || value === "__rename") {
											setName(value === "__create" ? "未命名工作流" : document.name);
											setEditor(value === "__create" ? "create" : "rename");
										} else switchDocument(value);
									}}
								>
									<SelectTrigger aria-label="选择工作流" className="w-52 max-w-[38vw]">
										<span>{document.name}</span>
									</SelectTrigger>
									<SelectContent
										align="end"
										onCloseAutoFocus={(event) => {
											if (editor) event.preventDefault();
										}}
									>
										<SelectItem value="__create">＋ 新建工作流</SelectItem>
										<SelectSeparator />
										{state.documents.map((item) => (
											<SelectItem key={item.id} value={item.id}>
												{item.name}
											</SelectItem>
										))}
										<SelectSeparator />
										<SelectItem value="__rename">重命名工作流</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</PopoverAnchor>
						<PopoverContent
							align="end"
							className="w-80"
							aria-label={editor === "create" ? "新建工作流" : "重命名工作流"}
							onEscapeKeyDown={(event) => event.stopPropagation()}
						>
							<form className="space-y-3" onSubmit={submitName}>
								<p className="text-sm font-semibold">
									{editor === "create" ? "新建工作流" : "重命名工作流"}
								</p>
								<label className="block space-y-2 text-xs">
									工作流名称
									<Input
										value={name}
										onChange={(event) => setName(event.target.value)}
										onFocus={(event) => event.currentTarget.select()}
										onKeyDown={(event) => {
											if (event.key === "Enter" && event.nativeEvent.isComposing)
												event.preventDefault();
										}}
									/>
								</label>
								<div className="flex justify-end gap-2">
									<Button variant="outline" type="button" onClick={() => setEditor(null)}>
										取消
									</Button>
									<Button disabled={!name.trim()} type="submit">
										{editor === "create" ? "创建" : "保存"}
									</Button>
								</div>
							</form>
						</PopoverContent>
					</Popover>
				</header>
				{saveError && (
					<div
						role="alert"
						className="flex items-center gap-2 px-4 py-2 text-xs text-error-foreground"
					>
						{saveError}
						<Button variant="outline" onClick={() => commit(latest.current)}>
							重试保存
						</Button>
					</div>
				)}
				<div className="relative min-h-0 flex-1">
					<MediaPickerContext.Provider value={setPickerNodeId}>
						<ReactFlow
							key={document.id}
							className="episode-canvas-flow"
							nodes={nodes}
							edges={edges}
							nodeTypes={nodeTypes}
							fitView
							fitViewOptions={{ maxZoom: 1, padding: 0.5 }}
							minZoom={0.2}
							maxZoom={2}
							nodesDraggable={!locked}
							nodesConnectable={!locked}
							elementsSelectable={!locked}
							deleteKeyCode={locked ? null : ["Backspace", "Delete"]}
							onNodesChange={onNodesChange}
							onEdgesChange={onEdgesChange}
							onConnect={onConnect}
							onNodeClick={(_, node) => setSelected(node.id)}
							onPaneClick={() => setSelected(null)}
							zoomOnDoubleClick={false}
							onDoubleClick={(event) => {
								if (!locked && (event.target as Element).classList.contains("react-flow__pane"))
									setCreatePosition(screenToFlowPosition({ x: event.clientX, y: event.clientY }));
							}}
							proOptions={{ hideAttribution: true }}
						>
							<Background gap={20} size={1} color="var(--border)" />
							<div className="absolute bottom-4 left-4 z-10 flex flex-col rounded border border-border bg-ide-panel shadow-lg">
								{controls.map(({ label, icon: Icon, run }) => (
									<button
										key={label}
										type="button"
										title={label}
										aria-label={label}
										onClick={run}
										disabled={locked && label === "自动布局"}
										className="grid size-7 place-items-center border-b border-border last:border-0 hover:bg-ide-list-hover disabled:opacity-50"
									>
										<Icon className="size-4" />
									</button>
								))}
							</div>
						</ReactFlow>
					</MediaPickerContext.Provider>
					<Popover
						open={!!createPosition}
						onOpenChange={(open) => {
							if (!open) setCreatePosition(null);
						}}
					>
						<PopoverAnchor asChild>
							<div className="absolute left-4 top-3 z-10">
								<Button
									variant="outline"
									size="sm"
									disabled={locked}
									onClick={() => setCreatePosition({ x: graph.nodes.length * 320, y: 0 })}
								>
									<Plus />
									添加节点
								</Button>
							</div>
						</PopoverAnchor>
						<PopoverContent
							align="start"
							aria-label="创建节点"
							className="grid w-48 gap-1 p-2"
							onEscapeKeyDown={(event) => event.stopPropagation()}
						>
							{(["image", "video", "audio", "text"] as WorkflowKind[]).map((kind) => (
								<Button key={kind} variant="ghost" onClick={() => addNode(kind)}>
									{workflowKindLabels[kind]}
								</Button>
							))}
							<Button variant="outline" onClick={() => setCreatePosition(null)}>
								取消
							</Button>
						</PopoverContent>
					</Popover>
					{graph.nodes.length === 0 && (
						<div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
							双击空白处创建节点
						</div>
					)}
					{selectedNode && (
						<div className="absolute bottom-8 left-16 right-6 z-10 rounded-xl border border-border bg-ide-panel p-3 shadow-xl">
							<Textarea
								aria-label="节点提示词"
								rows={2}
								className="min-h-14 resize-none border-0 bg-transparent shadow-none"
								placeholder={
									selectedNode.kind === "text"
										? "输入文字内容…"
										: `描述这个节点要生成的${workflowKindLabels[selectedNode.kind]}…`
								}
								value={
									selectedNode.kind === "text"
										? (selectedNode.value.text ?? "")
										: selectedNode.config.prompt
								}
								onChange={(event) => {
									const text = event.target.value;
									updateNode(selectedNode.id, (node) =>
										node.kind === "text"
											? { ...node, value: { ...node.value, text } }
											: { ...node, config: { ...node.config, prompt: text } },
									);
								}}
							/>
							<div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
								<span>工作流执行【待接入】</span>
								<div className="flex gap-2">
									<Button
										aria-label="删除节点"
										variant="ghost"
										size="sm"
										disabled={locked}
										onClick={() => onNodesChange([{ type: "remove", id: selectedNode.id }])}
									>
										<Trash2 />
									</Button>
									<Button disabled size="sm" variant="secondary" title="工作流执行尚未接入">
										<Play />
										运行
									</Button>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
			<aside
				aria-label="当前资源"
				className="w-1/4 min-w-32 shrink-0 border-l border-border bg-ide-panel p-3"
			>
				<div
					aria-current="true"
					className="flex min-h-16 items-center rounded-lg border-2 border-primary bg-primary/5 px-3 text-sm font-semibold"
				>
					{section.headingText}
				</div>
			</aside>
			{pickerNode && pickerNode.kind !== "text" && (
				<>
					{media.error ? (
						<div
							role="alert"
							className="absolute inset-x-8 bottom-4 z-[60] rounded border border-error-border bg-error-surface p-3 text-error-foreground"
						>
							素材加载失败
							<Button variant="outline" onClick={() => void media.mutate()}>
								重试
							</Button>
							<Button variant="ghost" onClick={() => setPickerNodeId(null)}>
								关闭
							</Button>
						</div>
					) : media.isLoading || media.isValidating ? (
						<div role="status" className="absolute bottom-4 right-8 z-[60] bg-card p-3">
							正在加载素材…
						</div>
					) : (
						<MaterialLibraryImportDialog
							confirmLabel="选用素材"
							description="从项目素材库选择素材，或上传后用于当前节点。"
							open
							assetKind={pickerNode.kind}
							selectionMode="single"
							mediaAssets={media.data?.assets ?? []}
							onOpenChange={(open) => {
								if (!open) setPickerNodeId(null);
							}}
							onUploadAsset={(file) => uploadMediaAsset(file, projectId)}
							onConfirmSelection={(assets) => {
								const asset = assets[0];
								if (asset)
									updateNode(pickerNode.id, (node) => ({
										...node,
										value: { assetId: asset.id, url: asset.url },
									}));
								setPickerNodeId(null);
							}}
						/>
					)}
				</>
			)}
		</div>
	);
};

function WorkflowNodeCard({ data, selected }: NodeProps<CanvasNode>) {
	const pickMedia = useContext(MediaPickerContext);
	const node = data.node;
	return (
		<div className="w-64 text-xs">
			<Handle
				id="references"
				type="target"
				position={Position.Left}
				className="!size-2 !border-0 !bg-primary"
			/>
			<div className="mb-2 flex items-center justify-between text-muted-foreground">
				<span className="flex items-center gap-1.5">
					<FileVideo className="size-3.5" />
					{node.title}
				</span>
				{node.kind !== "text" && (
					<button
						className="nodrag rounded p-1 hover:bg-ide-list-hover"
						type="button"
						title="从素材库选择"
						aria-label={`从素材库选择${workflowKindLabels[node.kind]}`}
						onClick={() => pickMedia(node.id)}
					>
						<FolderOpen className="size-4" />
					</button>
				)}
			</div>
			<div
				className={cn(
					"flex h-36 items-center justify-center overflow-hidden rounded-lg border bg-ide-panel p-2 text-center text-muted-foreground",
					selected ? "border-primary ring-1 ring-primary" : "border-border",
				)}
			>
				{node.kind === "text" ? (
					<p className="line-clamp-6 whitespace-pre-wrap">{node.value.text || "输入文字内容"}</p>
				) : node.value.url ? (
					node.kind === "image" ? (
						<img
							src={apiResourceURL(node.value.url)}
							alt={node.title}
							className="size-full object-contain"
						/>
					) : node.kind === "video" ? (
						<video
							className="nodrag size-full"
							src={apiResourceURL(node.value.url)}
							controls
							preload="metadata"
						/>
					) : (
						<audio
							className="nodrag w-full"
							src={apiResourceURL(node.value.url)}
							controls
							preload="metadata"
						/>
					)
				) : (
					<span>从素材库选择，或连线后运行生成</span>
				)}
			</div>
			<Handle
				id="output"
				type="source"
				position={Position.Right}
				className="!size-2 !border-0 !bg-primary"
			/>
		</div>
	);
}
const nodeTypes = { workflow: WorkflowNodeCard };
