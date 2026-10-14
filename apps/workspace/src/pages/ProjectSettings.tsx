import { Archive, FolderOpen, Loader2, SlidersHorizontal, Trash2 } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import useSWR, { useSWRConfig } from "swr";
import {
	archiveProject,
	deleteProject,
	getProjects,
	projectsKey,
	projectsKeyForStatus,
	type WorkspaceProject,
} from "@/domains/projects/api/projects";
import { workspaceStateKey } from "@/domains/workspace/api/workspace";
import { SettingsPanelLayout } from "@/domains/settings/components/SettingsPanelLayout";
import { Button } from "@/shared/components/ui/button";
import { confirmDialog } from "@/shared/components/callable/ConfirmDialog";
import { useToast } from "@/hooks/useToast";
import { isDesktopRuntime, openProjectDirectory } from "@/domains/projects/lib/project-directory";
import { useDocumentsStore } from "@/domains/documents/stores";
import { useProjectStore } from "@/domains/projects/stores";
import { getRouteProjectId } from "@/domains/workspace/lib/workbench-route";
import { listPromptPacks, promptPacksKey } from "@/domains/settings/api/packs";
import {
	projectSettingsGeneralTab,
	projectSettingsSkillsTab,
	resolveProjectSettingsTab,
	useSettingsNavigationStore,
} from "@/lib/stores/settings";

export const ProjectSettings: React.FC = () => {
	const location = useLocation();
	const projectId = getRouteProjectId(location.search);
	const navigate = useNavigate();
	const toast = useToast();
	const { mutate } = useSWRConfig();
	const activeProjectId = useProjectStore((state) => state.activeProjectId);
	const setActiveProjectId = useProjectStore((state) => state.setActiveProjectId);
	const prepareWorkspaceLoad = useDocumentsStore((state) => state.prepareWorkspaceLoad);
	const documentsProjectId = useDocumentsStore((state) => state.projectId);
	const workspaceDir = useDocumentsStore((state) => state.workspaceDir);
	const { data, isLoading } = useSWR(projectsKey, getProjects);
	const section = resolveProjectSettingsTab(location.search);
	const {
		data: packs,
		error: packsError,
		isLoading: packsLoading,
		mutate: reloadPacks,
	} = useSWR(
		projectId && section === projectSettingsSkillsTab ? promptPacksKey : null,
		listPromptPacks,
	);
	const [isArchiving, setIsArchiving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isOpeningProjectFolder, setIsOpeningProjectFolder] = useState(false);

	useEffect(() => {
		if (projectId && activeProjectId !== projectId) setActiveProjectId(projectId);
	}, [activeProjectId, projectId, setActiveProjectId]);

	if (!projectId) return <Navigate to="/" replace />;

	const project = data?.projects.find((item) => item.id === projectId) ?? null;
	const projectName = project?.name || projectId;
	const projectDir =
		project?.projectDir?.trim() || (documentsProjectId === project?.id ? workspaceDir.trim() : "");

	const refreshProjectLists = async () => {
		await Promise.all([
			mutate(projectsKeyForStatus("active")),
			mutate(projectsKeyForStatus("archived")),
			mutate(projectsKeyForStatus("trashed")),
		]);
	};

	const leaveCurrentProject = (message: string) => {
		void mutate(workspaceStateKey(project?.id ?? ""), undefined, { revalidate: false });
		setActiveProjectId(null);
		prepareWorkspaceLoad(message);
		navigate("/", { replace: true });
	};

	const archiveCurrentProject = async () => {
		if (!project || isArchiving) return;

		setIsArchiving(true);
		try {
			await archiveProject(project.id);
			await refreshProjectLists();
			leaveCurrentProject("请选择一个项目");
			toast.success("项目已归档", { description: project.name });
		} catch (err) {
			const message = projectSettingsErrorMessage(err, "归档项目失败。");
			toast.error("归档项目失败", { description: message });
		} finally {
			setIsArchiving(false);
		}
	};

	const deleteCurrentProject = async () => {
		if (!project || isDeleting) return false;

		setIsDeleting(true);
		try {
			await deleteProject(project.id);
			await refreshProjectLists();
			leaveCurrentProject("请选择一个项目");
			toast.success("项目已移到垃圾箱", { description: project.name });
			return true;
		} catch (err) {
			const message = projectSettingsErrorMessage(err, "移到垃圾箱失败。");
			toast.error("移到垃圾箱失败", { description: message });
			return false;
		} finally {
			setIsDeleting(false);
		}
	};

	const confirmDeleteCurrentProject = () => {
		if (!project) return;
		void confirmDialog({
			title: "移到垃圾箱？",
			description: (
				<>
					确定要将“{projectName}”移到垃圾箱吗？项目文件夹会移动到
					.mediago-drama/trash，之后可以在垃圾箱中恢复。
				</>
			),
			confirmLabel: "移到垃圾箱",
			confirmIcon: <Trash2 />,
			onConfirm: deleteCurrentProject,
		});
	};

	const openCurrentProjectFolder = async () => {
		if (!project || isOpeningProjectFolder) return;

		if (!projectDir) {
			toast.info("项目目录加载中", { description: "文档库准备好后再打开项目文件夹。" });
			return;
		}

		setIsOpeningProjectFolder(true);
		try {
			await openProjectDirectory(projectDir);
		} catch (err) {
			const message = err instanceof Error ? err.message : "无法打开项目文件夹。";
			toast.error("打开项目文件夹失败", { description: message });
		} finally {
			setIsOpeningProjectFolder(false);
		}
	};

	if (!project)
		return (
			<div className="project-settings-content h-full">
				<SettingsPanelLayout
					title="项目设置"
					description={isLoading ? "加载项目设置" : "项目不存在或已被删除。"}
				>
					<p className="text-sm text-muted-foreground">
						{isLoading ? "加载中" : "请返回项目列表。"}
					</p>
				</SettingsPanelLayout>
			</div>
		);
	return (
		<div className="project-settings-content h-full min-h-0 overflow-hidden bg-ide-editor text-ide-editor-foreground">
			<SettingsPanelLayout
				title={`项目设置 · ${projectName}`}
				description="管理当前项目的技能包、文件位置与项目生命周期。"
			>
				{section === projectSettingsSkillsTab ? (
					<div className="project-settings-packs">
						<p className="mb-5 text-sm text-muted-foreground">
							全局共享技能包 · 项目单独启停待接入
						</p>
						{packsLoading ? (
							<p className="text-sm text-muted-foreground">加载技能包</p>
						) : packsError ? (
							<div className="flex items-center gap-3">
								<p className="text-sm text-error-foreground">技能包加载失败</p>
								<Button variant="outline" onClick={() => void reloadPacks()}>
									重试
								</Button>
							</div>
						) : packs?.length ? (
							<ul className="divide-y divide-border">
								{packs.map((pack) => (
									<li key={pack.id} className="flex items-start justify-between gap-3 py-4">
										<div className="min-w-0">
											<p className="break-words font-semibold">
												{pack.name}
												<span className="ml-2 text-xs font-normal text-muted-foreground">
													{pack.source === "imported"
														? "已导入"
														: pack.source === "default"
															? "内置"
															: "本地"}
												</span>
											</p>
											<p className="mt-1 text-sm text-muted-foreground">
												{pack.skillCount ?? 0} Skills · {pack.promptCount ?? 0} 提示词
											</p>
										</div>
										<span className="shrink-0 text-sm text-muted-foreground">
											{pack.enabled ? "全局已启用" : "全局未启用"}
										</span>
									</li>
								))}
							</ul>
						) : (
							<p className="text-sm text-muted-foreground">暂无技能包</p>
						)}
						<Button
							variant="outline"
							className="mt-5"
							onClick={() => {
								useSettingsNavigationStore.getState().setActiveTab("prompt-packs");
								navigate("/settings", {
									state: {
										settingsReturn: {
											path: location.pathname + location.search,
											state: location.state,
										},
									},
								});
							}}
						>
							<SlidersHorizontal />
							管理全局技能包
						</Button>
					</div>
				) : section === "project-feishu" ? (
					<div>
						<h3 className="font-semibold">飞书群</h3>
						<p className="mt-2 text-sm text-muted-foreground">待接入</p>
					</div>
				) : section === "project-files" ? (
					<div>
						<h3 className="font-semibold">项目文件</h3>
						<p className="mt-3 break-all text-sm text-muted-foreground">
							{projectDir || (isLoading ? "项目文件夹正在加载。" : "项目目录不可用。")}
						</p>
						<Button
							variant="outline"
							className="mt-4"
							disabled={!isDesktopRuntime() || !projectDir || isOpeningProjectFolder}
							onClick={() => void openCurrentProjectFolder()}
						>
							<FolderOpen />
							打开项目文件夹
						</Button>
						{!isDesktopRuntime() ? (
							<p className="mt-2 text-sm text-muted-foreground">在桌面客户端中打开文件夹。</p>
						) : null}
					</div>
				) : section === projectSettingsGeneralTab ? (
					<ProjectSettingsGeneralPanel
						isArchiving={isArchiving}
						isDeleting={isDeleting}
						isLoading={isLoading}
						project={project}
						projectDir={projectDir}
						isOpeningProjectFolder={isOpeningProjectFolder}
						onArchive={() => void archiveCurrentProject()}
						onDelete={confirmDeleteCurrentProject}
						onOpenProjectFolder={openCurrentProjectFolder}
					/>
				) : null}
			</SettingsPanelLayout>
		</div>
	);
};

const ProjectSettingsGeneralPanel: React.FC<{
	isArchiving: boolean;
	isDeleting: boolean;
	isLoading: boolean;
	isOpeningProjectFolder: boolean;
	onArchive: () => void;
	onDelete: () => void;
	onOpenProjectFolder: () => void;
	project: WorkspaceProject | null;
	projectDir: string;
}> = ({
	isArchiving,
	isDeleting,
	isLoading,
	isOpeningProjectFolder,
	onArchive,
	onDelete,
	onOpenProjectFolder,
	project,
	projectDir,
}) => (
	<div>
		{isLoading && !project ? (
			<div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
				<Loader2 className="size-4 animate-spin" />
				<span>加载项目设置</span>
			</div>
		) : null}

		{!isLoading && !project ? (
			<p className="py-2 text-sm text-muted-foreground">项目不存在或已被删除。</p>
		) : null}

		{project ? (
			<div className="divide-y divide-border">
				{isDesktopRuntime() ? (
					<div className={projectSettingsRowClassName}>
						<div className="min-w-0 flex-1">
							<p className="text-sm font-medium text-foreground">项目文件夹</p>
							<p className="mt-1 truncate text-xs leading-5 text-muted-foreground">
								{projectDir || "项目文件夹正在加载。"}
							</p>
						</div>
						<Button
							type="button"
							variant="secondary"
							onClick={onOpenProjectFolder}
							disabled={isOpeningProjectFolder || !projectDir}
							className="shrink-0 rounded-md"
						>
							{isOpeningProjectFolder ? <Loader2 className="animate-spin" /> : <FolderOpen />}
							<span>打开项目文件夹</span>
						</Button>
					</div>
				) : null}

				<div className={projectSettingsRowClassName}>
					<div className="min-w-0 flex-1">
						<p className="text-sm font-medium text-foreground">归档项目</p>
						<p className="mt-1 text-xs leading-5 text-muted-foreground">
							从默认项目列表隐藏“{project.name}”，项目文件夹仍保留在当前位置。
						</p>
					</div>
					<Button
						type="button"
						variant="secondary"
						onClick={onArchive}
						disabled={isArchiving}
						className="shrink-0 rounded-md"
					>
						{isArchiving ? <Loader2 className="animate-spin" /> : <Archive />}
						<span>归档项目</span>
					</Button>
				</div>

				<div className={projectSettingsRowClassName}>
					<div className="min-w-0 flex-1">
						<p className="text-sm font-medium text-foreground">移到垃圾箱</p>
						<p className="mt-1 text-xs leading-5 text-muted-foreground">
							从默认项目列表隐藏“{project.name}”，并把项目文件夹移动到 .mediago-drama/trash。
						</p>
					</div>
					<Button
						type="button"
						variant="destructive"
						onClick={onDelete}
						disabled={isDeleting}
						className="shrink-0 rounded-md"
					>
						{isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
						<span>移到垃圾箱</span>
					</Button>
				</div>
			</div>
		) : null}
	</div>
);

const projectSettingsRowClassName =
	"flex flex-wrap items-center justify-between gap-3 py-5 first:pt-0 last:pb-0";

const projectSettingsErrorMessage = (err: unknown, fallback: string) => {
	if (err instanceof Error) return err.message;
	if (err && typeof err === "object" && "message" in err) {
		const message = (err as { message?: unknown }).message;
		if (typeof message === "string" && message.trim()) return message;
	}
	return fallback;
};
