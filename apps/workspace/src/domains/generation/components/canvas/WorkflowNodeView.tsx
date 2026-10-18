import { WorkflowNodeSettings } from "./WorkflowNodeSettings";
import { createContext, useContext } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { AlignLeft, AudioLines, Image as ImageIcon, LayoutGrid, Video } from "lucide-react";
import type { WorkflowNode } from "../../lib/workflow-schema-v4";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { apiResourceURL } from "@/shared/lib/api-base";
import { cn } from "@/shared/lib/utils";

export type CanvasNode = Node<{ node: WorkflowNode }>;
export const NodeConfigContext = createContext<{
	update: (id: string, data: Partial<WorkflowNode["data"]>) => void;
	pickMedia: (id: string) => void;
}>({ update: () => undefined, pickMedia: () => undefined });

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
	const { update, pickMedia } = useContext(NodeConfigContext);
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
		isText && output?.dataType === "TEXT" ? String(output.value) : (config.prompt ?? "");
	const targets = node.data.handles.filter((handle) => handle.type === "target");
	const sources = node.data.handles.filter((handle) => handle.type === "source");

	const setPrompt = (value: string) => {
		update(node.id, {
			config: { ...config, prompt: value },
			...(isText
				? {
						outputs: {
							...node.data.outputs,
							[sources[0]?.id ?? "output"]: { dataType: "TEXT" as const, value },
						},
					}
				: {}),
		});
	};
	return (
		<div
			className={cn(
				"relative text-left",
				isGenerator ? "w-[360px]" : "w-[220px]",
				selected && "z-10",
			)}
		>
			<div className="flex h-7 items-center gap-1.5 px-1 text-sm text-foreground">
				<Icon className="size-4 text-muted-foreground" aria-hidden="true" />
				<span className="min-w-0 flex-1 truncate">{nodeLabel(node)}</span>
			</div>
			<div
				className={cn(
					"relative min-h-32 rounded-lg border bg-card p-2 shadow-sm",
					selected ? "border-primary ring-1 ring-primary/20" : "border-border",
				)}
			>
				{isText ? (
					<Textarea
						aria-label="文本内容"
						className="nodrag nopan nowheel min-h-28 resize-y border-0 shadow-none"
						placeholder="输入文本…"
						value={prompt}
						onChange={(event) => setPrompt(event.target.value)}
					/>
				) : mediaURL ? (
					output?.dataType === "IMAGE" ? (
						<img
							className="max-h-56 w-full rounded object-contain"
							src={mediaURL}
							alt={nodeLabel(node)}
						/>
					) : output?.dataType === "VIDEO" ? (
						<video
							className="nodrag nopan w-full rounded"
							src={mediaURL}
							controls
							preload="metadata"
						/>
					) : (
						<audio className="nodrag nopan w-full" src={mediaURL} controls preload="metadata" />
					)
				) : (
					<div className="flex min-h-28 flex-col items-center justify-center gap-2 text-muted-foreground">
						<Icon className="size-10 stroke-1" aria-hidden="true" />
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
				{[...targets, ...sources].map((handle) => {
					const siblings = handle.type === "source" ? sources : targets;
					return (
						<Handle
							key={`${handle.type}-${handle.id}`}
							id={handle.id}
							type={handle.type}
							position={handle.type === "source" ? Position.Right : Position.Left}
							title={handle.label ?? handle.id}
							style={{ top: `${((siblings.indexOf(handle) + 1) / (siblings.length + 1)) * 100}%` }}
							className="!size-4 !border-2 !border-dashed !border-muted-foreground !bg-card"
						/>
					);
				})}
			</div>
			{selected && (
				<div
					className="nodrag nopan nowheel mt-3 w-[320px] space-y-3 rounded-lg border border-border bg-card p-3 shadow-md"
					onPointerDown={(event) => event.stopPropagation()}
				>
					<label className="block space-y-1 text-xs text-muted-foreground">
						节点名称
						<Input
							value={node.data.label}
							onChange={(event) => update(node.id, { label: event.target.value })}
						/>
					</label>
					{isMedia ? (
						<Button size="sm" variant="outline" onClick={() => pickMedia(node.id)}>
							更换素材
						</Button>
					) : !isText && node.type !== "director3D" ? (
						<label className="block space-y-1 text-xs text-muted-foreground">
							提示词
							<Textarea
								value={config.prompt ?? ""}
								placeholder="描述你想生成的内容…"
								onChange={(event) => setPrompt(event.target.value)}
							/>
						</label>
					) : null}
					{isGenerator && (
						<WorkflowNodeSettings
							type={node.type}
							config={config}
							onChange={(next) => update(node.id, { config: next })}
						/>
					)}
				</div>
			)}
		</div>
	);
}
