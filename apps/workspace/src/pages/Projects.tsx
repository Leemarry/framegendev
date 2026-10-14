import {
	Archive,
	FolderOpen,
	Loader2,
	MoreVertical,
	Pencil,
	SquarePen,
	Upload,
	RotateCcw,
	Trash2,
	type LucideIcon,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useSWR, { useSWRConfig } from "swr";
import {
	archiveProject,
	createProject,
	deleteProject,
	getProjects,
	permanentlyDeleteProject,
	type ProjectStatusFilter,
	projectsKeyForStatus,
	restoreProject,
	updateProject,
	type WorkspaceProject,
} from "@/domains/projects/api/projects";
import { openProjectRenameDialog } from "@/domains/projects/components/ProjectRenameDialog";
import { useProjectStore } from "@/domains/projects/stores";
import { agentProjectPath, agentProjectRouteState } from "@/domains/workspace/lib/workbench-route";
import { useDesktopWindowDrag } from "@/domains/workspace/lib/desktop-window-drag";
import { openAgentProjectCreateDialog } from "@/domains/workspace/components/AgentProjectCreateDialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Button } from "@/shared/components/ui/button";
import { confirmDialog } from "@/shared/components/callable/ConfirmDialog";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@/shared/components/ui/context-menu";
import { useToast } from "@/hooks/useToast";
import { analytics, AnalyticsEvent } from "@/shared/analytics";
import { cn } from "@/shared/lib/utils";

type ProjectManagementTab = Exclude<ProjectStatusFilter, "all">;
type ProjectAction = "archive" | "trash" | "restore" | "permanent" | "rename";

const projectTabs: Array<{ label: string; status: ProjectManagementTab }> = [
	{ label: "项目", status: "active" },
	{ label: "归档", status: "archived" },
	{ label: "垃圾箱", status: "trashed" },
];

const tabMeta: Record<
	ProjectManagementTab,
	{
		description: string;
		emptyDescription: string;
		emptyTitle: string;
		icon: LucideIcon;
		statusLabel: string;
	}
> = {
	active: {
		description: "当前项目",
		emptyDescription: "暂无项目。",
		emptyTitle: "还没有项目",
		icon: FolderOpen,
		statusLabel: "项目",
	},
	archived: {
		description: "已归档项目",
		emptyDescription: "暂无归档项目。",
		emptyTitle: "没有归档项目",
		icon: Archive,
		statusLabel: "归档",
	},
	trashed: {
		description: "垃圾箱项目",
		emptyDescription: "暂无垃圾箱项目。",
		emptyTitle: "垃圾箱为空",
		icon: Trash2,
		statusLabel: "垃圾箱",
	},
};

export const Projects: React.FC = () => {
	const startWindowDrag = useDesktopWindowDrag();
	const navigate = useNavigate();
	const toast = useToast();
	const { mutate } = useSWRConfig();
	const setActiveProjectId = useProjectStore((state) => state.setActiveProjectId);
	const [activeTab, setActiveTab] = useState<ProjectManagementTab>("active");
	const [action, setAction] = useState<{ kind: ProjectAction; projectId: string } | null>(null);
	const [isCreating, setIsCreating] = useState(false);
	const swrKey = projectsKeyForStatus(activeTab);
	const {
		data,
		error,
		isLoading,
		mutate: revalidateProjects,
	} = useSWR(swrKey, () => getProjects(activeTab));
	const projects = useMemo(
		() => [...(data?.projects ?? [])].sort(compareProjectsByUpdatedAtDesc),
		[data?.projects],
	);
	const meta = tabMeta[activeTab];

	const openProject = (project: WorkspaceProject) => {
		analytics.track(AnalyticsEvent.OpenProject, {
			document_count: project.documentCount,
			project_id: project.id,
			status: project.status,
		});
		setActiveProjectId(project.id);
		navigate(agentProjectPath(project.id), {
			state: agentProjectRouteState("agent"),
		});
	};

	const refreshProjectLists = async () => {
		await Promise.all([
			mutate(projectsKeyForStatus("active")),
			mutate(projectsKeyForStatus("archived")),
			mutate(projectsKeyForStatus("trashed")),
		]);
	};

	const createNewProject = async () => {
		if (isCreating) return;
		setIsCreating(true);
		try {
			const name = await openAgentProjectCreateDialog();
			if (!name) return;
			const project = await createProject({ name });
			await refreshProjectLists();
			openProject(project);
		} catch (err) {
			toast.error("创建项目失败", {
				description: projectManagementErrorMessage(err, "创建项目失败。"),
			});
		} finally {
			setIsCreating(false);
		}
	};

	const restoreCurrentProject = async (project: WorkspaceProject) => {
		if (action) return;

		setAction({ kind: "restore", projectId: project.id });
		try {
			const restored = await restoreProject(project.id);
			await refreshProjectLists();
			toast.success("项目已恢复", { description: restored.name || project.name });
		} catch (err) {
			toast.error("恢复项目失败", {
				description: projectManagementErrorMessage(err, "恢复项目失败。"),
			});
		} finally {
			setAction(null);
		}
	};

	const archiveCurrentProject = async (project: WorkspaceProject) => {
		if (action) return;

		setAction({ kind: "archive", projectId: project.id });
		try {
			await archiveProject(project.id);
			await refreshProjectLists();
			toast.success("项目已归档", { description: project.name });
		} catch (err) {
			toast.error("归档项目失败", {
				description: projectManagementErrorMessage(err, "归档项目失败。"),
			});
		} finally {
			setAction(null);
		}
	};

	const renameCurrentProject = (project: WorkspaceProject) => {
		if (action) return;
		void (async () => {
			const nextName = await openProjectRenameDialog({ projectName: project.name });
			if (!nextName || nextName === project.name.trim()) return;

			setAction({ kind: "rename", projectId: project.id });
			try {
				const renamed = await updateProject(project.id, { name: nextName });
				await refreshProjectLists();
				toast.success("项目已重命名", { description: renamed.name });
			} catch (err) {
				toast.error("重命名项目失败", {
					description: projectManagementErrorMessage(err, "重命名项目失败。"),
				});
			} finally {
				setAction(null);
			}
		})();
	};

	const deleteCurrentProject = async (project: WorkspaceProject) => {
		if (action) return false;

		setAction({ kind: "trash", projectId: project.id });
		try {
			await deleteProject(project.id);
			await refreshProjectLists();
			toast.success("项目已移到垃圾箱", { description: project.name });
			return true;
		} catch (err) {
			toast.error("移到垃圾箱失败", {
				description: projectManagementErrorMessage(err, "移到垃圾箱失败。"),
			});
			return false;
		} finally {
			setAction(null);
		}
	};

	const confirmDeleteProject = (project: WorkspaceProject) => {
		void confirmDialog({
			title: "移到垃圾箱？",
			description: (
				<>
					确定要将“{project.name}”移到垃圾箱吗？项目文件夹会移动到
					.mediago-drama/trash，之后可以在垃圾箱中恢复。
				</>
			),
			confirmLabel: "移到垃圾箱",
			confirmIcon: <Trash2 />,
			onConfirm: () => deleteCurrentProject(project),
		});
	};

	const permanentlyDeleteCurrentProject = async (project: WorkspaceProject) => {
		if (action) return false;

		setAction({ kind: "permanent", projectId: project.id });
		try {
			await permanentlyDeleteProject(project.id);
			await refreshProjectLists();
			toast.success("项目已永久删除", { description: project.name });
			return true;
		} catch (err) {
			toast.error("永久删除失败", {
				description: projectManagementErrorMessage(err, "永久删除项目失败。"),
			});
			return false;
		} finally {
			setAction(null);
		}
	};

	const confirmPermanentlyDeleteProject = (project: WorkspaceProject) => {
		void confirmDialog({
			title: "永久删除项目？",
			description:
				"永久删除后，垃圾箱中的项目文件夹和 MediaGo Drama 中的项目记录都会被清除，无法恢复。",
			confirmLabel: "永久删除",
			confirmIcon: <Trash2 />,
			onConfirm: () => permanentlyDeleteCurrentProject(project),
		});
	};

	return (
		<div className="project-management-page flex h-full min-h-0 flex-col overflow-hidden bg-ide-editor text-ide-editor-foreground">
			<header
				className="project-management-header"
				data-desktop-drag-region
				onPointerDown={startWindowDrag}
			>
				<h1>项目管理</h1>
				<div className="project-management-tabs" aria-label="项目状态" data-desktop-no-drag>
					{projectTabs.map((tab) => (
						<button
							key={tab.status}
							type="button"
							aria-pressed={activeTab === tab.status}
							onClick={() => setActiveTab(tab.status)}
						>
							{tab.label}
						</button>
					))}
				</div>
			</header>
			<div className="project-management-body">
				{activeTab === "active" ? (
					<div className="project-management-toolbar">
						<button type="button" disabled title="待接入" aria-label="导入项目（待接入）">
							<Upload />
							<span>导入项目</span>
						</button>
						<button type="button" disabled title="待接入" aria-label="打开已有项目目录（待接入）">
							<FolderOpen />
							<span>打开已有项目目录</span>
						</button>
					</div>
				) : null}
				{isLoading && projects.length === 0 ? (
					<ProjectManagementCenterState icon={Loader2} title="加载项目列表" spin />
				) : null}
				{!isLoading && error && projects.length === 0 ? (
					<ProjectManagementCenterState
						icon={FolderOpen}
						title="项目列表加载失败"
						description="请确认本地服务已启动。"
						action={
							<Button type="button" variant="secondary" onClick={() => void revalidateProjects()}>
								<RotateCcw />
								<span>重试</span>
							</Button>
						}
					/>
				) : null}
				{!isLoading && !error && projects.length === 0 && activeTab !== "active" ? (
					<div className="project-management-empty">
						<img
							src={
								activeTab === "archived" ? "/parity/archive-empty.png" : "/parity/trash-empty.png"
							}
							alt=""
							width="220"
							height="220"
						/>
						<p>{meta.emptyTitle}</p>
					</div>
				) : null}
				{projects.length > 0 || (!isLoading && !error && activeTab === "active") ? (
					<div className="project-management-grid">
						{activeTab === "active" ? (
							<button
								type="button"
								className="project-create-card"
								aria-label="创建新项目"
								disabled={isCreating}
								onClick={() => void createNewProject()}
							>
								<span className="project-create-icon">
									{isCreating ? <Loader2 className="animate-spin" /> : <SquarePen />}
								</span>
								<span>创建新项目</span>
							</button>
						) : null}
						{projects.map((project) => (
							<ProjectManagementRow
								key={project.id}
								action={action}
								activeTab={activeTab}
								project={project}
								onArchive={() => void archiveCurrentProject(project)}
								onRequestDelete={() => confirmDeleteProject(project)}
								onOpen={openProject}
								onRename={() => renameCurrentProject(project)}
								onRestore={() => void restoreCurrentProject(project)}
								onRequestPermanentDelete={() => confirmPermanentlyDeleteProject(project)}
							/>
						))}
					</div>
				) : null}
			</div>
		</div>
	);
};

const ProjectManagementRow: React.FC<{
	action: { kind: ProjectAction; projectId: string } | null;
	activeTab: ProjectManagementTab;
	onArchive: () => void;
	onOpen: (project: WorkspaceProject) => void;
	onRename: () => void;
	onRequestDelete: () => void;
	onRequestPermanentDelete: () => void;
	onRestore: () => void;
	project: WorkspaceProject;
}> = ({
	action,
	activeTab,
	onArchive,
	onOpen,
	onRename,
	onRequestDelete,
	onRequestPermanentDelete,
	onRestore,
	project,
}) => {
	const hasAction = Boolean(action);
	const busy = action?.projectId === project.id;
	const canOpen = activeTab === "active";
	const timestamp =
		projectLifecycleTimestamp(project, activeTab)?.value ??
		formatProjectTimestamp(project.updatedAt || project.createdAt);
	const menuActions = canOpen
		? [
				{ label: "打开", icon: FolderOpen, run: () => onOpen(project) },
				{ label: "重命名", icon: Pencil, run: onRename },
				{ label: "归档", icon: Archive, run: onArchive },
				{ label: "移到垃圾箱", icon: Trash2, run: onRequestDelete, destructive: true },
			]
		: [
				{ label: "恢复", icon: RotateCcw, run: onRestore },
				...(activeTab === "trashed"
					? [{ label: "永久删除", icon: Trash2, run: onRequestPermanentDelete, destructive: true }]
					: []),
			];
	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>
				<article className="project-management-card" aria-busy={busy}>
					{canOpen ? (
						<button
							type="button"
							className="project-card-open"
							aria-label={project.name}
							disabled={hasAction}
							onClick={() => onOpen(project)}
						>
							<span className="project-card-caption">
								<strong title={project.name}>{project.name}</strong>
								<time>{timestamp}</time>
							</span>
						</button>
					) : (
						<div className="project-card-caption project-card-inactive">
							<strong title={project.name}>{project.name}</strong>
							<time>{timestamp}</time>
							<div className="mt-3 flex flex-wrap gap-2">
								<Button type="button" variant="secondary" onClick={onRestore} disabled={hasAction}>
									<RotateCcw />
									<span>恢复</span>
								</Button>
								{activeTab === "trashed" ? (
									<Button
										type="button"
										variant="destructive"
										onClick={onRequestPermanentDelete}
										disabled={hasAction}
									>
										<Trash2 />
										<span>永久删除</span>
									</Button>
								) : null}
							</div>
						</div>
					)}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								className="project-card-menu"
								aria-label={`项目操作：${project.name}`}
								title="项目操作"
								disabled={hasAction}
							>
								{busy ? <Loader2 className="animate-spin" /> : <MoreVertical />}
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							{menuActions.map(({ label, icon: Icon, run, destructive }) => (
								<DropdownMenuItem
									key={label}
									disabled={hasAction}
									onSelect={run}
									className={destructive ? "text-destructive" : undefined}
								>
									<Icon />
									<span>{label}</span>
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				</article>
			</ContextMenuTrigger>
			<ContextMenuContent>
				{menuActions.map(({ label, icon: Icon, run, destructive }) => (
					<ContextMenuItem
						key={label}
						disabled={hasAction}
						onSelect={run}
						className={destructive ? "text-destructive" : undefined}
					>
						<Icon className="size-4" />
						<span>{label}</span>
					</ContextMenuItem>
				))}
			</ContextMenuContent>
		</ContextMenu>
	);
};

const ProjectManagementCenterState: React.FC<{
	action?: React.ReactNode;
	description?: string;
	icon: LucideIcon;
	spin?: boolean;
	title: string;
}> = ({ action, description, icon: Icon, spin = false, title }) => (
	<div className="grid h-full min-h-64 place-items-center p-6 text-center">
		<div>
			<Icon className={cn("mx-auto size-8 text-muted-foreground", spin && "animate-spin")} />
			<p className="mt-3 text-sm font-medium text-foreground">{title}</p>
			{description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
			{action ? <div className="mt-4 flex justify-center">{action}</div> : null}
		</div>
	</div>
);

const compareProjectsByUpdatedAtDesc = (left: WorkspaceProject, right: WorkspaceProject) => {
	const leftTime = getProjectTimestamp(left.updatedAt || left.createdAt);
	const rightTime = getProjectTimestamp(right.updatedAt || right.createdAt);

	if (rightTime !== leftTime) return rightTime - leftTime;

	return left.id.localeCompare(right.id);
};

const getProjectTimestamp = (timestamp: string) => {
	const time = Date.parse(timestamp);
	return Number.isFinite(time) ? time : 0;
};

const projectLifecycleTimestamp = (project: WorkspaceProject, status: ProjectManagementTab) => {
	if (status === "archived" && project.archivedAt) {
		return { label: "归档时间", value: formatProjectTimestamp(project.archivedAt) };
	}
	if (status === "trashed" && project.trashedAt) {
		return { label: "移入时间", value: formatProjectTimestamp(project.trashedAt) };
	}
	return null;
};

const formatProjectTimestamp = (value: string) => {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;

	return new Intl.DateTimeFormat("zh-CN", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(date);
};

const projectManagementErrorMessage = (err: unknown, fallback: string) => {
	if (err instanceof Error) return err.message;
	if (err && typeof err === "object" && "message" in err) {
		const message = (err as { message?: unknown }).message;
		if (typeof message === "string" && message.trim()) return message;
	}
	return fallback;
};
