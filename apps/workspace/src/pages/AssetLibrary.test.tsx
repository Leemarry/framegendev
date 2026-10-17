import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	getMediaAssets,
	restoreMediaAsset,
	scanMediaAssets,
	trashMediaAsset,
	type MediaAsset,
	uploadMediaAsset,
	updateMediaAssetFields,
} from "@/domains/workspace/api/media";
import {
	createLibraryFolder,
	deleteLibraryFolder,
	getLibraryFolders,
	renameLibraryFolder,
	reparentLibraryFolder,
	type AssetLibraryFolder,
} from "@/domains/workspace/api/library-folders";
import { AssetLibrary } from "./AssetLibrary";
import { getWorkspaceDocuments } from "@/domains/workspace/api/workspace";
import { getSelectedGenerationAssets } from "@/domains/generation/api/generation";
import { ConfirmDialog } from "@/shared/components/callable/ConfirmDialog";

vi.mock("@/components/AudioPlayer", () => ({ AudioPlayer: () => null }));
vi.mock("@/components/VideoPlayer", () => ({ VideoPlayer: () => null }));
vi.mock("@/domains/workspace/components/WorkspaceUserMenu", () => ({
	WorkspaceUserMenu: ({ onOpenSettings }: { onOpenSettings: () => void }) => (
		<button onClick={onOpenSettings}>本地用户设置</button>
	),
}));
vi.mock("@/domains/projects/api/projects", () => ({
	projectsKey: "/projects",
	getProjects: vi.fn(async () => ({ projects: [{ id: "project-a", name: "测试项目" }] })),
}));
vi.mock("@/domains/workspace/api/workspace", () => ({
	workspaceDocumentsKey: (id: string) => `/documents/${id}`,
	getWorkspaceDocuments: vi.fn(async () => ({ documents: [] })),
}));
vi.mock("@/domains/generation/api/generation", () => ({
	selectedGenerationAssetsQueryKey: (id: string) => `/selected/${id}`,
	getSelectedGenerationAssets: vi.fn(async () => ({ assets: [] })),
	deleteSelectedGenerationAsset: vi.fn(),
}));
vi.mock("@/domains/workspace/api/media", () => ({
	mediaAssetsKey: "/media-assets",
	getMediaAssets: vi.fn(),
	scanMediaAssets: vi.fn(),
	mediaAssetReferencesPath: (assetId?: string | null, projectId?: string | null) => {
		const id = assetId?.trim();
		if (!id) return null;
		const scope = projectId?.trim();
		return scope
			? `/projects/${encodeURIComponent(scope)}/media-assets/${encodeURIComponent(id)}/references`
			: `/media-assets/${encodeURIComponent(id)}/references`;
	},
	getMediaAssetReferences: vi.fn(async () => ({ references: [] })),
	uploadMediaAsset: vi.fn(),
	updateMediaAsset: vi.fn(),
	updateMediaAssetMetadata: vi.fn(),
	updateMediaAssetFields: vi.fn(),
	deleteMediaAsset: vi.fn(),
	trashMediaAsset: vi.fn(),
	restoreMediaAsset: vi.fn(),
}));
vi.mock("@/domains/workspace/api/library-folders", () => ({
	libraryFoldersKey: (id: string) => `/folders/${id}`,
	getLibraryFolders: vi.fn(),
	createLibraryFolder: vi.fn(),
	deleteLibraryFolder: vi.fn(),
	renameLibraryFolder: vi.fn(),
	reparentLibraryFolder: vi.fn(),
}));
afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});
beforeEach(() => {
	vi.mocked(getMediaAssets).mockResolvedValue({ assets: [] });
	vi.mocked(scanMediaAssets).mockResolvedValue({ scanned: 0, added: 0, updated: 0 });
	vi.mocked(getLibraryFolders).mockResolvedValue({ folders: [] });
});

const LocationEvidence = () => {
	const location = useLocation();
	return (
		<>
			<output aria-label="当前路径">{location.pathname + location.search}</output>
			<output aria-label="路由状态">{JSON.stringify(location.state)}</output>
		</>
	);
};
function mount(state?: unknown, search = "?projectId=project-a") {
	return render(
		<MemoryRouter initialEntries={[{ pathname: "/library", search, state }]}>
			<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
				<AssetLibrary />
				<LocationEvidence />
				<ConfirmDialog />
			</SWRConfig>
		</MemoryRouter>,
	);
}
const asset = (id: string, filename: string, createdAt: string): MediaAsset => ({
	id,
	filename,
	createdAt,
	updatedAt: createdAt,
	kind: "image",
	mimeType: "image/png",
	sizeBytes: 100,
	url: `/api/v1/media-assets/${id}/content`,
	projectId: "project-a",
	tags: [id],
	note: "备注",
	rating: 0,
});

describe("project material library page", () => {
	it("filters saved tags separately from full-text search and clears without writes", async () => {
		vi.mocked(getMediaAssets).mockResolvedValue({
			assets: [
				{ ...asset("tagged", "A.png", "2026-10-15T10:00:00Z"), tags: ["Night scene"] },
				{ ...asset("untagged", "Night.png", "2026-10-15T10:00:00Z"), tags: [], note: "Night" },
			],
		});
		mount();
		await screen.findByRole("button", { name: "预览 Night.png" });
		fireEvent.click(screen.getByRole("button", { name: "筛选素材" }));
		fireEvent.change(screen.getByRole("textbox", { name: "筛选标签" }), {
			target: { value: " NIGHT " },
		});
		expect(screen.getByRole("button", { name: "预览 A.png" })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "预览 Night.png" })).not.toBeInTheDocument();
		fireEvent.change(screen.getByRole("textbox", { name: "搜索素材" }), {
			target: { value: "Night.png" },
		});
		expect(screen.getByRole("heading", { name: "暂无匹配素材" })).toBeInTheDocument();
		fireEvent.change(screen.getByRole("textbox", { name: "筛选标签" }), {
			target: { value: "" },
		});
		expect(screen.getByRole("button", { name: "预览 Night.png" })).toBeInTheDocument();
		expect(updateMediaAssetFields).not.toHaveBeenCalled();
	});

	it.each(["media", "documents", "folders"])(
		"blocks cached asset actions after a %s refresh failure and recovers on retry",
		async (failure) => {
			const saved = { assets: [asset("asset-a", "kept.png", "2026-10-15T10:00:00Z")] };
			vi.mocked(getMediaAssets).mockResolvedValue(saved);
			mount();
			fireEvent.click(await screen.findByRole("button", { name: "预览 kept.png" }));
			expect(await screen.findByRole("button", { name: "编辑元数据" })).toBeEnabled();
			const request =
				failure === "media"
					? getMediaAssets
					: failure === "documents"
						? getWorkspaceDocuments
						: getLibraryFolders;
			vi.mocked(request).mockRejectedValueOnce(new Error("aggregate read unavailable"));
			fireEvent.click(screen.getByRole("button", { name: "刷新素材" }));
			expect(await screen.findByText(/素材库加载失败：aggregate read unavailable/)).toBeVisible();
			expect(screen.queryByRole("button", { name: "编辑元数据" })).not.toBeInTheDocument();
			expect(screen.queryByRole("button", { name: "删除" })).not.toBeInTheDocument();
			expect(screen.queryByRole("button", { name: "预览 kept.png" })).not.toBeInTheDocument();
			fireEvent.click(screen.getByRole("button", { name: "刷新素材" }));
			expect(await screen.findByRole("button", { name: "预览 kept.png" })).toBeVisible();
			expect(screen.queryByText(/素材库加载失败/)).not.toBeInTheDocument();
		},
	);

	it("shows the real root empty state and returns to the original document", async () => {
		mount({
			assetReturnTo: "/projects?projectId=project-a&documentId=doc-a",
			assetReturnState: { projectView: "document" },
		});
		expect(await screen.findByRole("heading", { name: "这里还没有素材" })).toBeInTheDocument();
		expect(screen.getByText("导入文件，或把文件放入素材目录后刷新。")).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "项目素材" })).toBeInTheDocument();
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(screen.getAllByRole("button", { name: "新建文件夹" })[0]).toBeEnabled();
		expect(screen.getByText("已加载 0 个文件夹，0 个文件")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "返回项目" }));
		expect(screen.getByLabelText("当前路径")).toHaveTextContent(
			"/projects?projectId=project-a&documentId=doc-a",
		);
	});
	it("searches persisted metadata, resizes thumbnails, toggles details and refreshes", async () => {
		vi.mocked(getMediaAssets).mockResolvedValue({
			assets: [
				asset("older", "A.png", "2026-10-13T00:00:00Z"),
				asset("newer", "B.png", "2026-10-14T00:00:00Z"),
			],
		});
		mount();
		await screen.findByRole("button", { name: "预览 B.png" });
		expect(document.querySelectorAll("[data-asset-key]")[0]).toHaveAttribute(
			"data-asset-key",
			"media:newer",
		);
		fireEvent.change(screen.getByRole("textbox", { name: "搜索素材" }), {
			target: { value: "older" },
		});
		expect(screen.getByRole("button", { name: "预览 A.png" })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "预览 B.png" })).not.toBeInTheDocument();
		fireEvent.change(screen.getByRole("slider", { name: "缩略图大小" }), {
			target: { value: "250" },
		});
		expect(
			document.querySelector("[data-asset-key]")?.parentElement?.style.gridTemplateColumns,
		).toContain("250px");
		fireEvent.click(screen.getByRole("button", { name: "显示素材详情" }));
		expect(screen.getByRole("button", { name: "编辑元数据" })).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "隐藏素材详情" }));
		expect(screen.queryByRole("button", { name: "编辑元数据" })).not.toBeInTheDocument();
		const count = vi.mocked(getMediaAssets).mock.calls.length;
		const documentCount = vi.mocked(getWorkspaceDocuments).mock.calls.length;
		fireEvent.click(screen.getByRole("button", { name: "刷新素材" }));
		await waitFor(() => expect(scanMediaAssets).toHaveBeenCalledWith("project-a"));
		await waitFor(() => expect(vi.mocked(getMediaAssets).mock.calls.length).toBeGreaterThan(count));
		await waitFor(() =>
			expect(vi.mocked(getWorkspaceDocuments).mock.calls.length).toBeGreaterThan(documentCount),
		);
		fireEvent.click(screen.getByRole("button", { name: "预览 A.png" }));
		expect(screen.getByRole("button", { name: "编辑元数据" })).toBeInTheDocument();
	});
	it("preserves the library and its document return state when opening settings", async () => {
		const state = { assetReturnTo: "/projects?projectId=project-a&documentId=doc-a" };
		mount(state);
		fireEvent.click(screen.getByRole("button", { name: "本地用户设置" }));
		expect(screen.getByLabelText("当前路径")).toHaveTextContent("/settings?tab=appearance");
		expect(JSON.parse(screen.getByLabelText("路由状态").textContent || "{}")).toEqual({
			settingsReturn: { path: "/library?projectId=project-a", state },
		});
	});
	it("uploads into the active project and direct entry returns to that project", async () => {
		vi.mocked(uploadMediaAsset).mockResolvedValue(
			asset("uploaded", "fixture.png", "2026-10-14T00:00:00Z"),
		);
		mount();
		await screen.findByRole("heading", { name: "这里还没有素材" });
		const file = new File(["bytes"], "fixture.png", { type: "image/png" });
		fireEvent.change(screen.getByLabelText("上传素材"), { target: { files: [file] } });
		await waitFor(() =>
			expect(uploadMediaAsset).toHaveBeenCalledWith(file, "project-a", "", expect.any(Function)),
		);
		fireEvent.click(screen.getByRole("button", { name: "返回项目" }));
		expect(screen.getByLabelText("当前路径")).toHaveTextContent("/projects?projectId=project-a");
	});
});

const folder = (id: string, name: string, parentId = ""): AssetLibraryFolder => ({
	id,
	name,
	parentId,
	projectId: "project-a",
	createdAt: "2026-10-14T00:00:00Z",
	updatedAt: "2026-10-14T00:00:00Z",
});

describe("material folder workflows", () => {
	it.each(["?projectId=project-a", "?scope=all"])(
		"loads usage only on demand and recovers failed filtering in %s",
		async (scope) => {
			const assets = [
				{
					...asset("used", "used.png", "2026-10-16T00:00:00Z"),
					usage: { selected: true, candidate: false, reference: false },
				},
				{
					...asset("free", "free.png", "2026-10-16T00:00:00Z"),
					usage: { selected: false, candidate: false, reference: false },
				},
			];
			vi.mocked(getMediaAssets).mockImplementation(async (filters) => ({
				assets: filters?.includeUsage ? assets : assets.map(({ usage: _usage, ...asset }) => asset),
			}));
			mount(undefined, scope);
			await screen.findByRole("button", { name: "预览 free.png" });
			expect(
				vi.mocked(getMediaAssets).mock.calls.every(([filters]) => !filters?.includeUsage),
			).toBe(true);
			fireEvent.click(screen.getByRole("button", { name: "筛选素材" }));
			fireEvent.keyDown(screen.getByRole("combobox", { name: "使用状态" }), { key: "Enter" });
			fireEvent.keyDown(await screen.findByRole("option", { name: "已选用" }), { key: "Enter" });
			await screen.findByRole("button", { name: "预览 used.png" });
			expect(screen.queryByRole("button", { name: "预览 free.png" })).not.toBeInTheDocument();
			expect(getMediaAssets).toHaveBeenLastCalledWith({
				projectId: scope.includes("project-a") ? "project-a" : undefined,
				includeUsage: true,
			});
			fireEvent.change(screen.getByRole("textbox", { name: "筛选标签" }), {
				target: { value: "free" },
			});
			expect(screen.getByRole("heading", { name: "暂无匹配素材" })).toBeInTheDocument();
			fireEvent.change(screen.getByRole("textbox", { name: "筛选标签" }), {
				target: { value: "" },
			});
			fireEvent.keyDown(screen.getByRole("combobox", { name: "使用状态" }), { key: "Enter" });
			fireEvent.keyDown(await screen.findByRole("option", { name: "未使用" }), { key: "Enter" });
			expect(screen.getByRole("button", { name: "预览 free.png" })).toBeInTheDocument();
			fireEvent.click(screen.getByRole("button", { name: "筛选素材" }));
			vi.mocked(getMediaAssets).mockRejectedValueOnce(new Error("usage unavailable"));
			fireEvent.click(screen.getByRole("button", { name: "刷新素材" }));
			expect(await screen.findByText(/素材库加载失败：usage unavailable/)).toBeVisible();
			expect(screen.queryByRole("button", { name: "预览 free.png" })).not.toBeInTheDocument();
			fireEvent.click(screen.getByRole("button", { name: "刷新素材" }));
			await screen.findByRole("button", { name: "预览 free.png" });
			fireEvent.click(screen.getByRole("button", { name: "筛选素材" }));
			fireEvent.keyDown(screen.getByRole("combobox", { name: "使用状态" }), { key: "Enter" });
			fireEvent.keyDown(await screen.findByRole("option", { name: "全部素材" }), { key: "Enter" });
			await screen.findByRole("button", { name: "预览 used.png" });
			expect(screen.getByRole("button", { name: "预览 free.png" })).toBeInTheDocument();
			expect(updateMediaAssetFields).not.toHaveBeenCalled();
		},
	);
	it.each(["?projectId=project-a", "?scope=all"])(
		"filters recorded provenance independently of resource records in %s",
		async (scope) => {
			vi.mocked(getMediaAssets).mockResolvedValue({
				assets: [
					{ ...asset("local", "local.png", "2026-10-16T00:00:00Z"), source: "upload" },
					{ ...asset("generated", "generated.png", "2026-10-16T00:00:00Z"), source: "generation" },
					asset("unknown", "unknown.png", "2026-10-16T00:00:00Z"),
				],
			});
			mount(undefined, scope);
			await screen.findByRole("button", { name: "预览 local.png" });
			fireEvent.click(screen.getByRole("button", { name: "筛选素材" }));
			fireEvent.keyDown(screen.getByRole("combobox", { name: "来源" }), { key: "Enter" });
			expect(screen.getByRole("option", { name: "浏览器采集（待接入）" })).toHaveAttribute(
				"aria-disabled",
				"true",
			);
			fireEvent.keyDown(await screen.findByRole("option", { name: "本地导入" }), { key: "Enter" });
			expect(screen.getByRole("button", { name: "预览 local.png" })).toBeInTheDocument();
			expect(screen.queryByRole("button", { name: "预览 generated.png" })).not.toBeInTheDocument();
			fireEvent.keyDown(screen.getByRole("combobox", { name: "资源记录" }), { key: "Enter" });
			fireEvent.keyDown(await screen.findByRole("option", { name: "已选资源" }), { key: "Enter" });
			expect(screen.getByRole("heading", { name: "暂无匹配素材" })).toBeInTheDocument();
			expect(updateMediaAssetFields).not.toHaveBeenCalled();
		},
	);

	it("applies the displayed source filter to global physical media", async () => {
		vi.mocked(getMediaAssets).mockResolvedValue({
			assets: [{ ...asset("global", "global.png", "2026-10-16T00:00:00Z"), projectId: "" }],
		});
		mount(undefined, "?scope=all");
		await screen.findByRole("button", { name: "预览 global.png" });
		fireEvent.click(screen.getByRole("button", { name: "筛选素材" }));
		fireEvent.keyDown(screen.getByRole("combobox", { name: "资源记录" }), { key: "Enter" });
		fireEvent.keyDown(await screen.findByRole("option", { name: "已选资源" }), { key: "Enter" });
		expect(screen.queryByRole("button", { name: "预览 global.png" })).not.toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "暂无匹配素材" })).toBeInTheDocument();
		fireEvent.keyDown(screen.getByRole("combobox", { name: "资源记录" }), { key: "Enter" });
		fireEvent.keyDown(await screen.findByRole("option", { name: "媒体素材" }), { key: "Enter" });
		expect(screen.getByRole("button", { name: "预览 global.png" })).toBeInTheDocument();
		expect(getMediaAssets).toHaveBeenCalledWith({ projectId: undefined });
		expect(getSelectedGenerationAssets).not.toHaveBeenCalled();
		expect(updateMediaAssetFields).not.toHaveBeenCalled();
	});

	it("browses all scoped assets and returns to directory mode on folder navigation", async () => {
		vi.mocked(getLibraryFolders).mockResolvedValue({ folders: [folder("child", "Child")] });
		vi.mocked(getMediaAssets).mockResolvedValue({
			assets: [
				asset("root", "root.png", "2026-10-16T00:00:00Z"),
				{ ...asset("nested", "nested.png", "2026-10-16T00:00:00Z"), folderId: "child" },
			],
		});
		mount();
		await screen.findByRole("button", { name: "预览 root.png" });
		fireEvent.click(screen.getByRole("button", { name: "筛选素材" }));
		fireEvent.keyDown(screen.getByRole("combobox", { name: "浏览范围" }), { key: "Enter" });
		fireEvent.keyDown(await screen.findByRole("option", { name: "全部素材" }), { key: "Enter" });
		expect(screen.getByRole("button", { name: "预览 nested.png" })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "打开文件夹 Child" })).not.toBeInTheDocument();
		expect(screen.getByRole("checkbox", { name: "包含子文件夹" })).toBeDisabled();
		fireEvent.change(screen.getByRole("textbox", { name: "筛选标签" }), {
			target: { value: "nested" },
		});
		expect(screen.queryByRole("button", { name: "预览 root.png" })).not.toBeInTheDocument();
		expect(getMediaAssets).toHaveBeenCalledWith({ projectId: "project-a" });
		fireEvent.keyDown(screen.getByRole("textbox", { name: "筛选标签" }), { key: "Escape" });
		fireEvent.click(screen.getByRole("button", { name: "Child" }));
		await waitFor(() =>
			expect(screen.queryByRole("button", { name: "预览 root.png" })).not.toBeInTheDocument(),
		);
		fireEvent.click(screen.getByRole("button", { name: "筛选素材" }));
		expect(screen.getByRole("combobox", { name: "浏览范围" })).toHaveTextContent("目录浏览");
		expect(updateMediaAssetFields).not.toHaveBeenCalled();
	});

	it("includes nested assets from the root only when enabled", async () => {
		vi.mocked(getLibraryFolders).mockResolvedValue({ folders: [folder("child", "Child")] });
		vi.mocked(getMediaAssets).mockResolvedValue({
			assets: [{ ...asset("nested", "nested.png", "2026-10-16T00:00:00Z"), folderId: "child" }],
		});
		mount();
		await screen.findByRole("button", { name: "打开文件夹 Child" });
		expect(screen.queryByRole("button", { name: "预览 nested.png" })).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "筛选素材" }));
		fireEvent.click(screen.getByRole("checkbox", { name: "包含子文件夹" }));
		expect(screen.getByRole("button", { name: "预览 nested.png" })).toBeInTheDocument();
	});

	it("includes descendants on request while excluding siblings and foreign scope", async () => {
		vi.mocked(getLibraryFolders).mockResolvedValue({
			folders: [
				folder("parent", "Parent"),
				folder("child", "Child", "parent"),
				folder("deep", "Deep", "child"),
				folder("sibling", "Sibling"),
			],
		});
		vi.mocked(getMediaAssets).mockResolvedValue({
			assets: [
				{ ...asset("direct", "direct.png", "2026-10-16T00:00:00Z"), folderId: "parent" },
				{ ...asset("nested", "nested.png", "2026-10-16T00:00:00Z"), folderId: "child" },
				{ ...asset("deep", "deep.png", "2026-10-16T00:00:00Z"), folderId: "deep" },
				{ ...asset("sibling", "sibling.png", "2026-10-16T00:00:00Z"), folderId: "sibling" },
				{
					...asset("foreign", "foreign.png", "2026-10-16T00:00:00Z"),
					projectId: "",
					folderId: "child",
				},
			],
		});
		mount(undefined, "?projectId=project-a&folder=parent");
		await screen.findByRole("button", { name: "预览 direct.png" });
		expect(screen.queryByRole("button", { name: "预览 nested.png" })).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "筛选素材" }));
		fireEvent.click(screen.getByRole("checkbox", { name: "包含子文件夹" }));
		expect(screen.getByRole("button", { name: "预览 nested.png" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "预览 deep.png" })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "预览 sibling.png" })).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "预览 foreign.png" })).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("checkbox", { name: "包含子文件夹" }));
		expect(screen.queryByRole("button", { name: "预览 deep.png" })).not.toBeInTheDocument();
		expect(updateMediaAssetFields).not.toHaveBeenCalled();
	});

	beforeEach(() => {
		for (const method of [
			"hasPointerCapture",
			"setPointerCapture",
			"releasePointerCapture",
			"scrollIntoView",
		]) {
			if (!(method in HTMLElement.prototype))
				Object.defineProperty(HTMLElement.prototype, method, {
					configurable: true,
					value: () => false,
				});
		}
	});
	it("moves a project asset out of its folder, preserves a rejected selection and excludes global writes", async () => {
		vi.mocked(getLibraryFolders).mockResolvedValue({ folders: [folder("parent", "角色")] });
		const inside = { ...asset("inside", "inside.png", "2026-10-14T00:00:00Z"), folderId: "parent" };
		vi.mocked(getMediaAssets).mockResolvedValue({ assets: [inside] });
		vi.mocked(updateMediaAssetFields)
			.mockRejectedValueOnce(new Error("移动暂时失败"))
			.mockImplementationOnce(async () => {
				const moved = { ...inside, folderId: "" };
				vi.mocked(getMediaAssets).mockResolvedValue({ assets: [moved] });
				return moved;
			});
		mount(undefined, "?projectId=project-a&folder=parent");
		fireEvent.click(await screen.findByRole("button", { name: "预览 inside.png" }));
		fireEvent.keyDown(screen.getByRole("combobox", { name: "移动到文件夹" }), { key: "Enter" });
		const root = await screen.findByRole("option", { name: "素材库根目录" });
		fireEvent.keyDown(root, { key: "Enter" });
		fireEvent.click(await screen.findByRole("button", { name: "移动" }));
		expect(await screen.findByRole("alert")).toHaveTextContent("移动暂时失败");
		expect(screen.getByRole("button", { name: "预览 inside.png" })).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "移动" }));
		await waitFor(() =>
			expect(screen.queryByRole("button", { name: "预览 inside.png" })).not.toBeInTheDocument(),
		);
		expect(updateMediaAssetFields).toHaveBeenCalledWith("inside", { folderId: "" }, "project-a");
		cleanup();
		vi.mocked(getMediaAssets).mockResolvedValue({
			assets: [{ ...inside, projectId: "", folderId: "" }],
		});
		mount();
		fireEvent.click(await screen.findByRole("button", { name: "预览 inside.png" }));
		expect(screen.queryByRole("combobox", { name: "移动到文件夹" })).not.toBeInTheDocument();
	});
	it("creates a nested folder, enters its URL and uploads there with one request", async () => {
		vi.mocked(getLibraryFolders).mockResolvedValue({ folders: [folder("parent", "角色")] });
		vi.mocked(createLibraryFolder).mockResolvedValue(folder("child", "主角", "parent"));
		vi.mocked(uploadMediaAsset).mockResolvedValue(
			asset("uploaded", "fixture.png", "2026-10-14T00:00:00Z"),
		);
		mount({ assetReturnTo: "/projects?documentId=doc-a" }, "?projectId=project-a&folder=parent");
		await screen.findByRole("button", { name: "返回上级文件夹" });
		await waitFor(() =>
			expect(screen.getByRole("button", { name: "新建素材文件夹" })).toBeEnabled(),
		);
		fireEvent.click(screen.getByRole("button", { name: "新建素材文件夹" }));
		fireEvent.change(screen.getByRole("textbox", { name: "文件夹名称" }), {
			target: { value: " 主角 " },
		});
		fireEvent.click(screen.getByRole("button", { name: "创建" }));
		await waitFor(() =>
			expect(createLibraryFolder).toHaveBeenCalledWith("project-a", "主角", "parent"),
		);
		await waitFor(() =>
			expect(screen.getByLabelText("当前路径")).toHaveTextContent("folder=child"),
		);
		const file = new File(["bytes"], "fixture.png", { type: "image/png" });
		fireEvent.change(screen.getByLabelText("上传素材"), { target: { files: [file] } });
		await waitFor(() =>
			expect(uploadMediaAsset).toHaveBeenCalledWith(
				file,
				"project-a",
				"child",
				expect.any(Function),
			),
		);
		expect(updateMediaAssetFields).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "返回上级文件夹" }));
		expect(screen.getByLabelText("当前路径")).toHaveTextContent("folder=parent");
		expect(screen.getByLabelText("路由状态")).toHaveTextContent("doc-a");
	});
	it("retains a rejected rename draft, retries and cancels creation without writes", async () => {
		vi.mocked(getLibraryFolders).mockResolvedValue({ folders: [folder("parent", "角色")] });
		vi.mocked(renameLibraryFolder)
			.mockRejectedValueOnce(new Error("同级名称已存在"))
			.mockResolvedValueOnce(folder("parent", "人物"));
		mount();
		fireEvent.click(await screen.findByRole("button", { name: "重命名文件夹 角色" }));
		fireEvent.change(screen.getByRole("textbox", { name: "文件夹名称" }), {
			target: { value: "人物" },
		});
		fireEvent.click(screen.getByRole("button", { name: "保存" }));
		expect(await screen.findByRole("alert")).toHaveTextContent("同级名称已存在");
		expect(screen.getByRole("textbox", { name: "文件夹名称" })).toHaveValue("人物");
		fireEvent.click(screen.getByRole("button", { name: "保存" }));
		await screen.findByRole("button", { name: "重命名文件夹 人物" });
		fireEvent.click(screen.getByRole("button", { name: "新建素材文件夹" }));
		fireEvent.change(screen.getByRole("textbox", { name: "文件夹名称" }), {
			target: { value: "非法/目录" },
		});
		fireEvent.click(screen.getByRole("button", { name: "创建" }));
		expect(await screen.findByRole("alert")).toHaveTextContent("路径分隔符");
		fireEvent.click(screen.getByRole("button", { name: "取消" }));
		expect(createLibraryFolder).not.toHaveBeenCalled();
	});
	it("confirms empty folder deletion, returns to its parent and preserves a failed delete", async () => {
		vi.mocked(getLibraryFolders).mockResolvedValue({
			folders: [folder("parent", "角色"), folder("child", "主角", "parent")],
		});
		vi.mocked(deleteLibraryFolder).mockResolvedValue(undefined);
		mount(undefined, "?projectId=project-a&folder=child");
		await screen.findByRole("button", { name: "删除文件夹 主角" });
		fireEvent.click(screen.getByRole("button", { name: "删除文件夹 主角" }));
		expect(screen.getByRole("heading", { name: "删除文件夹" })).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "取消" }));
		expect(deleteLibraryFolder).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "删除文件夹 主角" }));
		fireEvent.click(screen.getByRole("button", { name: /^删除文件夹$/ }));
		await waitFor(() => expect(deleteLibraryFolder).toHaveBeenCalledWith("project-a", "child"));
		await waitFor(() =>
			expect(screen.getByLabelText("当前路径")).toHaveTextContent("folder=parent"),
		);
		cleanup();
		vi.mocked(deleteLibraryFolder).mockRejectedValue({
			code: 409,
			message: "library folder is not empty",
			details: null,
		});
		mount(undefined, "?projectId=project-a&folder=child");
		fireEvent.click(await screen.findByRole("button", { name: "删除文件夹 主角" }));
		fireEvent.click(screen.getByRole("button", { name: /^删除文件夹$/ }));
		expect(await screen.findByRole("alert")).toHaveTextContent("library folder is not empty");
		expect(screen.getByLabelText("当前路径")).toHaveTextContent("folder=child");
	});
	it("restores a URL folder, limits content to its scope and disables nonexistent uploads", async () => {
		vi.mocked(getLibraryFolders).mockResolvedValue({
			folders: [folder("parent", "角色"), folder("child", "主角", "parent")],
		});
		vi.mocked(getMediaAssets).mockResolvedValue({
			assets: [
				{ ...asset("inside", "inside.png", "2026-10-14T00:00:00Z"), folderId: "parent" },
				asset("root", "root.png", "2026-10-14T00:00:00Z"),
				{ ...asset("global", "global.png", "2026-10-14T00:00:00Z"), projectId: "" },
			],
		});
		mount(undefined, "?projectId=project-a&folder=parent");
		await screen.findByRole("button", { name: "预览 inside.png" });
		expect(screen.queryByRole("button", { name: "预览 root.png" })).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "预览 global.png" })).not.toBeInTheDocument();
		expect(screen.getByText("已加载 1 个文件夹，1 个文件")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "打开文件夹 主角" }));
		await waitFor(() =>
			expect(screen.getByLabelText("当前路径")).toHaveTextContent("folder=child"),
		);
		cleanup();
		mount(undefined, "?projectId=project-a&folder=missing");
		await screen.findByText(/文件夹不存在/);
		expect(screen.getByLabelText("上传素材")).toBeDisabled();
	});
	it("moves the current nonempty folder, excludes descendants and preserves its URL and media", async () => {
		vi.mocked(getLibraryFolders).mockResolvedValue({
			folders: [
				folder("parent", "角色"),
				folder("child", "主角", "parent"),
				folder("target", "成片"),
			],
		});
		vi.mocked(getMediaAssets).mockResolvedValue({
			assets: [{ ...asset("inside", "inside.png", "2026-10-14T00:00:00Z"), folderId: "parent" }],
		});
		vi.mocked(reparentLibraryFolder).mockResolvedValue(folder("parent", "角色", "target"));
		mount({ assetReturnTo: "/projects?documentId=doc-a" }, "?projectId=project-a&folder=parent");
		fireEvent.click(await screen.findByRole("button", { name: "移动文件夹 角色" }));
		const dialog = screen.getByRole("alertdialog");
		expect(within(dialog).getByRole("button", { name: "移动" })).toBeDisabled();
		fireEvent.keyDown(within(dialog).getByRole("combobox", { name: "选择目标目录" }), {
			key: "Enter",
		});
		expect(screen.queryByRole("option", { name: "角色" })).not.toBeInTheDocument();
		expect(screen.queryByRole("option", { name: "角色 / 主角" })).not.toBeInTheDocument();
		fireEvent.keyDown(await screen.findByRole("option", { name: "成片" }), { key: "Enter" });
		fireEvent.click(within(dialog).getByRole("button", { name: "移动" }));
		await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
		expect(reparentLibraryFolder).toHaveBeenCalledWith("project-a", "parent", "target");
		expect(screen.getByLabelText("当前路径")).toHaveTextContent(
			"/library?projectId=project-a&folder=parent",
		);
		expect(screen.getByLabelText("路由状态")).toHaveTextContent("doc-a");
		expect(screen.getByRole("button", { name: "预览 inside.png" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "打开文件夹 主角" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "返回上级文件夹" })).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "返回上级文件夹" }));
		expect(screen.getByLabelText("当前路径")).toHaveTextContent("folder=target");
	});
	it("cancels without writes and keeps a conflicting move draft for retry", async () => {
		vi.mocked(getLibraryFolders).mockResolvedValue({
			folders: [folder("parent", "角色"), folder("child", "主角", "parent")],
		});
		vi.mocked(reparentLibraryFolder)
			.mockRejectedValueOnce({ code: 400, message: "folder name already exists" })
			.mockResolvedValueOnce(folder("child", "主角"));
		mount(undefined, "?projectId=project-a&folder=child");
		fireEvent.click(await screen.findByRole("button", { name: "移动文件夹 主角" }));
		fireEvent.click(screen.getByRole("button", { name: "取消" }));
		expect(reparentLibraryFolder).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "移动文件夹 主角" }));
		fireEvent.keyDown(screen.getByRole("combobox", { name: "选择目标目录" }), { key: "Enter" });
		fireEvent.keyDown(await screen.findByRole("option", { name: "素材库根目录" }), {
			key: "Enter",
		});
		fireEvent.click(screen.getByRole("button", { name: "移动" }));
		expect(await screen.findByRole("alert")).toHaveTextContent("folder name already exists");
		expect(screen.getByRole("combobox", { name: "选择目标目录" })).toHaveTextContent(
			"素材库根目录",
		);
		expect(screen.getByLabelText("当前路径")).toHaveTextContent("folder=child");
		fireEvent.click(screen.getByRole("button", { name: "移动" }));
		await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
		expect(reparentLibraryFolder).toHaveBeenCalledTimes(2);
		expect(reparentLibraryFolder).toHaveBeenLastCalledWith("project-a", "child", "");
	});
});

describe("global material scopes", () => {
	it("opens global page, creates a global folder and uploads to its actual scope", async () => {
		vi.mocked(createLibraryFolder).mockResolvedValue({
			...folder("global-folder", "共享"),
			projectId: "",
		});
		vi.mocked(uploadMediaAsset).mockResolvedValue({
			...asset("global", "fixture.png", "2026-10-14T00:00:00Z"),
			projectId: "",
			folderId: "global-folder",
		});
		mount(undefined, "?scope=all");
		expect(await screen.findByRole("heading", { name: "素材库" })).toBeInTheDocument();
		await waitFor(() =>
			expect(screen.getByRole("button", { name: "新建素材文件夹" })).toBeEnabled(),
		);
		fireEvent.click(screen.getByRole("button", { name: "新建素材文件夹" }));
		fireEvent.change(screen.getByRole("textbox", { name: "文件夹名称" }), {
			target: { value: "共享" },
		});
		fireEvent.click(screen.getByRole("button", { name: "创建" }));
		await waitFor(() => expect(createLibraryFolder).toHaveBeenCalledWith(null, "共享", ""));
		await waitFor(() =>
			expect(screen.getByLabelText("当前路径")).toHaveTextContent("folder=global-folder"),
		);
		const file = new File(["bytes"], "fixture.png", { type: "image/png" });
		fireEvent.change(screen.getByLabelText("上传素材"), { target: { files: [file] } });
		await waitFor(() =>
			expect(uploadMediaAsset).toHaveBeenCalledWith(
				file,
				null,
				"global-folder",
				expect.any(Function),
			),
		);
	});
	it("clears every active filter from the empty state", async () => {
		vi.mocked(getLibraryFolders).mockResolvedValue({ folders: [] });
		vi.mocked(getMediaAssets).mockResolvedValue({
			assets: [asset("root", "root.png", "2026-10-16T00:00:00Z")],
		});
		mount(undefined, "?projectId=project-a&tag=missing&kind=image&minRating=3");

		expect(await screen.findByText("暂无匹配素材")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "清除筛选" }));

		await waitFor(() => expect(screen.getByLabelText("当前路径")).not.toHaveTextContent("tag="));
		const currentPath = screen.getByLabelText("当前路径");
		expect(currentPath).not.toHaveTextContent("kind=");
		expect(currentPath).not.toHaveTextContent("minRating=");
		expect(await screen.findByRole("button", { name: "预览 root.png" })).toBeInTheDocument();
	});

	it("steps through previews and toggles the image zoom", async () => {
		vi.mocked(getLibraryFolders).mockResolvedValue({ folders: [] });
		vi.mocked(getMediaAssets).mockResolvedValue({
			assets: [
				asset("second", "b.png", "2026-10-15T00:00:00Z"),
				asset("first", "a.png", "2026-10-16T00:00:00Z"),
			],
		});
		mount(undefined, "?projectId=project-a");

		fireEvent.click(await screen.findByRole("button", { name: "预览 a.png" }));

		expect(screen.getByRole("button", { name: "上一个素材" })).toBeDisabled();
		fireEvent.click(screen.getByRole("button", { name: "下一个素材" }));

		expect(screen.getByRole("img", { name: "b.png" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "下一个素材" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "上一个素材" })).toBeEnabled();

		fireEvent.click(screen.getByRole("button", { name: "原始尺寸" }));

		expect(screen.getByRole("button", { name: "适应窗口" })).toBeInTheDocument();
		expect(screen.getByRole("img", { name: "b.png" })).toHaveClass("max-h-none");

		fireEvent.click(screen.getByRole("button", { name: "适应窗口" }));

		expect(screen.getByRole("button", { name: "原始尺寸" })).toBeInTheDocument();
	});

	it("reports an unreadable image in the preview", async () => {
		vi.mocked(getLibraryFolders).mockResolvedValue({ folders: [] });
		vi.mocked(getMediaAssets).mockResolvedValue({
			assets: [asset("broken", "a.png", "2026-10-16T00:00:00Z")],
		});
		mount(undefined, "?projectId=project-a");

		fireEvent.click(await screen.findByRole("button", { name: "预览 a.png" }));

		fireEvent.error(screen.getByRole("img", { name: "a.png" }));

		expect(await screen.findByText("无法预览此素材")).toBeInTheDocument();
	});

	it("imports several files through the queue and retries a failed one", async () => {
		vi.mocked(getLibraryFolders).mockResolvedValue({ folders: [] });
		vi.mocked(getMediaAssets).mockResolvedValue({ assets: [] });
		const first = new File(["a"], "a.png", { type: "image/png" });
		const second = new File(["b"], "b.png", { type: "image/png" });
		vi.mocked(uploadMediaAsset)
			.mockRejectedValueOnce(new Error("网络中断"))
			.mockResolvedValue(asset("uploaded", "a.png", "2026-10-16T00:00:00Z"));
		mount(undefined, "?projectId=project-a");
		await screen.findByText("这里还没有素材");

		fireEvent.change(screen.getByLabelText("上传素材"), { target: { files: [first, second] } });

		await waitFor(() => expect(vi.mocked(uploadMediaAsset).mock.calls.length).toBe(2));
		expect(vi.mocked(uploadMediaAsset).mock.calls[0][0]).toBe(first);
		expect(vi.mocked(uploadMediaAsset).mock.calls[1][0]).toBe(second);

		const queue = await screen.findByRole("region", { name: "导入队列" });
		expect(within(queue).getByText("已导入 1 / 2 项")).toBeInTheDocument();
		expect(within(queue).getByText("网络中断")).toBeInTheDocument();
		expect(within(queue).getByText("已导入")).toBeInTheDocument();

		fireEvent.click(within(queue).getByRole("button", { name: "重试" }));

		await waitFor(() => expect(vi.mocked(uploadMediaAsset).mock.calls.length).toBe(3));
		await waitFor(() =>
			expect(
				within(screen.getByRole("region", { name: "导入队列" })).getByText("已导入 2 / 2 项"),
			).toBeInTheDocument(),
		);

		fireEvent.click(
			within(screen.getByRole("region", { name: "导入队列" })).getByRole("button", {
				name: "清除已完成",
			}),
		);

		await waitFor(() =>
			expect(screen.queryByRole("region", { name: "导入队列" })).not.toBeInTheDocument(),
		);
	});

	it("browses the trash and restores an asset", async () => {
		vi.mocked(getLibraryFolders).mockResolvedValue({ folders: [] });
		vi.mocked(getMediaAssets).mockImplementation(async (filters) =>
			filters?.status === "trashed"
				? {
						assets: [
							{
								...asset("gone", "gone.png", "2026-10-16T00:00:00Z"),
								trashedAt: "2026-10-17T00:00:00Z",
							},
						],
					}
				: { assets: [asset("root", "root.png", "2026-10-16T00:00:00Z")] },
		);
		mount(undefined, "?projectId=project-a");
		await screen.findByRole("button", { name: "预览 root.png" });

		fireEvent.click(screen.getByRole("button", { name: "回收站" }));

		await waitFor(() =>
			expect(screen.getByLabelText("当前路径")).toHaveTextContent("status=trashed"),
		);
		expect(await screen.findByRole("button", { name: "预览 gone.png" })).toBeInTheDocument();
		expect(getMediaAssets).toHaveBeenLastCalledWith(
			expect.objectContaining({ projectId: "project-a", status: "trashed" }),
		);

		fireEvent.click(screen.getByRole("button", { name: "恢复 gone.png" }));

		await waitFor(() => expect(restoreMediaAsset).toHaveBeenCalledWith("gone", "project-a"));
	});

	it("moves an asset to the trash instead of deleting it", async () => {
		vi.mocked(getLibraryFolders).mockResolvedValue({ folders: [] });
		vi.mocked(getMediaAssets).mockResolvedValue({
			assets: [asset("root", "root.png", "2026-10-16T00:00:00Z")],
		});
		mount(undefined, "?projectId=project-a");

		fireEvent.click(await screen.findByRole("button", { name: "删除 root.png" }));
		fireEvent.click(await screen.findByRole("button", { name: "移到回收站" }));

		await waitFor(() => expect(trashMediaAsset).toHaveBeenCalledWith("root", "project-a"));
	});

	it("switches URL scopes and resets directory while preserving the return state", async () => {
		vi.mocked(getLibraryFolders).mockImplementation(async (projectId) => ({
			folders: projectId ? [folder("parent", "角色")] : [],
		}));
		mount(
			{ assetReturnTo: "/projects?documentId=doc-a" },
			"?scope=all&projectId=project-a&folder=parent",
		);
		fireEvent.click(await screen.findByRole("button", { name: "全局素材" }));
		expect(screen.getByLabelText("当前路径")).toHaveTextContent("/library?scope=all");
		expect(screen.getByLabelText("当前路径")).not.toHaveTextContent("folder=");
		await waitFor(() => expect(getLibraryFolders).toHaveBeenCalledWith(null));
		fireEvent.click(screen.getByRole("button", { name: "素材范围 测试项目" }));
		expect(screen.getByLabelText("当前路径")).toHaveTextContent("projectId=project-a");
		expect(screen.getByLabelText("路由状态")).toHaveTextContent("doc-a");
	});
});
