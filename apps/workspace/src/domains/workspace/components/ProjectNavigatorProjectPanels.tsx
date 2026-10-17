import {
	Archive,
	ChevronLeft,
	FilePlus2,
	Folder,
	FolderPlus,
	FolderTree,
	LayoutDashboard,
	LayoutList,
	Loader2,
	MessageCircleQuestion,
	Pencil,
	RotateCcw,
	Search,
	SlidersHorizontal,
	Trash2,
} from "lucide-react";
import type React from "react";
import { useCallback, useRef } from "react";
import type { WorkspaceProject } from "@/domains/projects/api/projects";
import type { DocumentCategory } from "@/domains/documents/stores";
import type { GenerationSuccessNotification } from "@/domains/generation/stores/generation-notifications";
import { Button } from "@/shared/components/ui/button";
import { SidebarNavButton } from "./SidebarNavButton";
import { WorkspaceUserMenu } from "./WorkspaceUserMenu";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@/shared/components/ui/context-menu";
import {
	ProjectDirectory,
	type ProjectDocumentDeleteHandler,
} from "@/domains/workspace/components/ProjectDirectory";
import { ProjectDirectoryTree } from "@/domains/workspace/components/ProjectDirectoryTree";
import { GenerationNotificationButton } from "@/domains/workspace/components/GenerationNotificationButton";
import { GlobalToolboxButton } from "@/domains/workspace/components/GlobalToolboxDrawer";
import { AssetLibraryButton } from "@/domains/workspace/components/AssetLibraryButton";
import {
	getRouteAssetId,
	getRouteDocumentId,
	isProjectSettingsRoute,
} from "@/domains/workspace/lib/workbench-route";
import { useDocumentViewStore } from "@/lib/stores/document-view";
import { cn } from "@/shared/lib/utils";

export const ProjectsSidebarPanel: React.FC<{
	error?: unknown;
	isCreating: boolean;
	isLoading: boolean;
	locationPathname: string;
	onCreateProject: () => void;
	onArchiveProject: (project: WorkspaceProject) => void;
	onRequestDeleteProject: (project: WorkspaceProject) => void;
	onRenameProject: (project: WorkspaceProject) => void;
	onOpenProject: (project: WorkspaceProject) => void;
	onOpenGenerationNotification?: (notification: GenerationSuccessNotification) => void;
	onOpenGlobalAgent?: () => void;
	onOpenSearch: (scope: "global" | "project") => void;
	onOpenSettings: () => void;
	onOpenSkills: () => void;
	onOpenProjects?: () => void;
	onRetry?: () => void;
	projectAction?: { kind: "archive" | "trash" | "rename"; projectId: string } | null;
	projects: WorkspaceProject[];
}> = ({
	error,
	isLoading,
	locationPathname,
	onArchiveProject,
	onRequestDeleteProject,
	onRenameProject,
	onOpenGenerationNotification,
	onOpenGlobalAgent,
	onOpenProject,
	onOpenSearch,
	onOpenSettings,
	onOpenSkills,
	onOpenProjects,
	onRetry,
	projectAction = null,
	projects,
}) => (
	<div className="flex h-full min-h-0 flex-col">
		<div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
			<button
				type="button"
				onClick={() => onOpenSearch("global")}
				className="flex h-8 w-full shrink-0 cursor-pointer items-center gap-2 rounded-sm bg-surface-interactive px-2 text-left text-sm text-ide-sidebar-foreground transition-colors hover:bg-surface-interactive-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				aria-keyshortcuts="Meta+K Control+K"
			>
				<Search className="size-4 shrink-0 text-muted-foreground" />
				<span className="min-w-0 flex-1 truncate">全局搜索</span>
				<span className="text-2xs text-muted-foreground">⌘K</span>
			</button>
			<section>
				<p className="mb-1 flex h-7 items-center px-2 text-xs font-medium text-muted-foreground">
					最近项目
				</p>
				{projects.length > 0 ? (
					projects.map((project) => (
						<ProjectsSidebarProjectItem
							key={project.id}
							project={project}
							projectAction={projectAction}
							onArchiveProject={onArchiveProject}
							onOpenProject={onOpenProject}
							onRequestDeleteProject={onRequestDeleteProject}
							onRenameProject={onRenameProject}
						/>
					))
				) : isLoading ? (
					<div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
						<Loader2 className="size-3.5 animate-spin" />
						<span>加载项目</span>
					</div>
				) : error ? (
					<div className="flex flex-col items-start gap-1 px-2 py-1.5">
						<p className="text-xs text-error-foreground">项目加载失败</p>
						{onRetry ? (
							<Button
								type="button"
								variant="ghost"
								className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
								onClick={onRetry}
							>
								<RotateCcw className="size-3.5" />
								<span>重试</span>
							</Button>
						) : null}
					</div>
				) : (
					<p className="px-2 py-1.5 text-xs text-muted-foreground">打开项目后会显示在这里</p>
				)}
			</section>
			<div className="mt-auto space-y-0.5 pt-2">
				<SidebarNavButton
					active={locationPathname === "/agent"}
					icon={<MessageCircleQuestion />}
					label="Drami"
					onClick={onOpenGlobalAgent}
				/>
				<SidebarNavButton
					active={locationPathname === "/"}
					icon={<LayoutList />}
					label="项目管理"
					onClick={onOpenProjects}
				/>
				<AssetLibraryButton variant="navigation" />
				<GlobalToolboxButton variant="navigation" />
			</div>
		</div>
		<SidebarUserFooter
			onOpenGenerationNotification={onOpenGenerationNotification}
			onOpenSettings={onOpenSettings}
			onOpenSkills={onOpenSkills}
			settingsActive={locationPathname.startsWith("/settings")}
		/>
	</div>
);

/** SidebarUserFooter renders the account menu and generation notifications at the sidebar bottom. */
export const SidebarUserFooter: React.FC<{
	onOpenGenerationNotification?: (notification: GenerationSuccessNotification) => void;
	onOpenSettings: () => void;
	onOpenSkills: () => void;
	settingsActive?: boolean;
}> = ({ onOpenGenerationNotification, onOpenSettings, onOpenSkills, settingsActive = false }) => (
	<div className="mt-auto pt-2">
		<div className="flex items-center gap-1">
			<WorkspaceUserMenu
				className="flex-1"
				onOpenSettings={onOpenSettings}
				onOpenSkills={onOpenSkills}
				settingsActive={settingsActive}
			/>
			{onOpenGenerationNotification ? (
				<div className="flex shrink-0 items-center gap-0">
					<GenerationNotificationButton
						className="size-9"
						onOpenNotification={onOpenGenerationNotification}
					/>
				</div>
			) : null}
		</div>
	</div>
);

const ProjectsSidebarProjectItem: React.FC<{
	onArchiveProject: (project: WorkspaceProject) => void;
	onOpenProject: (project: WorkspaceProject) => void;
	onRequestDeleteProject: (project: WorkspaceProject) => void;
	onRenameProject: (project: WorkspaceProject) => void;
	project: WorkspaceProject;
	projectAction: { kind: "archive" | "trash" | "rename"; projectId: string } | null;
}> = ({
	onArchiveProject,
	onOpenProject,
	onRenameProject,
	onRequestDeleteProject,
	project,
	projectAction,
}) => {
	const isArchiving = projectAction?.kind === "archive" && projectAction.projectId === project.id;
	const isTrashing = projectAction?.kind === "trash" && projectAction.projectId === project.id;
	const isRenaming = projectAction?.kind === "rename" && projectAction.projectId === project.id;
	const hasAction = Boolean(projectAction);

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>
				<button
					type="button"
					onClick={() => onOpenProject(project)}
					className="mb-0.5 flex h-8 w-full cursor-pointer items-center gap-2 rounded-sm px-2 text-left text-sm text-ide-sidebar-foreground transition-colors hover:bg-ide-list-hover hover:text-foreground"
				>
					<Folder className="size-4 shrink-0 text-muted-foreground" />
					<span className="min-w-0 flex-1 truncate">{project.name}</span>
				</button>
			</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuItem disabled={hasAction} onSelect={() => onOpenProject(project)}>
					<Folder className="size-4" />
					<span>打开</span>
				</ContextMenuItem>
				<ContextMenuItem disabled={hasAction} onSelect={() => onRenameProject(project)}>
					{isRenaming ? <Loader2 className="size-4 animate-spin" /> : <Pencil className="size-4" />}
					<span>{isRenaming ? "正在重命名" : "重命名"}</span>
				</ContextMenuItem>
				<ContextMenuItem disabled={hasAction} onSelect={() => onArchiveProject(project)}>
					{isArchiving ? (
						<Loader2 className="size-4 animate-spin" />
					) : (
						<Archive className="size-4" />
					)}
					<span>{isArchiving ? "正在归档" : "归档"}</span>
				</ContextMenuItem>
				<ContextMenuItem
					className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
					disabled={hasAction}
					onSelect={() => onRequestDeleteProject(project)}
				>
					{isTrashing ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
					<span>{isTrashing ? "正在移入" : "移到垃圾箱"}</span>
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
};

export const ProjectSidebarPanel: React.FC<{
	displayProject: WorkspaceProject | null;
	documentsProjectId: string | null;
	error?: unknown;
	isOverviewActive: boolean;
	isLoading: boolean;
	locationPathname: string;
	locationSearch: string;
	onCreateDocumentInCategory: (category: DocumentCategory) => void;
	onBack: () => void;
	onDeleteAsset: (project: WorkspaceProject, assetId: string, filename: string) => void;
	onDeleteDocument: ProjectDocumentDeleteHandler;
	onOpenAsset: (project: WorkspaceProject, assetId: string) => void;
	onOpenDocument: (project: WorkspaceProject, documentId: string) => void;
	onOpenGenerationNotification?: (notification: GenerationSuccessNotification) => void;
	onOpenNewDocument: (category?: DocumentCategory) => void;
	onOpenOverview: (project: WorkspaceProject) => void;
	onOpenSearch: (scope: "global" | "project") => void;
	onOpenSettings: () => void;
	showActiveSelection?: boolean;
	onOpenGlobalSettings?: () => void;
	onOpenSkills?: () => void;
}> = ({
	displayProject,
	documentsProjectId,
	error,
	isOverviewActive,
	isLoading,
	locationPathname,
	locationSearch,
	onCreateDocumentInCategory,
	onBack,
	onDeleteAsset,
	onDeleteDocument,
	onOpenAsset,
	onOpenDocument,
	onOpenGenerationNotification,
	onOpenNewDocument,
	onOpenOverview,
	onOpenSearch,
	onOpenSettings,
	showActiveSelection = true,
	onOpenGlobalSettings = onOpenSettings,
	onOpenSkills = onOpenGlobalSettings,
}) => {
	const documentViewMode = useDocumentViewStore((state) => state.mode);
	const setDocumentViewMode = useDocumentViewStore((state) => state.setMode);
	const startCreateRootFolderRef = useRef<(() => void) | null>(null);
	const routeDocumentId = getRouteDocumentId(locationSearch);
	const routeAssetId = getRouteAssetId(locationSearch);
	const canMutateProjectDirectory = Boolean(
		displayProject && documentsProjectId === displayProject.id,
	);
	const directoryItemSelectionEnabled = showActiveSelection && !isOverviewActive;
	const setStartCreateRootFolder = useCallback((startCreateRootFolder: (() => void) | null) => {
		startCreateRootFolderRef.current = startCreateRootFolder;
	}, []);

	return (
		<div className="project-workspace-sidebar flex h-full flex-col">
			<div className="flex min-h-0 flex-1 flex-col">
				<div className="min-h-0 flex-1 overflow-y-auto">
					{displayProject ? (
						<div className="space-y-1">
							<div className="project-sidebar-toolbar flex items-center justify-between gap-2 px-2 pb-1">
								<button
									type="button"
									className={sidebarToolbarIconButtonClassName}
									onClick={onBack}
									title="返回"
									aria-label="返回"
								>
									<ChevronLeft className="size-3.5" />
								</button>
								<div className="flex min-w-0 items-center justify-end gap-1">
									<button
										type="button"
										className={sidebarToolbarIconButtonClassName}
										onClick={() => onOpenSearch("project")}
										disabled={!displayProject}
										title="搜索当前项目"
										aria-label="搜索当前项目"
									>
										<Search className="size-3.5" />
									</button>
									<button
										type="button"
										className={cn(
											sidebarToolbarIconButtonClassName,
											showActiveSelection &&
												isOverviewActive &&
												"bg-ide-list-active text-ide-list-active-foreground",
										)}
										onClick={() => onOpenOverview(displayProject)}
										aria-label="项目概览"
										title="项目概览"
									>
										<LayoutDashboard className="size-3.5" />
									</button>
									<button
										type="button"
										className={sidebarToolbarIconButtonClassName}
										onClick={() => onOpenNewDocument()}
										disabled={!canMutateProjectDirectory}
										title="新建文档"
										aria-label="新建文档"
									>
										<FilePlus2 className="size-3.5" />
									</button>
									{documentViewMode === "directory" ? (
										<button
											type="button"
											className={sidebarToolbarIconButtonClassName}
											onClick={() => startCreateRootFolderRef.current?.()}
											disabled={!canMutateProjectDirectory}
											title="新建文件夹"
											aria-label="新建文件夹"
										>
											<FolderPlus className="size-3.5" />
										</button>
									) : null}
									<DocumentViewModeSwitcher
										mode={documentViewMode}
										onSelectMode={setDocumentViewMode}
									/>
								</div>
							</div>
							{documentViewMode === "directory" ? (
								<ProjectDirectoryTree
									key={displayProject.id}
									project={displayProject}
									locationPathname={locationPathname}
									routeAssetId={routeAssetId}
									routeDocumentId={routeDocumentId}
									onOpenAsset={onOpenAsset}
									onOpenDocument={onOpenDocument}
									onDeleteAsset={onDeleteAsset}
									onDeleteDocument={onDeleteDocument}
									onRootCreateRequestReady={setStartCreateRootFolder}
									showActiveSelection={directoryItemSelectionEnabled}
									showRootCreateButton={false}
								/>
							) : (
								<ProjectDirectory
									key={displayProject.id}
									project={displayProject}
									locationPathname={locationPathname}
									routeAssetId={routeAssetId}
									routeDocumentId={routeDocumentId}
									onCreateDocumentInCategory={onCreateDocumentInCategory}
									onOpenAsset={onOpenAsset}
									onOpenDocument={onOpenDocument}
									onDeleteAsset={onDeleteAsset}
									onDeleteDocument={onDeleteDocument}
									onOpenNewDocument={onOpenNewDocument}
									showActiveSelection={directoryItemSelectionEnabled}
								/>
							)}
						</div>
					) : isLoading ? (
						<div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
							<Loader2 className="size-3.5 animate-spin" />
							<span>加载项目</span>
						</div>
					) : error ? (
						<p className="px-2 py-1.5 text-xs text-error-foreground">项目加载失败</p>
					) : (
						<div className="px-2 py-1">
							<button
								type="button"
								className="flex h-7 w-full items-center gap-1.5 rounded-sm px-2 text-left text-xs text-ide-sidebar-foreground transition-colors hover:bg-ide-list-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								onClick={onBack}
							>
								<ChevronLeft className="size-3.5 shrink-0 text-muted-foreground" />
								<span className="min-w-0 flex-1 truncate">返回项目列表</span>
							</button>
							<p className="mt-1 px-2 py-1 text-xs text-muted-foreground">项目不存在</p>
						</div>
					)}
				</div>
			</div>

			<SidebarFooterActions
				settingsActive={isProjectSettingsRoute(locationPathname, locationSearch)}
				projectId={displayProject?.id}
				onOpenGenerationNotification={onOpenGenerationNotification}
				onOpenSettings={onOpenSettings}
				onOpenGlobalSettings={onOpenGlobalSettings}
				onOpenSkills={onOpenSkills}
			/>
		</div>
	);
};

const SidebarFooterActions: React.FC<{
	projectId?: string;
	onOpenGenerationNotification?: (notification: GenerationSuccessNotification) => void;
	onOpenSettings: () => void;
	onOpenGlobalSettings: () => void;
	onOpenSkills: () => void;
	settingsActive: boolean;
}> = ({
	projectId,
	onOpenGenerationNotification,
	onOpenSettings,
	onOpenGlobalSettings,
	onOpenSkills,
	settingsActive,
}) => (
	<>
		<nav aria-label="项目页面" className="shrink-0 space-y-0.5 pt-2">
			<AssetLibraryButton variant="navigation" label="项目素材库" />
			<GlobalToolboxButton variant="navigation" label="项目生成历史" projectId={projectId} />
			<div className="mt-1 pt-1">
				<SidebarNavButton
					active={settingsActive}
					icon={<SlidersHorizontal />}
					label="项目设置"
					onClick={onOpenSettings}
				/>
			</div>
		</nav>
		<SidebarUserFooter
			onOpenGenerationNotification={onOpenGenerationNotification}
			onOpenSettings={onOpenGlobalSettings}
			onOpenSkills={onOpenSkills}
		/>
	</>
);

const sidebarToolbarIconButtonClassName =
	"flex size-7 shrink-0 items-center justify-center rounded-sm bg-ide-toolbar text-muted-foreground transition-colors hover:bg-ide-list-hover hover:text-foreground disabled:pointer-events-none disabled:opacity-50";

const DocumentViewModeSwitcher: React.FC<{
	mode: "category" | "directory";
	onSelectMode: (mode: "category" | "directory") => void;
}> = ({ mode, onSelectMode }) => (
	<div className="flex h-7 shrink-0 items-center rounded-sm bg-ide-toolbar p-0.5">
		<button
			type="button"
			className={cn(
				"flex size-6 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-ide-list-hover hover:text-foreground",
				mode === "category" && "bg-ide-list-active text-ide-list-active-foreground",
			)}
			onClick={() => onSelectMode("category")}
			title="类别视图"
			aria-label="类别视图"
			aria-pressed={mode === "category"}
		>
			<LayoutList className="size-3.5" />
		</button>
		<button
			type="button"
			className={cn(
				"flex size-6 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-ide-list-hover hover:text-foreground",
				mode === "directory" && "bg-ide-list-active text-ide-list-active-foreground",
			)}
			onClick={() => onSelectMode("directory")}
			title="目录视图"
			aria-label="目录视图"
			aria-pressed={mode === "directory"}
		>
			<FolderTree className="size-3.5" />
		</button>
	</div>
);
