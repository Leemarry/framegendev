import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	deleteSelectedGenerationAsset,
	getSelectedGenerationAssets,
	type SelectedGenerationAsset,
} from "@/domains/generation/api/generation";
import { getProjects } from "@/domains/projects/api/projects";
import {
	getMediaAssetReferences,
	getMediaAssets,
	type MediaAsset,
	type MediaAssetReference,
	updateMediaAsset,
	updateMediaAssetFields,
	updateMediaAssetMetadata,
	useCatalogAssets,
} from "@/domains/workspace/api/media";
import {
	getWorkspaceDocumentResources,
	getWorkspaceDocuments,
} from "@/domains/workspace/api/workspace";
import { useLibraryPreferencesStore } from "@/lib/stores/library-preferences";
import { AssetLibraryButton } from "./AssetLibraryButton";

vi.mock("@/components/AudioPlayer", () => ({
	AudioPlayer: ({ mimeType, src, title }: { mimeType?: string; src: string; title?: string }) => (
		<div
			data-testid="asset-audio-player"
			data-mime-type={mimeType}
			data-src={src}
			data-title={title}
		/>
	),
}));

vi.mock("@/components/VideoPlayer", () => ({
	VideoPlayer: ({
		mimeType,
		poster,
		showTitleInControls,
		src,
		title,
	}: {
		mimeType?: string;
		poster?: string;
		showTitleInControls?: boolean;
		src: string;
		title?: string;
	}) => (
		<div
			data-testid="asset-video-player"
			data-mime-type={mimeType}
			data-poster={poster}
			data-show-title-in-controls={String(showTitleInControls)}
			data-src={src}
			data-title={title}
		/>
	),
}));

class TestPointerEvent extends MouseEvent {
	pointerId: number;
	pointerType: string;

	constructor(type: string, params: PointerEventInit = {}) {
		super(type, params);
		this.pointerId = params.pointerId ?? 1;
		this.pointerType = params.pointerType ?? "mouse";
	}
}

if (typeof window !== "undefined" && typeof window.PointerEvent !== "function") {
	Object.defineProperty(window, "PointerEvent", {
		value: TestPointerEvent,
		configurable: true,
	});
	Object.defineProperty(globalThis, "PointerEvent", {
		value: TestPointerEvent,
		configurable: true,
	});
}

if (typeof HTMLElement !== "undefined") {
	if (typeof HTMLElement.prototype.hasPointerCapture !== "function") {
		Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
			value: () => false,
			configurable: true,
		});
	}
	if (typeof HTMLElement.prototype.setPointerCapture !== "function") {
		Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
			value: () => {},
			configurable: true,
		});
	}
	if (typeof HTMLElement.prototype.releasePointerCapture !== "function") {
		Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
			value: () => {},
			configurable: true,
		});
	}
	if (typeof HTMLElement.prototype.scrollIntoView !== "function") {
		Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
			value: () => {},
			configurable: true,
		});
	}
}

vi.mock("@/domains/workspace/api/media", () => ({
	deleteMediaAsset: vi.fn(),
	getMediaAssetReferences: vi.fn(),
	getMediaAssets: vi.fn(),
	mediaAssetReferencesPath: (assetId?: string | null, projectId?: string | null) => {
		const id = assetId?.trim();
		if (!id) return null;
		const scope = projectId?.trim();
		return scope
			? `/projects/${encodeURIComponent(scope)}/media-assets/${encodeURIComponent(id)}/references`
			: `/media-assets/${encodeURIComponent(id)}/references`;
	},
	mediaAssetsKey: "/media-assets",
	newCatalogOperationID: () => "op-test",
	scanMediaAssets: vi.fn(),
	updateMediaAsset: vi.fn(),
	updateMediaAssetFields: vi.fn(),
	updateMediaAssetMetadata: vi.fn(),
	uploadMediaAsset: vi.fn(),
	useCatalogAssets: vi.fn(),
}));

vi.mock("@/domains/workspace/api/project-assets", () => ({
	deleteProjectAsset: vi.fn(),
	updateProjectAsset: vi.fn(),
	uploadProjectAsset: vi.fn(),
}));

vi.mock("@/domains/workspace/api/workspace", () => ({
	getWorkspaceDocumentResources: vi.fn(),
	getWorkspaceDocuments: vi.fn(),
	workspaceDocumentResourcesKey: (projectId?: string | null) =>
		`/projects/${projectId ?? ""}/workspace/resources`,
	workspaceDocumentsKey: (projectId?: string | null) =>
		`/projects/${projectId ?? ""}/workspace/documents`,
}));

vi.mock("@/domains/generation/api/generation", () => ({
	deleteSelectedGenerationAsset: vi.fn(),
	getSelectedGenerationAssets: vi.fn(),
	selectedGenerationAssetsQueryKey: (projectId?: string | null) => [
		"/generation/selected-assets",
		projectId ?? "",
	],
}));

vi.mock("@/domains/projects/api/projects", () => ({
	getProjects: vi.fn(),
	projectsKey: "/projects",
}));

describe("AssetLibraryButton", () => {
	beforeEach(() => {
		vi.mocked(getProjects).mockResolvedValue({
			databasePath: "/tmp/db.sqlite",
			projects: [
				workspaceProject({ id: "project-a", name: "项目甲" }),
				workspaceProject({ id: "project-b", name: "项目乙" }),
			],
			workspaceDir: "/tmp",
		});
		vi.mocked(getWorkspaceDocuments).mockResolvedValue(workspaceDocuments());
		vi.mocked(getMediaAssetReferences).mockResolvedValue({ references: [] });
		vi.mocked(getWorkspaceDocumentResources).mockResolvedValue({
			projectId: "project-a",
			resources: [],
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
		cleanup();
	});

	it.each([
		[480, 640, "尺寸：480 x 640 px"],
		[0, 640, null],
		[480, undefined, null],
	])("shows only known asset dimensions %s x %s", async (width, height, dimensions) => {
		vi.mocked(getMediaAssets).mockResolvedValue({
			assets: [mediaAsset({ width, height })],
		});
		renderAssetLibraryButton("/");
		fireEvent.click(screen.getByRole("button", { name: "打开素材库" }));
		await screen.findByRole("dialog", { name: "全局素材库" });
		if (dimensions) expect(await screen.findByText(dimensions)).toBeTruthy();
		else expect(screen.queryByText(/^尺寸：/)).toBeNull();
	});

	it("opens the global asset library outside a project", async () => {
		vi.mocked(getMediaAssets).mockResolvedValue({
			assets: [mediaAsset({ filename: "global-still.png", id: "global-media" })],
		});

		renderAssetLibraryButton("/");

		fireEvent.click(screen.getByRole("button", { name: "打开素材库" }));

		expect(await screen.findByRole("dialog", { name: "全局素材库" })).toBeTruthy();
		expect((await screen.findAllByText("global-still.png")).length).toBeGreaterThan(0);
		expect(screen.queryByRole("combobox", { name: "资源记录" })).not.toBeInTheDocument();
		expect(getMediaAssets).toHaveBeenCalledWith({ projectId: undefined });
		expect(getWorkspaceDocuments).not.toHaveBeenCalled();
		expect(getSelectedGenerationAssets).not.toHaveBeenCalled();
	});

	it("opens the project asset library without project document uploads", async () => {
		vi.mocked(getMediaAssets).mockResolvedValue({
			assets: [
				mediaAsset({
					filename: "hero-media.png",
					id: "hero-media",
					relativePath: "library/2026-06-21/asset-hero-media.png",
					url: "/api/v1/media-assets/hero-media/content",
				}),
			],
		});
		vi.mocked(getSelectedGenerationAssets).mockResolvedValue({
			assets: [
				selectedAsset({
					resourceType: "character",
					taskId: "task-1",
					url: "/api/v1/media-assets/hero-media/content",
				}),
			],
		});

		renderAssetLibraryButton("/projects?projectId=project-a");

		fireEvent.click(screen.getByRole("button", { name: "打开素材库" }));

		expect(await screen.findByRole("dialog", { name: "项目素材库" })).toBeTruthy();
		expect((await screen.findAllByText("hero-media.png")).length).toBeGreaterThan(0);
		expect(screen.getByRole("combobox", { name: "资源记录" })).toBeTruthy();
		expect(screen.getAllByText("角色").length).toBeGreaterThan(0);
		expect(
			screen.getByPlaceholderText("搜索素材").parentElement?.parentElement?.className,
		).toContain("minmax(16rem,18rem)");
		const heroPreviewButton = screen.getByRole("button", { name: "预览 hero-media.png" });
		const heroCard = heroPreviewButton.closest("article");
		const heroThumbnail = heroPreviewButton.firstElementChild;
		const heroInfo = heroThumbnail?.nextElementSibling;
		expect(heroCard?.querySelectorAll('span[title="角色"]')).toHaveLength(1);
		expect(heroCard?.querySelectorAll('span[title="图片"]')).toHaveLength(1);
		expect(heroThumbnail?.querySelector('span[title="角色"]')).toBeTruthy();
		expect(heroThumbnail?.querySelector('span[title="图片"]')).toBeNull();
		expect(heroInfo?.querySelector('span[title="图片"]')).toBeTruthy();
		expect(heroCard?.querySelector('[title="library/2026-06-21/asset-hero-media.png"]')).toBeNull();
		expect(screen.queryByText("selected image")).not.toBeInTheDocument();
		expect(screen.queryByText("source-notes.txt")).not.toBeInTheDocument();
		expect(screen.queryByText("1 / 1")).not.toBeInTheDocument();
		expect(screen.queryByText("最近更新")).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "取消选入" })).not.toBeInTheDocument();
		expect(screen.getAllByRole("button", { name: /重命名/ })).toHaveLength(1);
		expect(getMediaAssets).toHaveBeenCalledWith({ projectId: "project-a" });
		expect(getWorkspaceDocuments).toHaveBeenCalledWith("project-a");
		expect(getSelectedGenerationAssets).toHaveBeenCalledWith("project-a");
		expect(deleteSelectedGenerationAsset).not.toHaveBeenCalled();
	});

	it("opens the file picker directly from the upload button", async () => {
		vi.mocked(getMediaAssets).mockResolvedValue({ assets: [] });
		vi.mocked(getSelectedGenerationAssets).mockResolvedValue({ assets: [] });

		renderAssetLibraryButton("/projects?projectId=project-a");
		fireEvent.click(screen.getByRole("button", { name: "打开素材库" }));

		await screen.findByRole("dialog", { name: "项目素材库" });
		const uploadInput = screen.getByLabelText("上传素材");
		const inputClick = vi.spyOn(uploadInput, "click");

		fireEvent.click(screen.getByRole("button", { name: "上传" }));

		expect(inputClick).toHaveBeenCalledOnce();
		expect(screen.queryByRole("button", { name: "上传素材" })).not.toBeInTheDocument();
	});

	it("labels project media by source document category before it is selected", async () => {
		vi.mocked(getWorkspaceDocuments).mockResolvedValue(
			workspaceDocuments({
				documents: [
					workspaceDocument({ category: "character", id: "doc-character", title: "角色设定" }),
					workspaceDocument({
						category: "reference",
						id: "doc-reference",
						title: "资料文档",
					}),
				],
			}),
		);
		vi.mocked(getMediaAssets).mockResolvedValue({
			assets: [
				mediaAsset({
					filename: "character-still.png",
					id: "character-media",
					sectionId: "doc-character:section-a",
					url: "/api/v1/media-assets/character-media/content",
				}),
				mediaAsset({
					filename: "reference-still.png",
					id: "reference-media",
					sectionId: "doc-reference:section-b",
					url: "/api/v1/media-assets/reference-media/content",
				}),
			],
		});
		vi.mocked(getSelectedGenerationAssets).mockResolvedValue({ assets: [] });

		renderAssetLibraryButton("/projects?projectId=project-a");

		fireEvent.click(screen.getByRole("button", { name: "打开素材库" }));

		expect((await screen.findAllByText("character-still.png")).length).toBeGreaterThan(0);
		expect((await screen.findAllByText("reference-still.png")).length).toBeGreaterThan(0);
		const characterPreviewButton = screen.getByRole("button", {
			name: "预览 character-still.png",
		});
		const sourcePreviewButton = screen.getByRole("button", { name: "预览 reference-still.png" });
		const characterCard = characterPreviewButton.closest("article");
		const sourceCard = sourcePreviewButton.closest("article");
		const characterThumbnail = characterPreviewButton.firstElementChild;
		const characterInfo = characterThumbnail?.nextElementSibling;
		const sourceThumbnail = sourcePreviewButton.firstElementChild;
		const sourceInfo = sourceThumbnail?.nextElementSibling;
		const characterBadge = characterCard?.querySelector('span[title="角色"]');
		const characterKindBadge = characterCard?.querySelector('span[title="图片"]');
		const sourceBadge = sourceCard?.querySelector('span[title="资料"]');
		const sourceKindBadge = sourceCard?.querySelector('span[title="图片"]');
		expect(characterCard?.querySelectorAll('span[title="角色"]')).toHaveLength(1);
		expect(characterCard?.querySelectorAll('span[title="图片"]')).toHaveLength(1);
		expect(sourceCard?.querySelectorAll('span[title="资料"]')).toHaveLength(1);
		expect(sourceCard?.querySelectorAll('span[title="图片"]')).toHaveLength(1);
		expect(characterThumbnail?.querySelector('span[title="角色"]')).toBeTruthy();
		expect(characterThumbnail?.querySelector('span[title="图片"]')).toBeNull();
		expect(characterInfo?.querySelector('span[title="图片"]')).toBeTruthy();
		expect(sourceThumbnail?.querySelector('span[title="资料"]')).toBeTruthy();
		expect(sourceThumbnail?.querySelector('span[title="图片"]')).toBeNull();
		expect(sourceInfo?.querySelector('span[title="图片"]')).toBeTruthy();
		expect(characterBadge).toBeTruthy();
		expect(characterBadge).toHaveClass("bg-fuchsia-50/95", "text-fuchsia-800");
		expect(characterKindBadge).toBeTruthy();
		expect(characterKindBadge).toHaveClass("bg-cyan-50/95", "text-cyan-800");
		expect(sourceBadge).toBeTruthy();
		expect(sourceBadge).toHaveClass("bg-stone-50/95", "text-stone-800");
		expect(sourceKindBadge).toBeTruthy();
		expect(sourceKindBadge).toHaveClass("bg-cyan-50/95", "text-cyan-800");
		expect(getSelectedGenerationAssets).toHaveBeenCalledWith("project-a");
	});

	it("shows poster images for video media assets", async () => {
		vi.mocked(getMediaAssets).mockResolvedValue({
			assets: [
				mediaAsset({
					filename: "scene-video.mp4",
					id: "video-media",
					kind: "video",
					mimeType: "video/mp4",
					posterUrl: "/api/v1/media-assets/video-media/poster",
					url: "/api/v1/media-assets/video-media/content",
				}),
			],
		});

		renderAssetLibraryButton("/");

		fireEvent.click(screen.getByRole("button", { name: "打开素材库" }));

		expect((await screen.findAllByText("scene-video.mp4")).length).toBeGreaterThan(0);
		const videoBadge = document.body.querySelector('span[title="视频"]');
		expect(videoBadge).toBeTruthy();
		expect(videoBadge).toHaveClass("bg-violet-50/95", "text-violet-800");
		expect(
			document.body.querySelector('img[src="/api/v1/media-assets/video-media/poster"]'),
		).toBeTruthy();
		expect(screen.getByTestId("asset-video-player")).toHaveAttribute(
			"data-src",
			"/api/v1/media-assets/video-media/content",
		);
		expect(screen.getByTestId("asset-video-player")).toHaveAttribute(
			"data-poster",
			"/api/v1/media-assets/video-media/poster",
		);
		expect(screen.getByTestId("asset-video-player")).toHaveAttribute(
			"data-show-title-in-controls",
			"false",
		);
	});

	it("uses the shared audio player for audio media previews", async () => {
		vi.mocked(getMediaAssets).mockResolvedValue({
			assets: [
				mediaAsset({
					filename: "voiceover.mp3",
					id: "audio-media",
					kind: "audio",
					mimeType: "audio/mpeg",
					sizeBytes: 13_824,
					url: "/api/v1/media-assets/audio-media/content",
				}),
			],
		});

		renderAssetLibraryButton("/");

		fireEvent.click(screen.getByRole("button", { name: "打开素材库" }));

		expect((await screen.findAllByText("voiceover.mp3")).length).toBeGreaterThan(0);
		const audioBadge = document.body.querySelector('span[title="音频"]');
		expect(audioBadge).toBeTruthy();
		expect(audioBadge).toHaveClass("bg-rose-50/95", "text-rose-800");
		expect(screen.getByTestId("asset-audio-player")).toHaveAttribute(
			"data-src",
			"/api/v1/media-assets/audio-media/content",
		);
		expect(screen.getByTestId("asset-audio-player")).toHaveAttribute(
			"data-mime-type",
			"audio/mpeg",
		);
	});

	it("switches the library to another project from the project filter", async () => {
		vi.mocked(getMediaAssets).mockImplementation(async (filters) => {
			const projectId = filters?.projectId;
			return {
				assets: [
					mediaAsset({
						filename: projectId ? `${projectId}-media.png` : "global-media.png",
						id: projectId ? `${projectId}-media` : "global-media",
						projectId,
						url: projectId
							? `/api/v1/media-assets/${projectId}-media/content`
							: "/api/v1/media-assets/global-media/content",
					}),
				],
			};
		});
		vi.mocked(getSelectedGenerationAssets).mockResolvedValue({ assets: [] });

		renderAssetLibraryButton("/");

		fireEvent.click(screen.getByRole("button", { name: "打开素材库" }));

		expect(await screen.findByRole("dialog", { name: "全局素材库" })).toBeTruthy();
		expect((await screen.findAllByText("global-media.png")).length).toBeGreaterThan(0);

		await waitFor(() => expect(getProjects).toHaveBeenCalled());
		fireEvent.pointerDown(screen.getByRole("combobox", { name: "项目" }), {
			button: 0,
			ctrlKey: false,
			pageX: 0,
			pageY: 0,
			pointerId: 1,
			pointerType: "mouse",
		});
		fireEvent.click(await screen.findByRole("option", { name: "项目乙" }));

		expect(await screen.findByRole("dialog", { name: "项目素材库" })).toBeTruthy();
		expect((await screen.findAllByText("project-b-media.png")).length).toBeGreaterThan(0);
		expect(screen.queryByText("project-b-file.txt")).not.toBeInTheDocument();
		expect(getMediaAssets).toHaveBeenCalledWith({ projectId: "project-b" });
		expect(getWorkspaceDocuments).toHaveBeenCalledWith("project-b");
		expect(getSelectedGenerationAssets).toHaveBeenCalledWith("project-b");
	});

	it("keeps the tail of long filenames visible via middle truncation", async () => {
		const longName = "林墨（高三·契约小悟空后）2D动漫定稿候选B.png";
		vi.mocked(getMediaAssets).mockResolvedValue({
			assets: [mediaAsset({ filename: longName, id: "long-name" })],
		});

		renderAssetLibraryButton("/");

		fireEvent.click(screen.getByRole("button", { name: "打开素材库" }));

		await screen.findByRole("dialog", { name: "全局素材库" });
		await waitFor(() => {
			expect(document.body.querySelector(`span[title="${longName}"]`)).toBeTruthy();
		});
		const truncated = document.body.querySelector(`span[title="${longName}"]`);
		expect(truncated?.textContent).toBe(longName);
		expect(truncated?.children).toHaveLength(2);
		expect(truncated?.children[1].textContent).toBe("稿候选B.png");
	});

	it("shows the filter dimension as a prefix inside each select", async () => {
		vi.mocked(getMediaAssets).mockResolvedValue({ assets: [mediaAsset()] });

		renderAssetLibraryButton("/");

		fireEvent.click(screen.getByRole("button", { name: "打开素材库" }));

		await screen.findByRole("dialog", { name: "全局素材库" });
		expect(screen.getByRole("combobox", { name: "类型" })).toHaveTextContent("类型:");
		expect(screen.getByRole("combobox", { name: "类型" })).toHaveTextContent("全部");
		expect(screen.getByRole("combobox", { name: "项目" })).toHaveTextContent("项目:");
	});

	it("renames a media asset from the preview panel", async () => {
		vi.mocked(getMediaAssets).mockResolvedValue({
			assets: [mediaAsset({ filename: "old-name.png", id: "media-a" })],
		});
		vi.mocked(updateMediaAsset).mockResolvedValue(
			mediaAsset({ filename: "new-name.png", id: "media-a" }),
		);

		renderAssetLibraryButton("/");

		fireEvent.click(screen.getByRole("button", { name: "打开素材库" }));

		expect((await screen.findAllByText("old-name.png")).length).toBeGreaterThan(0);
		fireEvent.click(screen.getByRole("button", { name: "重命名" }));
		const input = screen.getByRole("textbox", { name: "重命名素材" });
		fireEvent.change(input, { target: { value: "new-name.png" } });
		fireEvent.keyDown(input, { key: "Enter" });

		await waitFor(() =>
			expect(updateMediaAsset).toHaveBeenCalledWith("media-a", "new-name.png", undefined),
		);
	});

	it("saves metadata through the asset's actual scope and resets drafts on selection", async () => {
		const asset = mediaAsset({ id: "media-a", filename: "global.png", note: "原备注" });
		vi.mocked(getMediaAssets).mockResolvedValue({
			assets: [asset, mediaAsset({ id: "media-b", filename: "other.png", note: "另一备注" })],
		});
		vi.mocked(getSelectedGenerationAssets).mockResolvedValue({ assets: [] });
		vi.mocked(updateMediaAssetMetadata).mockResolvedValue(asset);
		renderAssetLibraryButton("/projects?projectId=project-a");
		fireEvent.click(screen.getByRole("button", { name: "打开素材库" }));
		await screen.findByRole("dialog", { name: "项目素材库" });
		fireEvent.click(await screen.findByRole("button", { name: "预览 global.png" }));
		fireEvent.click(screen.getByRole("button", { name: "编辑元数据" }));
		fireEvent.change(screen.getByLabelText("备注"), { target: { value: "新备注" } });
		fireEvent.click(screen.getByRole("button", { name: "保存元数据" }));
		await waitFor(() =>
			expect(updateMediaAssetMetadata).toHaveBeenCalledWith(
				"media-a",
				{ tags: [], note: "新备注", rating: 0 },
				undefined,
			),
		);
		await screen.findByRole("button", { name: "编辑元数据" });
		fireEvent.click(screen.getByRole("button", { name: "编辑元数据" }));
		fireEvent.change(screen.getByLabelText("备注"), { target: { value: "丢弃草稿" } });
		fireEvent.click(screen.getByRole("button", { name: "预览 other.png" }));
		fireEvent.click(screen.getByRole("button", { name: "编辑元数据" }));
		expect(screen.getByLabelText("备注")).toHaveValue("另一备注");
		fireEvent.keyDown(screen.getByLabelText("备注"), { key: "Escape" });
		expect(screen.getByRole("dialog", { name: "项目素材库" })).toBeInTheDocument();
		expect(screen.queryByRole("form", { name: "编辑素材元数据" })).not.toBeInTheDocument();
	});

	it("toggles a physical asset favorite through its owner scope", async () => {
		const asset = mediaAsset({ id: "media-a", filename: "favorite.png", projectId: "project-a" });
		vi.mocked(getMediaAssets).mockResolvedValue({ assets: [asset] });
		vi.mocked(getSelectedGenerationAssets).mockResolvedValue({ assets: [] });
		vi.mocked(updateMediaAssetFields).mockResolvedValue({ ...asset, favorite: true });
		renderAssetLibraryButton("/projects?projectId=project-a");
		fireEvent.click(screen.getByRole("button", { name: "打开素材库" }));
		await screen.findByRole("dialog", { name: "项目素材库" });
		fireEvent.click(await screen.findByRole("button", { name: "预览 favorite.png" }));
		fireEvent.click(screen.getByRole("button", { name: "收藏素材" }));
		await waitFor(() =>
			expect(updateMediaAssetFields).toHaveBeenCalledWith(
				"media-a",
				{ favorite: true },
				"project-a",
			),
		);
	});

	it("opens the use-in-creation dialog for the previewed asset", async () => {
		const asset = mediaAsset({ id: "media-a", filename: "use.png", projectId: "project-a" });
		vi.mocked(getMediaAssets).mockResolvedValue({ assets: [asset] });
		vi.mocked(getSelectedGenerationAssets).mockResolvedValue({ assets: [] });
		vi.mocked(useCatalogAssets).mockResolvedValue({
			items: [{ sourceId: "media-a", assetId: "media-a", added: false }],
		});

		renderAssetLibraryButton("/projects?projectId=project-a");
		fireEvent.click(screen.getByRole("button", { name: "打开素材库" }));
		await screen.findByRole("dialog", { name: "项目素材库" });
		fireEvent.click(await screen.findByRole("button", { name: "预览 use.png" }));
		fireEvent.click(screen.getByRole("button", { name: "用于创作" }));

		const dialog = await screen.findByRole("alertdialog", { name: "用于创作" });
		fireEvent.click(within(dialog).getByRole("button", { name: "用于创作" }));

		await waitFor(() =>
			expect(useCatalogAssets).toHaveBeenCalledWith({
				operationId: "op-test",
				sourceProjectId: "project-a",
				projectId: "project-a",
				target: undefined,
				assetIds: ["media-a"],
			}),
		);
		await waitFor(() =>
			expect(screen.queryByRole("alertdialog", { name: "用于创作" })).not.toBeInTheDocument(),
		);
	});

	it("remembers the grid scroll offset when the library reopens", async () => {
		vi.mocked(getMediaAssets).mockResolvedValue({
			assets: [mediaAsset({ filename: "scroll.png", id: "scroll-media" })],
		});

		renderAssetLibraryButton("/");
		fireEvent.click(screen.getByRole("button", { name: "打开素材库" }));
		await screen.findByRole("dialog", { name: "全局素材库" });

		const items = document.querySelector("[data-library-items]");
		expect(items).not.toBeNull();
		if (!items) return;
		items.scrollTop = 320;
		fireEvent.scroll(items);
		await waitFor(() =>
			expect(useLibraryPreferencesStore.getState().scrollPositions["ready|global|root"]).toBe(320),
		);

		cleanup();
		renderAssetLibraryButton("/");
		fireEvent.click(screen.getByRole("button", { name: "打开素材库" }));
		await screen.findByRole("dialog", { name: "全局素材库" });

		const reopened = document.querySelector("[data-library-items]");
		expect(reopened?.scrollTop).toBe(320);
		useLibraryPreferencesStore.getState().setScrollPosition("ready|global|root", 0);
	});

	it("copies the asset path from the preview panel", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(window.navigator, "clipboard", {
			configurable: true,
			value: { writeText },
		});
		vi.mocked(getMediaAssets).mockResolvedValue({
			assets: [
				mediaAsset({
					downloadPath: "/tmp/library/2026-06-21/asset-media-a.png",
					filename: "hero.png",
					id: "media-a",
					relativePath: "library/2026-06-21/asset-media-a.png",
				}),
			],
		});

		renderAssetLibraryButton("/");

		fireEvent.click(screen.getByRole("button", { name: "打开素材库" }));

		expect((await screen.findAllByText("hero.png")).length).toBeGreaterThan(0);
		fireEvent.click(screen.getByRole("button", { name: "复制路径" }));
		await waitFor(() =>
			expect(writeText).toHaveBeenCalledWith("/tmp/library/2026-06-21/asset-media-a.png"),
		);
		expect(screen.queryByRole("button", { name: "在文件夹中显示" })).not.toBeInTheDocument();
	});

	it("moves the previewed asset with arrow keys", async () => {
		vi.mocked(getMediaAssets).mockResolvedValue({
			assets: [
				mediaAsset({ filename: "first.png", id: "media-a", updatedAt: "2026-06-02T09:00:00Z" }),
				mediaAsset({ filename: "second.png", id: "media-b", updatedAt: "2026-06-01T09:00:00Z" }),
			],
		});

		renderAssetLibraryButton("/");

		fireEvent.click(screen.getByRole("button", { name: "打开素材库" }));

		const dialog = await screen.findByRole("dialog", { name: "全局素材库" });
		expect((await screen.findAllByText("first.png")).length).toBeGreaterThan(0);

		fireEvent.keyDown(dialog, { key: "ArrowRight" });
		await waitFor(() => {
			expect(document.body.querySelector('[data-asset-key="media:media-b"]')).toHaveClass(
				"border-primary",
			);
		});

		fireEvent.keyDown(dialog, { key: "ArrowLeft" });
		await waitFor(() => {
			expect(document.body.querySelector('[data-asset-key="media:media-a"]')).toHaveClass(
				"border-primary",
			);
		});
	});

	it("lists the projects that selected the previewed media asset", async () => {
		vi.mocked(getMediaAssets).mockResolvedValue({
			assets: [mediaAsset({ filename: "hero.png", id: "media-a", projectId: "project-a" })],
		});

		vi.mocked(getMediaAssetReferences).mockResolvedValue({
			references: [
				reference({
					projectId: "project-b",
					projectName: "项目乙",
					resourceTitle: "场景",
					resourceType: "scene",
				}),
				reference({
					projectId: "project-a",
					projectName: "项目甲",
					resourceTitle: "主角",
					resourceType: "character",
				}),
			],
		});

		renderAssetLibraryButton("/");
		fireEvent.click(screen.getByRole("button", { name: "打开素材库" }));
		await screen.findByRole("dialog", { name: "全局素材库" });
		fireEvent.click(await screen.findByRole("button", { name: "预览 hero.png" }));

		expect(await screen.findByText("用途（2）")).toBeTruthy();
		const uses = screen.getByRole("list");
		expect(uses).toHaveTextContent("主角 · 已选资源 · 项目甲");
		expect(uses).toHaveTextContent("场景 · 已选资源 · 项目乙");
		expect(getMediaAssetReferences).toHaveBeenCalledWith("media-a", "project-a");
	});

	it("labels a document-body reference with the document source marker", async () => {
		vi.mocked(getMediaAssets).mockResolvedValue({
			assets: [mediaAsset({ filename: "hero.png", id: "media-a", projectId: "project-a" })],
		});

		vi.mocked(getMediaAssetReferences).mockResolvedValue({
			references: [
				reference({
					id: "selected-a",
					kind: "selected-resource",
					projectId: "project-a",
					projectName: "项目甲",
					resourceTitle: "主角",
					resourceType: "character",
					source: "selection",
				}),
				reference({
					id: "document:project-b:characters",
					kind: "document-binding",
					projectId: "project-b",
					projectName: "项目乙",
					resourceTitle: "角色设定",
					resourceType: "character",
					source: "document",
				}),
			],
		});

		renderAssetLibraryButton("/");
		fireEvent.click(screen.getByRole("button", { name: "打开素材库" }));
		await screen.findByRole("dialog", { name: "全局素材库" });
		fireEvent.click(await screen.findByRole("button", { name: "预览 hero.png" }));

		expect(await screen.findByText("用途（2）")).toBeTruthy();
		const uses = screen.getByRole("list");
		expect(uses).toHaveTextContent("角色设定 · 文档使用 · 项目乙");
		expect(uses).toHaveTextContent("主角 · 已选资源 · 项目甲");
		expect(getMediaAssetReferences).toHaveBeenCalledWith("media-a", "project-a");
	});

	it("links live document usages and marks removed usages", async () => {
		vi.mocked(getMediaAssets).mockResolvedValue({
			assets: [mediaAsset({ filename: "hero.png", id: "media-a", projectId: "project-a" })],
		});
		vi.mocked(getMediaAssetReferences).mockResolvedValue({
			references: [
				reference({
					documentId: "characters",
					id: "document:project-b:characters",
					kind: "document-binding",
					label: "角色设定",
					projectId: "project-b",
					projectName: "项目乙",
					resourceTitle: "角色设定",
					source: "document",
				}),
				reference({ id: "selected-removed", removed: true }),
			],
		});

		renderAssetLibraryButton("/");
		fireEvent.click(screen.getByRole("button", { name: "打开素材库" }));
		await screen.findByRole("dialog", { name: "全局素材库" });
		fireEvent.click(await screen.findByRole("button", { name: "预览 hero.png" }));

		const link = await screen.findByRole("link", { name: "角色设定" });
		expect(link).toHaveAttribute("href", "/projects?projectId=project-b&documentId=characters");
		expect(screen.getByRole("list")).toHaveTextContent("主角 · 已选资源 · 项目甲 · 已移除的用途");
		expect(screen.queryByRole("link", { name: "主角" })).not.toBeInTheDocument();
	});

	it("reports the empty reference state for an unselected media asset", async () => {
		vi.mocked(getMediaAssets).mockResolvedValue({
			assets: [mediaAsset({ filename: "lonely.png", id: "media-a" })],
		});

		renderAssetLibraryButton("/");
		fireEvent.click(screen.getByRole("button", { name: "打开素材库" }));
		await screen.findByRole("dialog", { name: "全局素材库" });
		fireEvent.click(await screen.findByRole("button", { name: "预览 lonely.png" }));

		expect(await screen.findByText("尚未用于项目")).toBeTruthy();
	});

	it("surfaces the reference request failure instead of a fake success", async () => {
		vi.mocked(getMediaAssets).mockResolvedValue({
			assets: [mediaAsset({ filename: "broken.png", id: "media-a" })],
		});
		vi.mocked(getMediaAssetReferences).mockRejectedValue(new Error("读取引用失败。"));

		renderAssetLibraryButton("/");
		fireEvent.click(screen.getByRole("button", { name: "打开素材库" }));
		await screen.findByRole("dialog", { name: "全局素材库" });
		fireEvent.click(await screen.findByRole("button", { name: "预览 broken.png" }));

		expect(await screen.findByText("读取引用失败。")).toBeTruthy();
		expect(screen.queryByText("尚未用于项目")).not.toBeInTheDocument();
	});
});

const renderAssetLibraryButton = (initialEntry: string) => {
	window.history.pushState(null, "", initialEntry);
	return render(
		<MemoryRouter initialEntries={[initialEntry]}>
			<SWRConfig value={{ provider: () => new Map() }}>
				<AssetLibraryButton />
			</SWRConfig>
		</MemoryRouter>,
	);
};

const workspaceDocuments = (
	overrides: Partial<Awaited<ReturnType<typeof getWorkspaceDocuments>>> = {},
): Awaited<ReturnType<typeof getWorkspaceDocuments>> => ({
	assets: [],
	documents: [],
	folders: [],
	projectId: "project-a",
	workspaceDir: "/tmp/project-a",
	...overrides,
});

const workspaceDocument = (
	overrides: Partial<Awaited<ReturnType<typeof getWorkspaceDocuments>>["documents"][number]> = {},
): Awaited<ReturnType<typeof getWorkspaceDocuments>>["documents"][number] => ({
	category: "screenplay",
	comments: [],
	content: "",
	id: "doc-a",
	isDirty: false,
	parentId: null,
	sortOrder: 0,
	title: "文档",
	updatedAt: "2026-06-01T09:00:00Z",
	version: 1,
	workbenchDraft: null,
	...overrides,
});

const mediaAsset = (overrides: Partial<MediaAsset> = {}): MediaAsset => ({
	createdAt: "2026-06-01T08:00:00Z",
	filename: "media.png",
	id: "media-a",
	kind: "image",
	mimeType: "image/png",
	sizeBytes: 1024,
	updatedAt: "2026-06-01T09:00:00Z",
	url: "/api/v1/media-assets/media-a/content",
	...overrides,
});

const selectedAsset = (
	overrides: Partial<SelectedGenerationAsset> = {},
): SelectedGenerationAsset => ({
	assetIndex: 0,
	createdAt: "2026-06-01T10:00:00Z",
	id: "selected-a",
	kind: "image",
	mimeType: "image/png",
	resourceType: "character",
	taskId: "task-a",
	title: "selected image",
	updatedAt: "2026-06-01T10:30:00Z",
	url: "/api/v1/media-assets/media-a/content",
	...overrides,
});

const workspaceProject = (overrides: { id: string; name: string }) => ({
	archivedAt: "",
	createdAt: "2026-06-01T06:00:00Z",
	description: "",
	documentCount: 0,
	id: overrides.id,
	name: overrides.name,
	originalProjectDir: "",
	projectDir: `/tmp/${overrides.id}`,
	relativeDir: overrides.id,
	status: "active" as const,
	trashedAt: "",
	updatedAt: "2026-06-01T06:30:00Z",
});

const reference = (overrides: Partial<MediaAssetReference> = {}): MediaAssetReference => ({
	createdAt: "2026-06-01T10:00:00Z",
	id: "selected-a",
	kind: "selected-resource",
	projectId: "project-a",
	projectName: "项目甲",
	resourceTitle: "主角",
	resourceType: "character",
	source: "selection",
	sortOrder: 0,
	updatedAt: "2026-06-01T10:30:00Z",
	...overrides,
});
