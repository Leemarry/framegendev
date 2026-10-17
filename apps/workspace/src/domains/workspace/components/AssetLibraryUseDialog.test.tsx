import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getProjects } from "@/domains/projects/api/projects";
import {
	type MediaAsset,
	newCatalogOperationID,
	useCatalogAssets,
} from "@/domains/workspace/api/media";
import { getWorkspaceDocumentResources } from "@/domains/workspace/api/workspace";
import { AssetLibraryUseDialog } from "./AssetLibraryUseDialog";

vi.mock("@/domains/workspace/api/media", () => ({
	newCatalogOperationID: vi.fn(() => "op-test"),
	useCatalogAssets: vi.fn(),
}));

vi.mock("@/domains/projects/api/projects", () => ({
	getProjects: vi.fn(),
	projectsKey: "/projects",
}));

vi.mock("@/domains/workspace/api/workspace", () => ({
	getWorkspaceDocumentResources: vi.fn(),
	workspaceDocumentResourcesKey: (projectId?: string | null) =>
		`/projects/${projectId ?? ""}/workspace/resources`,
}));

const mediaAsset = (overrides: Partial<MediaAsset> = {}): MediaAsset => ({
	id: "asset-1",
	kind: "image",
	filename: "封面.png",
	mimeType: "image/png",
	sizeBytes: 1024,
	url: "/api/v1/media-assets/asset-1/content",
	createdAt: "2026-01-01T00:00:00Z",
	updatedAt: "2026-01-01T00:00:00Z",
	...overrides,
});

const renderDialog = (assets: MediaAsset[]) => {
	const onClose = vi.fn();
	const onChanged = vi.fn();
	render(
		<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
			<AssetLibraryUseDialog assets={assets} onClose={onClose} onChanged={onChanged} />
		</SWRConfig>,
	);
	return { onClose, onChanged };
};

describe("AssetLibraryUseDialog", () => {
	beforeEach(() => {
		vi.mocked(getProjects).mockResolvedValue({
			databasePath: "/tmp/db.sqlite",
			projects: [
				{
					id: "project-a",
					name: "项目甲",
					description: "",
					relativeDir: "a",
					documentCount: 0,
					createdAt: "",
					updatedAt: "",
				},
				{
					id: "project-b",
					name: "项目乙",
					description: "",
					relativeDir: "b",
					documentCount: 0,
					createdAt: "",
					updatedAt: "",
				},
			],
			workspaceDir: "/tmp",
		});
		vi.mocked(getWorkspaceDocumentResources).mockResolvedValue({
			projectId: "project-a",
			resources: [],
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
		cleanup();
	});

	it("saves a project asset into its own project and closes on success", async () => {
		vi.mocked(useCatalogAssets).mockResolvedValue({
			items: [{ sourceId: "asset-1", assetId: "asset-1", added: false }],
		});
		const { onClose, onChanged } = renderDialog([mediaAsset({ projectId: "project-a" })]);

		expect(screen.getByText("用于创作", { selector: "h2" })).toBeInTheDocument();
		expect(
			screen.getByText("将 1 项素材保存到目标项目，可加入章节候选列表。已有选用结果保持不变。"),
		).toBeInTheDocument();

		const projectSelect = await screen.findByLabelText("选择目标项目");
		await waitFor(() => expect(projectSelect).toHaveValue("project-a"));
		// A project-scoped asset keeps its own project as the locked target.
		expect(projectSelect).toBeDisabled();

		fireEvent.click(screen.getByRole("button", { name: "用于创作" }));

		await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
		expect(onChanged).toHaveBeenCalledTimes(1);
		expect(useCatalogAssets).toHaveBeenCalledWith({
			operationId: "op-test",
			sourceProjectId: "project-a",
			projectId: "project-a",
			target: undefined,
			assetIds: ["asset-1"],
		});
	});

	it("keeps per-item failures visible and retries with the same operation id", async () => {
		vi.mocked(useCatalogAssets)
			.mockResolvedValueOnce({
				items: [{ sourceId: "asset-1", added: false, error: "素材不属于来源项目" }],
			})
			.mockResolvedValueOnce({
				items: [{ sourceId: "asset-1", assetId: "asset-9", added: true }],
			});
		const { onClose } = renderDialog([mediaAsset({ projectId: "project-a" })]);

		fireEvent.click(await screen.findByRole("button", { name: "用于创作" }));

		const status = await screen.findByRole("status");
		expect(status).toHaveTextContent("封面.png · 素材不属于来源项目");
		expect(onClose).not.toHaveBeenCalled();

		fireEvent.click(screen.getByRole("button", { name: "重试" }));

		await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
		expect(useCatalogAssets).toHaveBeenCalledTimes(2);
		const [first, second] = vi.mocked(useCatalogAssets).mock.calls;
		expect(second[0].operationId).toBe(first[0].operationId);
		expect(second[0].assetIds).toEqual(first[0].assetIds);
	});

	it("reports a request failure and retries it", async () => {
		vi.mocked(useCatalogAssets)
			.mockRejectedValueOnce(new Error("网络中断"))
			.mockResolvedValueOnce({ items: [{ sourceId: "asset-1", added: false }] });
		const { onClose } = renderDialog([mediaAsset({ projectId: "project-a" })]);

		fireEvent.click(await screen.findByRole("button", { name: "用于创作" }));

		expect(await screen.findByRole("alert")).toHaveTextContent("网络中断");
		expect(onClose).not.toHaveBeenCalled();

		fireEvent.click(screen.getByRole("button", { name: "重试" }));
		await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
	});

	it("saves other file types without offering a section binding", async () => {
		vi.mocked(useCatalogAssets).mockResolvedValue({
			items: [{ sourceId: "asset-audio", added: false }],
		});
		renderDialog([
			mediaAsset({
				id: "asset-audio",
				kind: "audio",
				filename: "旁白.mp3",
				mimeType: "audio/mpeg",
			}),
		]);

		expect(
			screen.getByText("当前选择包含其他文件类型，将仅保存到项目素材库。"),
		).toBeInTheDocument();
		expect(screen.queryByLabelText("关联文档 / 分镜（可选）")).not.toBeInTheDocument();
		expect(screen.getByRole("combobox", { name: "选择目标项目" })).toBeInTheDocument();
		expect(newCatalogOperationID).not.toHaveBeenCalled();
	});
});
