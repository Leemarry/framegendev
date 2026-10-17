import {
	addEdge,
	Background,
	Controls,
	Handle,
	MiniMap,
	Position,
	ReactFlow,
	ReactFlowProvider,
	useEdgesState,
	useNodesState,
	type Connection,
	type Edge,
	type Node,
	type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { FileText, Image, Plus, Video } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { MarkdownSectionContext } from "@/domains/documents/components/MarkdownHybridEditor";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

type WorkflowNodeKind = "input" | "prompt" | "output";
type WorkflowNodeData = { body: string; kind: WorkflowNodeKind; label: string };
type WorkflowNode = Node<WorkflowNodeData>;
type WorkflowEdge = Edge;

interface WorkflowGenerationSurfaceProps {
	projectId?: string;
	section: MarkdownSectionContext;
}

export const WorkflowGenerationSurface: React.FC<WorkflowGenerationSurfaceProps> = ({
	projectId,
	section,
}) => {
	const storageKey = `mediago.workflow.v1:${projectId?.trim() || "global"}:${section.documentId}:${section.blockId}`;
	const initialGraph = useMemo(() => readGraph(storageKey, section), [section, storageKey]);
	const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNode>(initialGraph.nodes);
	const [edges, setEdges, onEdgesChange] = useEdgesState<WorkflowEdge>(initialGraph.edges);
	const [saved, setSaved] = useState(true);

	useEffect(() => {
		setNodes(initialGraph.nodes);
		setEdges(initialGraph.edges);
		setSaved(true);
	}, [initialGraph, setEdges, setNodes]);

	const onConnect = useCallback(
		(connection: Connection) => {
			setEdges((current) => addEdge({ ...connection, animated: true }, current));
			setSaved(false);
		},
		[setEdges],
	);
	const save = useCallback(() => {
		try {
			localStorage.setItem(storageKey, JSON.stringify({ nodes, edges }));
			setSaved(true);
		} catch {
			setSaved(false);
		}
	}, [edges, nodes, storageKey]);
	const addNode = useCallback(() => {
		setNodes((current) => [
			...current,
			{
				id: `node-${Date.now()}`,
				position: { x: 80 + current.length * 40, y: 260 + (current.length % 3) * 70 },
				type: "workflow",
				data: { body: "", kind: "prompt", label: `步骤 ${current.length + 1}` },
			},
		]);
		setSaved(false);
	}, [setNodes]);

	return (
		<div
			className="flex h-full min-h-0 flex-col bg-ide-editor"
			data-testid="workflow-generation-surface"
		>
			<div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-3 py-2">
				<div className="min-w-0">
					<p className="truncate text-xs font-semibold text-foreground">工作流画布</p>
					<p className="truncate text-[0.68rem] text-muted-foreground">
						{section.headingText} · {saved ? "已保存" : "有未保存修改"}
					</p>
				</div>
				<div className="flex shrink-0 items-center gap-1.5">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={addNode}
						aria-label="添加工作流节点"
						title="添加节点"
					>
						<Plus />
						<span className="hidden sm:inline">添加节点</span>
					</Button>
					<Button type="button" variant="secondary" size="sm" onClick={save} disabled={saved}>
						保存
					</Button>
				</div>
			</div>
			<div className="min-h-0 flex-1">
				<ReactFlowProvider>
					<ReactFlow
						nodes={nodes}
						edges={edges}
						nodeTypes={nodeTypes}
						onNodesChange={(changes) => {
							onNodesChange(changes);
							setSaved(false);
						}}
						onEdgesChange={(changes) => {
							onEdgesChange(changes);
							setSaved(false);
						}}
						onConnect={onConnect}
						fitView
						proOptions={{ hideAttribution: true }}
					>
						<Background gap={20} size={1} />
						<Controls showInteractive={false} />
						<MiniMap
							pannable
							zoomable
							nodeColor={(node) =>
								node.data?.kind === "output"
									? "var(--info-foreground)"
									: node.data?.kind === "input"
										? "var(--success-foreground)"
										: "var(--warning-foreground)"
							}
						/>
					</ReactFlow>
				</ReactFlowProvider>
			</div>
		</div>
	);
};

const WorkflowNodeCard: React.FC<NodeProps<WorkflowNode>> = ({ data, selected }) => {
	const Icon = data.kind === "input" ? Image : data.kind === "output" ? Video : FileText;
	return (
		<div
			className={cn(
				"min-w-44 rounded-md border bg-card p-3 shadow-lg",
				selected ? "border-primary" : "border-border",
			)}
		>
			<Handle
				type="target"
				position={Position.Left}
				className="!size-2 !border-0 !bg-muted-foreground"
			/>
			<div className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground">
				<Icon className="size-4" />
				{data.label}
			</div>
			<p className="line-clamp-4 text-[0.68rem] leading-4 text-muted-foreground">
				{data.body || "双击节点后配置内容"}
			</p>
			<div className="mt-2 h-1.5 rounded-full bg-muted" />
			<Handle type="source" position={Position.Right} className="!size-2 !border-0 !bg-primary" />
		</div>
	);
};

const nodeTypes = { workflow: WorkflowNodeCard };

const readGraph = (
	key: string,
	section: MarkdownSectionContext,
): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } => {
	try {
		const value = JSON.parse(localStorage.getItem(key) ?? "null") as {
			nodes?: WorkflowNode[];
			edges?: WorkflowEdge[];
		} | null;
		if (Array.isArray(value?.nodes) && Array.isArray(value?.edges))
			return { nodes: value.nodes, edges: value.edges };
	} catch {
		/* local storage can contain an interrupted write */
	}
	return {
		nodes: [
			{
				id: "input",
				position: { x: 60, y: 160 },
				type: "workflow",
				data: { kind: "input", label: "分镜输入", body: section.headingText },
			},
			{
				id: "prompt",
				position: { x: 350, y: 160 },
				type: "workflow",
				data: {
					kind: "prompt",
					label: "生成步骤",
					body: section.plainText || "描述要生成的视频画面",
				},
			},
			{
				id: "output",
				position: { x: 650, y: 160 },
				type: "workflow",
				data: { kind: "output", label: "视频输出", body: "运行后在此产出视频" },
			},
		],
		edges: [
			{ id: "input-prompt", source: "input", target: "prompt", animated: true },
			{ id: "prompt-output", source: "prompt", target: "output", animated: true },
		],
	};
};
