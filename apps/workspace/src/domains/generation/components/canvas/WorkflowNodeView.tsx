import { createContext, useContext, useRef, useState } from "react";
import { MarkdownHybridEditor as TextEditor } from "@/domains/documents/components/MarkdownHybridEditor";
import {
	Handle,
	Position,
	NodeToolbar,
	useNodeConnections,
	type Node,
	type NodeProps,
} from "@xyflow/react";
import {
	AlignLeft,
	AudioLines,
	Image as ImageIcon,
	LayoutGrid,
	Video,
	Copy,
	Download,
	Maximize,
	X,
	Pencil,
	FolderPlus,
	RefreshCw,
} from "lucide-react";
import { WorkflowNodeSettings } from "./WorkflowNodeSettings";
import { WorkflowMediaTools, type MediaTool } from "./WorkflowMediaTools";
import type { WorkflowNode, WorkflowGraph } from "../../lib/workflow-schema-v4";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { GenerationModalShell } from "@/domains/documents/components/GenerationModalShell";
import { uploadMediaAsset, type MediaAsset } from "@/domains/workspace/api/media";
import { apiResourceURL } from "@/shared/lib/api-base";
import { cn } from "@/shared/lib/utils";
import { useToast } from "@/hooks/useToast";

export type CanvasNode = Node<{ node: WorkflowNode }>;
export const NodeConfigContext = createContext<{
	update: (id: string, data: Partial<WorkflowNode["data"]>) => void;
	generate: (id: string) => void;
	generationLocked: boolean;
	pickMedia: (id: string) => void;
	remove: (id: string) => void;
	copy: (id: string) => void;
	duplicate: (id: string) => void;
	graph: WorkflowGraph;
	disconnect: (id: string) => void;
	projectId: string;
	insertAssets: (assets: MediaAsset[], position: { x: number; y: number }, nodeId?: string) => void;
} | null>(null);
export const nodeLabels: Record<string, string> = {
	textNode: "文本",
	imageNode: "图片",
	videoNode: "视频",
	audioNode: "音频",
	imageGeneration: "图片生成",
	videoGeneration: "视频生成",
	audioGeneration: "音频生成",
	director3D: "3D 导演台",
};
const nodeIcons: Record<string, typeof ImageIcon> = {
	textNode: AlignLeft,
	imageNode: ImageIcon,
	videoNode: Video,
	audioNode: AudioLines,
	imageGeneration: ImageIcon,
	videoGeneration: Video,
	audioGeneration: AudioLines,
};
export const nodeLabel = (node: WorkflowNode) => node.data.label || nodeLabels[node.type] || "节点";

export function WorkflowNodeView({ data, selected }: NodeProps<CanvasNode>) {
	const node = data.node;
	const Icon = nodeIcons[node.type] ?? LayoutGrid;
	const {
		update,
		generate,
		generationLocked,
		pickMedia,
		remove,
		duplicate,
		copy,
		graph,
		disconnect,
		projectId,
		insertAssets,
	} = useContext(NodeConfigContext)!;
	const toast = useToast();
	const connections = useNodeConnections({ id: node.id });
	const [renaming, setRenaming] = useState(false);
	const [preview, setPreview] = useState(false);
	const [promptExpanded, setPromptExpanded] = useState(false);
	const [mediaTool, setMediaTool] = useState<MediaTool | null>(null);
	const [busy, setBusy] = useState(false);
	const [revision, setRevision] = useState(0);
	const videoRef = useRef<HTMLVideoElement>(null);
	const config = node.data.config ?? {};
	const isText = node.type === "textNode";
	const isMedia = ["imageNode", "videoNode", "audioNode"].includes(node.type);
	const isGenerator = node.type.endsWith("Generation");
	const output = Object.values(node.data.outputs ?? {}).find(
		(value) => typeof value.value === "string",
	);
	const mediaURL =
		output && output.dataType !== "TEXT" && typeof output.value === "string"
			? apiResourceURL(output.value)
			: undefined;
	const prompt =
		isText && output && ["TEXT", "STRING"].includes(output.dataType)
			? String(output.value)
			: (config.prompt ?? "");
	const targets = node.data.handles.filter((handle) => handle.type === "target");
	const sources = node.data.handles.filter((handle) => handle.type === "source");
	const references = graph.edges
		.filter((edge) => edge.target === node.id)
		.map((edge) => ({ edge, source: graph.nodes.find((item) => item.id === edge.source) }));
	const setPrompt = (value: string) =>
		update(node.id, {
			config: isText ? config : { ...config, prompt: value },
			...(isText
				? {
						outputs: {
							...node.data.outputs,
							[sources[0]?.id ?? "output"]: { dataType: "TEXT" as const, value },
						},
					}
				: {}),
		});
	const fileFromOutput = async () => {
		if (isText) return new File([prompt], `${nodeLabel(node)}.md`, { type: "text/markdown" });
		if (!mediaURL) throw new Error("节点没有可用的输出");
		const response = await fetch(mediaURL);
		if (!response.ok) throw new Error(`读取素材失败：${response.status}`);
		const blob = await response.blob();
		const extension = blob.type.split("/")[1]?.split(";")[0] || "bin";
		return new File([blob], `${nodeLabel(node)}.${extension}`, { type: blob.type });
	};
	const outputAction = async (action: "download" | "save" | "clipboard") => {
		setBusy(true);
		try {
			if (action === "clipboard") {
				await navigator.clipboard.writeText(isText ? prompt : (mediaURL ?? ""));
				toast.success("已复制到剪贴板");
			} else if (action === "save" && config.params?.assetId) toast.info("此素材已在项目素材库中");
			else {
				const file = await fileFromOutput();
				if (action === "save") {
					const asset = await uploadMediaAsset(file, projectId);
					update(node.id, {
						config: { ...config, params: { ...config.params, assetId: asset.id } },
					});
					toast.success("已添加到素材库");
				} else {
					const url = URL.createObjectURL(file);
					const link = document.createElement("a");
					link.href = url;
					link.download = file.name;
					link.click();
					setTimeout(() => URL.revokeObjectURL(url), 1000);
				}
			}
		} catch (error) {
			toast.error("操作失败", { description: String(error) });
		} finally {
			setBusy(false);
		}
	};
	const snapshot = async () => {
		const video = videoRef.current;
		if (!video?.videoWidth) return;
		setBusy(true);
		try {
			const canvas = document.createElement("canvas");
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;
			canvas.getContext("2d")!.drawImage(video, 0, 0);
			const blob = await new Promise<Blob>((resolve, reject) =>
				canvas.toBlob(
					(result) => (result ? resolve(result) : reject(new Error("截帧失败"))),
					"image/png",
				),
			);
			const asset = await uploadMediaAsset(
				new File([blob], `${nodeLabel(node)}-${video.currentTime.toFixed(2)}.png`, {
					type: "image/png",
				}),
				projectId,
			);
			insertAssets([asset], { x: node.position.x + 300, y: node.position.y });
			toast.success("当前帧已加入画布");
		} catch (error) {
			toast.error("截帧失败", { description: String(error) });
		} finally {
			setBusy(false);
		}
	};
	const renderMedia = (large = false) =>
		output?.dataType === "IMAGE" ? (
			<img
				key={revision}
				className={cn("w-full rounded object-contain", large ? "max-h-[75vh]" : "max-h-60")}
				src={mediaURL}
				alt={nodeLabel(node)}
				draggable={false}
			/>
		) : output?.dataType === "VIDEO" ? (
			<video
				key={revision}
				ref={large ? undefined : videoRef}
				className="nodrag nopan nowheel max-h-[70vh] w-full rounded"
				src={mediaURL}
				crossOrigin="anonymous"
				controls
				playsInline
				preload="metadata"
			/>
		) : (
			<audio
				key={revision}
				className="nodrag nopan nowheel w-full"
				src={mediaURL}
				controls
				preload="metadata"
			/>
		);
	return (
		<div
			className={cn(
				"relative text-left",
				isGenerator ? "w-[360px]" : "w-[220px]",
				selected && "z-10",
			)}
		>
			<NodeToolbar
				isVisible={selected}
				position={Position.Top}
				offset={14}
				className="nodrag nopan nowheel flex max-w-[90vw] items-center gap-0.5 overflow-x-auto rounded-lg border border-border bg-card p-1 shadow-md"
				onPointerDown={(event) => event.stopPropagation()}
			>
				<Button
					size="sm"
					variant="ghost"
					disabled={busy || (!mediaURL && !isText)}
					onClick={() => void outputAction("save")}
				>
					<FolderPlus className="size-4" />
					添加到素材库
				</Button>
				{isText && (
					<Button size="sm" variant="ghost" onClick={() => setPreview(true)}>
						<Pencil className="size-4" />
						编辑文本
					</Button>
				)}
				{output?.dataType === "IMAGE" && (
					<>
						<Button size="sm" variant="ghost" onClick={() => setMediaTool("mark")}>
							标记
						</Button>
						<Button size="sm" variant="ghost" onClick={() => setMediaTool("grid")}>
							宫格切分
						</Button>
						<Button size="sm" variant="ghost" onClick={() => setMediaTool("crop")}>
							裁剪
						</Button>
					</>
				)}
				{output?.dataType === "VIDEO" && (
					<Button size="sm" variant="ghost" disabled={busy} onClick={() => void snapshot()}>
						截取当前帧
					</Button>
				)}
				{isMedia && (
					<Button size="sm" variant="ghost" onClick={() => pickMedia(node.id)}>
						替换{nodeLabels[node.type]}
					</Button>
				)}
				<Button
					size="icon"
					variant="ghost"
					title="复制节点"
					aria-label="复制节点"
					onClick={() => copy(node.id)}
				>
					<Copy className="size-4" />
				</Button>
				<Button size="sm" variant="ghost" onClick={() => duplicate(node.id)}>
					创建副本
				</Button>
				<Button
					size="icon"
					variant="ghost"
					title="下载"
					aria-label="下载"
					disabled={busy || (!mediaURL && !isText)}
					onClick={() => void outputAction("download")}
				>
					<Download className="size-4" />
				</Button>
				<Button
					size="icon"
					variant="ghost"
					title="全屏预览"
					aria-label="全屏预览"
					disabled={!mediaURL && !isText}
					onClick={() => setPreview(true)}
				>
					<Maximize className="size-4" />
				</Button>
			</NodeToolbar>
			<div className="group flex h-7 items-center gap-1.5 px-1 text-sm text-foreground">
				<Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
				{renaming ? (
					<Input
						autoFocus
						aria-label="节点名称"
						className="nodrag nopan h-6"
						defaultValue={node.data.label}
						onBlur={(event) => {
							if (event.target.value.trim()) update(node.id, { label: event.target.value.trim() });
							setRenaming(false);
						}}
						onKeyDown={(event) => {
							event.stopPropagation();
							if (event.key === "Enter") event.currentTarget.blur();
							if (event.key === "Escape") setRenaming(false);
						}}
					/>
				) : (
					<span
						className="min-w-0 flex-1 truncate"
						role="button"
						tabIndex={0}
						title="双击编辑名称"
						onDoubleClick={(event) => {
							event.stopPropagation();
							setRenaming(true);
						}}
						onKeyDown={(event) => {
							if (event.key === "Enter") setRenaming(true);
						}}
					>
						{nodeLabel(node)}
					</span>
				)}
				{selected && (
					<div className="nodrag nopan flex shrink-0">
						<button
							aria-label="刷新预览"
							title="刷新预览"
							className="p-1"
							onClick={() => setRevision(revision + 1)}
						>
							<RefreshCw className="size-3.5" />
						</button>
						<button
							aria-label="移除节点"
							title="移除节点"
							className="p-1"
							onClick={() => remove(node.id)}
						>
							<X className="size-3.5" />
						</button>
					</div>
				)}
			</div>
			<div
				className={cn(
					"relative min-h-32 rounded-lg border bg-card p-2 shadow-sm",
					selected ? "border-primary ring-1 ring-primary/20" : "border-border",
				)}
			>
				{isText ? (
					<div className="flex min-h-28 flex-col">
						<div className="nopan nowheel max-h-56 overflow-auto whitespace-pre-wrap break-words p-2 text-sm">
							{prompt}
						</div>
						<Button
							size="sm"
							variant="ghost"
							className="nodrag nopan mt-auto self-center"
							onClick={() => setPreview(true)}
						>
							<Pencil className="size-3" />
							编辑
						</Button>
					</div>
				) : mediaURL ? (
					renderMedia()
				) : (
					<div className="flex min-h-36 flex-col items-center justify-center gap-2 text-muted-foreground">
						<Icon className="size-12 stroke-1" aria-hidden="true" />
						{isMedia && (
							<Button
								size="sm"
								variant="ghost"
								className="nodrag nopan"
								onClick={() => pickMedia(node.id)}
							>
								上传或选择素材
							</Button>
						)}
						{node.type === "director3D" && <span className="text-xs">3D 导演台【待接入】</span>}
					</div>
				)}
				{node.data.status === "generating" && (
					<p role="status" className="text-sm text-primary">
						生成中…
					</p>
				)}
				{node.data.error && (
					<p role="alert" className="text-sm text-error-foreground">
						{node.data.error}
					</p>
				)}
				{!!node.data.candidates?.length && (
					<div
						className="nodrag nopan nowheel mt-2 flex gap-1 overflow-x-auto"
						aria-label="候选结果"
					>
						{node.data.candidates.map((candidate, index) => (
							<button
								key={`${candidate.url}-${index}`}
								aria-label={`选择候选 ${index + 1}`}
								aria-pressed={(node.data.selectedCandidate ?? 0) === index}
								className={cn(
									"shrink-0 rounded border p-1 text-xs",
									(node.data.selectedCandidate ?? 0) === index
										? "border-primary bg-primary/10"
										: "border-border",
								)}
								onClick={() =>
									update(node.id, {
										selectedCandidate: index,
										outputs: {
											...node.data.outputs,
											[sources[0]?.id ?? "output"]: {
												dataType: candidate.dataType,
												value: candidate.url,
											},
										},
										config: { ...config, params: { ...config.params, assetId: candidate.assetId } },
									})
								}
							>
								{candidate.dataType === "IMAGE" ? (
									<img
										src={apiResourceURL(candidate.url)}
										className="size-12 rounded object-cover"
										alt={`候选 ${index + 1}`}
									/>
								) : (
									`候选 ${index + 1}`
								)}
							</button>
						))}
					</div>
				)}
				{[...targets, ...sources].map((handle) => {
					const siblings = handle.type === "source" ? sources : targets;
					const connected = connections.some((edge) =>
						handle.type === "source"
							? edge.sourceHandle === handle.id
							: edge.targetHandle === handle.id,
					);
					return (
						<Handle
							key={`${handle.type}-${handle.id}`}
							id={handle.id}
							type={handle.type}
							position={handle.type === "source" ? Position.Right : Position.Left}
							title={`${handle.label ?? handle.id} · ${Array.isArray(handle.dataType) ? handle.dataType.join(" / ") : handle.dataType}`}
							style={{ top: `${((siblings.indexOf(handle) + 1) / (siblings.length + 1)) * 100}%` }}
							className={cn(
								"!size-4 !border-2 !bg-card",
								connected
									? "!border-solid !border-primary after:absolute after:inset-1 after:rounded-full after:bg-primary"
									: "!border-dashed !border-muted-foreground",
							)}
						/>
					);
				})}
			</div>
			{selected && (isGenerator || isText) && (
				<div
					className="nodrag nopan nowheel absolute left-1/2 top-full z-20 mt-3 w-[660px] max-w-[80vw] -translate-x-1/2 space-y-3 rounded-xl border border-border bg-card p-4 shadow-md"
					onPointerDown={(event) => event.stopPropagation()}
				>
					{!!references.length && (
						<div className="flex flex-wrap gap-2">
							{references.map(({ edge, source }, index) => {
								const value = source?.data.outputs?.[edge.sourceHandle];
								return (
									<div
										key={edge.id}
										className="relative flex h-14 max-w-36 items-center gap-1 rounded-lg border border-border bg-muted p-2 text-xs"
										title={source?.data.label}
									>
										<span>{index + 1}</span>
										{value?.dataType === "IMAGE" && typeof value.value === "string" ? (
											<img
												src={apiResourceURL(value.value)}
												alt={source?.data.label}
												className="size-10 rounded object-cover"
											/>
										) : (
											<span className="truncate">{source?.data.label ?? "引用节点"}</span>
										)}
										<button
											className="absolute -right-1 -top-1 rounded-full border border-border bg-card"
											aria-label={`删除引用 ${index + 1}`}
											onClick={() => disconnect(edge.id)}
										>
											<X className="size-3" />
										</button>
									</div>
								);
							})}
						</div>
					)}
					<div className="relative">
						<Textarea
							aria-label="生成提示词"
							className="min-h-24 resize-y border-0 pr-8 shadow-none"
							value={config.prompt ?? ""}
							placeholder="描述想要生成的内容…"
							onChange={(event) =>
								update(node.id, { config: { ...config, prompt: event.target.value } })
							}
						/>
						<button
							aria-label="展开编辑提示词"
							className="absolute right-0 top-1 p-1 text-muted-foreground"
							onClick={() => setPromptExpanded(true)}
						>
							<Maximize className="size-4" />
						</button>
					</div>
					<WorkflowNodeSettings
						type={node.type}
						config={config}
						onChange={(next) => update(node.id, { config: next })}
					/>
					<div className="flex justify-end">
						<Button
							aria-label={`生成${isText ? "文本" : node.type === "videoGeneration" ? "视频" : node.type === "audioGeneration" ? "音频" : "图片"}`}
							disabled={generationLocked || node.data.status === "generating" || !config.modelId}
							onClick={() => generate(node.id)}
						>
							{node.data.status === "generating"
								? "生成中…"
								: node.data.status === "failed"
									? "重试生成"
									: "生成"}
						</Button>
					</div>
				</div>
			)}
			{preview && (
				<GenerationModalShell
					open
					onOpenChange={setPreview}
					title={isText ? "编辑文本" : nodeLabel(node)}
					titleId={`preview-${node.id}`}
					contentClassName="h-[85vh]"
					headerActions={
						<Button variant="ghost" size="sm" onClick={() => void outputAction("clipboard")}>
							复制到剪贴板
						</Button>
					}
				>
					<div
						className="nodrag nopan nowheel h-full overflow-auto p-4"
						onKeyDown={(event) => event.stopPropagation()}
					>
						{isText && node.data.status === "generating" ? (
							<div className="whitespace-pre-wrap">{prompt}</div>
						) : isText ? (
							<TextEditor documentId={`workflow-${node.id}`} value={prompt} onChange={setPrompt} />
						) : (
							renderMedia(true)
						)}
					</div>
				</GenerationModalShell>
			)}
			{promptExpanded && (
				<GenerationModalShell
					open
					onOpenChange={setPromptExpanded}
					title="编辑提示词"
					titleId={`prompt-${node.id}`}
				>
					<Textarea
						autoFocus
						className="h-full min-h-80 resize-none border-0 p-6"
						value={config.prompt ?? ""}
						onChange={(event) =>
							update(node.id, { config: { ...config, prompt: event.target.value } })
						}
					/>
				</GenerationModalShell>
			)}
			{mediaTool && mediaURL && (
				<WorkflowMediaTools
					mode={mediaTool}
					src={mediaURL}
					label={nodeLabel(node)}
					projectId={projectId}
					onClose={() => setMediaTool(null)}
					onAssets={(assets) =>
						insertAssets(assets, { x: node.position.x + 300, y: node.position.y })
					}
				/>
			)}
		</div>
	);
}
