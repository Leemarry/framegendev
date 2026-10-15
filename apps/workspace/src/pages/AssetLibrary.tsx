import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { useLocation, useNavigate } from "react-router-dom";
import { AssetLibraryWorkspace } from "@/domains/workspace/components/AssetLibraryButton";
import { WorkspaceUserMenu } from "@/domains/workspace/components/WorkspaceUserMenu";
import { getRouteProjectId } from "@/domains/workspace/lib/workbench-route";
import {
	createLibraryFolder,
	deleteLibraryFolder,
	getLibraryFolders,
	libraryFoldersKey,
	renameLibraryFolder,
	type AssetLibraryFolder,
} from "@/domains/workspace/api/library-folders";
import {
	AssetLibraryFolders,
	AssetLibraryFolderNameDialog,
	AssetLibraryFolderDeleteDialog,
	type AssetLibraryFolderControls,
} from "@/domains/workspace/components/AssetLibraryFolders";
import { libraryFolderPath } from "@/domains/workspace/lib/library-folders";
import { getProjects, projectsKey } from "@/domains/projects/api/projects";
import { AssetLibraryScopes } from "@/domains/workspace/components/AssetLibraryScopes";

export function AssetLibrary() {
	const location = useLocation();
	const navigate = useNavigate();
	const projectId = getRouteProjectId(location.search);
	const scopeNavigation = !projectId || new URLSearchParams(location.search).get("scope") === "all";
	const {
		data: projectsData,
		error: projectsError,
		isLoading: projectsLoading,
	} = useSWR(scopeNavigation ? projectsKey : null, () => getProjects());
	const selectScope = (id: string | null) => {
		setEditingFolder(null);
		const params = new URLSearchParams(location.search);
		params.set("scope", "all");
		params.delete("folderId");
		if (id) params.set("projectId", id);
		else params.delete("projectId");
		navigate(`${location.pathname}?${params}`, { state: location.state });
	};
	const folderId = new URLSearchParams(location.search).get("folderId") || "";
	const [editingFolder, setEditingFolder] = useState<AssetLibraryFolder | "create" | null>(null);
	const [deletingFolder, setDeletingFolder] = useState<AssetLibraryFolder | null>(null);
	const {
		data: folderData,
		error: folderError,
		isLoading: folderLoading,
		mutate: mutateFolders,
	} = useSWR(libraryFoldersKey(projectId), () => getLibraryFolders(projectId));
	const folders = folderData?.folders ?? [];
	const missingFolder = Boolean(
		folderData && folderId && !folders.some((folder) => folder.id === folderId),
	);
	const navigateFolder = (id: string) => {
		const params = new URLSearchParams(location.search);
		if (id) params.set("folderId", id);
		else params.delete("folderId");
		navigate(`${location.pathname}?${params}`, { state: location.state });
	};
	const folderControls: AssetLibraryFolderControls = {
		folders,
		folderId,
		loading: folderLoading,
		error: folderError || (missingFolder ? new Error("文件夹不存在") : undefined),
		onNavigate: navigateFolder,
		onCreate: () => setEditingFolder("create"),
		onRename: setEditingFolder,
		onDelete: setDeletingFolder,
		onRefresh: () => mutateFolders(),
	};
	const saveFolder = async (name: string) => {
		if (!editingFolder) return;
		const saved =
			editingFolder === "create"
				? await createLibraryFolder(projectId, name, folderId)
				: await renameLibraryFolder(projectId, editingFolder.id, name);
		await mutateFolders(
			(data) => ({
				folders:
					editingFolder === "create"
						? [...(data?.folders ?? []), saved]
						: (data?.folders ?? []).map((folder) => (folder.id === saved.id ? saved : folder)),
			}),
			{ revalidate: false },
		);
		if (editingFolder === "create") navigateFolder(saved.id);
	};
	const removeFolder = async () => {
		if (!deletingFolder) return;
		await deleteLibraryFolder(projectId, deletingFolder.id);
		await mutateFolders(
			(data) => ({
				folders: (data?.folders ?? []).filter((folder) => folder.id !== deletingFolder.id),
			}),
			{ revalidate: false },
		);
		if (folderId === deletingFolder.id) navigateFolder(deletingFolder.parentId);
	};
	const savedReturn: unknown = location.state?.assetReturnTo;
	const returnTo =
		typeof savedReturn === "string" && savedReturn.startsWith("/") && !savedReturn.startsWith("//")
			? savedReturn
			: projectId && !scopeNavigation
				? `/projects?projectId=${encodeURIComponent(projectId)}`
				: "/";
	const goBack = () => navigate(returnTo, { state: location.state?.assetReturnState });
	const openSettings = (tab: string) =>
		navigate(`/settings?tab=${tab}`, {
			state: {
				settingsReturn: { path: location.pathname + location.search, state: location.state },
			},
		});
	return (
		<main className="asset-library-page" data-scope-navigation={scopeNavigation}>
			<aside className="asset-library-sidebar" aria-label="素材库导航">
				<button
					type="button"
					className="asset-library-back"
					aria-label={scopeNavigation ? "返回项目管理" : "返回项目"}
					onClick={goBack}
				>
					<ChevronLeft className="size-4" />
					<span>{scopeNavigation ? "素材库" : "项目素材库"}</span>
				</button>
				{scopeNavigation ? (
					<AssetLibraryScopes
						projectId={projectId}
						projects={projectsData?.projects ?? []}
						loading={projectsLoading}
						error={projectsError}
						onSelect={selectScope}
					/>
				) : null}
				<AssetLibraryFolders controls={folderControls} />
				<div className="asset-library-sidebar-user">
					<WorkspaceUserMenu
						onOpenSettings={() => openSettings("appearance")}
						onOpenSkills={() => openSettings("prompt-packs")}
					/>
				</div>
			</aside>
			<AssetLibraryWorkspace
				key={projectId || "global"}
				open
				presentation="page"
				projectId={projectId}
				folderControls={folderControls}
				onOpenChange={(open) => {
					if (!open) goBack();
				}}
			/>
			{editingFolder ? (
				<AssetLibraryFolderNameDialog
					key={editingFolder === "create" ? `create:${folderId}` : editingFolder.id}
					folder={editingFolder === "create" ? undefined : editingFolder}
					parentName={[
						"素材库根目录",
						...libraryFolderPath(
							folders,
							editingFolder === "create" ? folderId : editingFolder.parentId,
						).map((folder) => folder.name),
					].join(" / ")}
					onSave={saveFolder}
					onClose={() => setEditingFolder(null)}
				/>
			) : null}
			{deletingFolder ? (
				<AssetLibraryFolderDeleteDialog
					key={deletingFolder.id}
					folder={deletingFolder}
					parentName={[
						"素材库根目录",
						...libraryFolderPath(folders, deletingFolder.parentId).map((folder) => folder.name),
					].join(" / ")}
					onDelete={removeFolder}
					onClose={() => setDeletingFolder(null)}
				/>
			) : null}
		</main>
	);
}
