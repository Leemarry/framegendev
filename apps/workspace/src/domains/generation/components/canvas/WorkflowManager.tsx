import { useCallback, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { AlertCircle, Loader2 } from "lucide-react";
import type { MarkdownSectionContext } from "@/domains/documents/components/MarkdownHybridEditor";
import {
	createWorkflow,
	updateWorkflow,
	deleteWorkflow,
	useWorkflows,
	useWorkflow,
	useWorkflowTemplates,
	workflowKeys,
	type WorkflowDocument,
} from "../../api/workflow";
import type { WorkflowGraph } from "../../lib/workflow-schema-v4";
import { WorkflowTabs } from "./WorkflowTabs";
import { WorkflowCreateDialog } from "./WorkflowCreateDialog";
import { WorkflowCanvasEditor } from "./WorkflowCanvasEditor";
import { useToast } from "@/hooks/useToast";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";

interface WorkflowManagerProps {
	projectId: string;
	documentId: string;
	shotName: string;
	section: MarkdownSectionContext;
}

/** One independent workflow collection per project, document and shot. */
export function WorkflowManager(props: WorkflowManagerProps) {
	return (
		<ShotWorkflows
			key={JSON.stringify([props.projectId, props.documentId, props.shotName])}
			{...props}
		/>
	);
}

function ShotWorkflows({ projectId, documentId, shotName, section }: WorkflowManagerProps) {
	const toast = useToast();
	const { mutate } = useSWRConfig();
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [createOpen, setCreateOpen] = useState(false);
	const [action, setAction] = useState<{
		id: string;
		name: string;
		kind: "rename" | "delete";
	} | null>(null);
	const [name, setName] = useState("");
	const [busy, setBusy] = useState(false);
	const deletedIds = useRef(new Set<string>());
	const {
		data,
		error,
		isLoading,
		mutate: refreshList,
	} = useWorkflows(projectId, shotName, documentId);
	const { data: templates, error: templatesError } = useWorkflowTemplates("builtin");
	const workflows = data?.workflows ?? [];
	const activeId = workflows.find((item) => item.id === selectedId)?.id ?? workflows[0]?.id ?? null;
	const { data: activeWorkflow, error: detailError, mutate: refreshDetail } = useWorkflow(activeId);

	const saveGraph = useCallback(
		async (graphData: WorkflowGraph) => {
			if (!activeId || deletedIds.current.has(activeId)) return;
			try {
				await updateWorkflow(activeId, { graphData });
				await mutate<WorkflowDocument>(
					workflowKeys.detail(activeId),
					(current) => (current ? { ...current, graphData } : current),
					{ revalidate: false },
				);
			} catch (error) {
				toast.error("画布保存失败", { description: errorMessage(error) });
				throw error;
			}
		},
		[activeId, mutate, toast],
	);

	const handleCreate: React.ComponentProps<typeof WorkflowCreateDialog>["onConfirm"] = async (
		params,
	) => {
		try {
			const workflow = await createWorkflow({
				projectId,
				documentId,
				shotName,
				name: params.name,
				description: params.description,
				templateRef: params.templateRef ?? undefined,
			});
			await mutate(workflowKeys.detail(workflow.id), workflow, { revalidate: false });
			setSelectedId(workflow.id);
			await refreshList(
				(current) => ({
					workflows: [
						...(current?.workflows ?? []),
						{
							id: workflow.id,
							name: workflow.name,
							shotName: workflow.shotName,
							nodeCount: workflow.graphData.nodes.length,
							updatedAt: workflow.updatedAt,
						},
					],
				}),
				{ revalidate: false },
			);
			toast.success("工作流已创建");
			return true;
		} catch (error) {
			toast.error("创建失败", { description: errorMessage(error) });
			return false;
		}
	};

	const confirmAction = async () => {
		if (!action || busy || (action.kind === "rename" && !name.trim())) return;
		setBusy(true);
		try {
			if (action.kind === "delete") {
				await deleteWorkflow(action.id);
				deletedIds.current.add(action.id);
				await refreshList(
					(current) => ({
						workflows: (current?.workflows ?? []).filter((w) => w.id !== action.id),
					}),
					{ revalidate: false },
				);
				await mutate(workflowKeys.detail(action.id), undefined, { revalidate: false });
				toast.success("工作流已删除");
			} else {
				await updateWorkflow(action.id, { name: name.trim() });
				await refreshList(
					(current) => ({
						workflows: (current?.workflows ?? []).map((w) =>
							w.id === action.id ? { ...w, name: name.trim() } : w,
						),
					}),
					{ revalidate: false },
				);
				await mutate<WorkflowDocument>(
					workflowKeys.detail(action.id),
					(current) => (current ? { ...current, name: name.trim() } : current),
					{ revalidate: false },
				);
				toast.success("重命名成功");
			}
			setAction(null);
		} catch (error) {
			toast.error(action.kind === "delete" ? "删除失败" : "重命名失败", {
				description: errorMessage(error),
			});
		} finally {
			setBusy(false);
		}
	};

	const openAction = (id: string, kind: "rename" | "delete") => {
		const workflow = workflows.find((item) => item.id === id);
		if (workflow) {
			setAction({ id, name: workflow.name, kind });
			setName(workflow.name);
		}
	};

	return (
		<div
			aria-label={`分镜工作流：${section.headingText}`}
			className="flex h-full min-h-0 min-w-0 flex-col"
		>
			{isLoading ? (
				<Loading />
			) : error ? (
				<Failure
					message={`加载工作流失败：${errorMessage(error)}`}
					retry={() => void refreshList()}
				/>
			) : (
				<>
					<WorkflowTabs
						workflows={workflows}
						activeWorkflowId={activeId}
						onSelectWorkflow={setSelectedId}
						onCreateWorkflow={() => setCreateOpen(true)}
						onRenameWorkflow={(id) => openAction(id, "rename")}
						onDeleteWorkflow={(id) => openAction(id, "delete")}
					/>
					<div className="min-h-0 flex-1 overflow-hidden">
						{workflows.length === 0 ? (
							<div className="flex h-full flex-col items-center justify-center gap-4">
								<p className="text-sm text-muted-foreground">当前分镜还没有工作流</p>
								<Button onClick={() => setCreateOpen(true)}>创建第一个工作流</Button>
							</div>
						) : detailError ? (
							<Failure
								message={`加载工作流详情失败：${errorMessage(detailError)}`}
								retry={() => void refreshDetail()}
							/>
						) : activeWorkflow?.id === activeId ? (
							<WorkflowCanvasEditor
								key={activeWorkflow.id}
								workflow={activeWorkflow}
								onUpdate={saveGraph}
							/>
						) : (
							<Loading />
						)}
					</div>
				</>
			)}
			{templatesError && createOpen && (
				<p role="status" className="p-2 text-sm text-muted-foreground">
					模板加载失败，仍可创建空白画布。
				</p>
			)}
			<WorkflowCreateDialog
				open={createOpen}
				onOpenChange={setCreateOpen}
				templates={templates?.templates ?? []}
				onConfirm={handleCreate}
			/>
			<AlertDialog
				open={Boolean(action)}
				onOpenChange={(open) => {
					if (!open && !busy) setAction(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{action?.kind === "delete" ? "删除工作流" : "重命名工作流"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{action?.kind === "delete"
								? `确定删除“${action.name}”？此操作不可恢复。`
								: "修改当前工作流的名称。"}
						</AlertDialogDescription>
					</AlertDialogHeader>
					{action?.kind === "rename" && (
						<div className="space-y-2">
							<Label htmlFor="workflow-rename">工作流名称</Label>
							<Input
								id="workflow-rename"
								value={name}
								onChange={(event) => setName(event.target.value)}
							/>
						</div>
					)}
					<AlertDialogFooter>
						<Button variant="outline" disabled={busy} onClick={() => setAction(null)}>
							取消
						</Button>
						<Button
							disabled={busy || (action?.kind === "rename" && !name.trim())}
							onClick={confirmAction}
						>
							{busy ? "处理中..." : "确认"}
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

function Loading() {
	return (
		<div
			role="status"
			className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground"
		>
			<Loader2 className="size-5 animate-spin" />
			加载工作流...
		</div>
	);
}

function Failure({ message, retry }: { message: string; retry: () => void }) {
	return (
		<Alert variant="destructive" className="m-4 w-auto">
			<AlertCircle className="size-4" />
			<AlertDescription>
				{message}
				<Button variant="outline" size="sm" onClick={retry}>
					重试
				</Button>
			</AlertDescription>
		</Alert>
	);
}

function errorMessage(error: unknown) {
	return error && typeof error === "object" && "message" in error
		? String(error.message)
		: "未知错误";
}
