import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDesktopCacheStatistics } from "@/shared/desktop/actions";
import { isDesktopRuntime } from "@/shared/desktop/runtime";
import { cleanupPosterCache, getStorageSnapshot, previewPosterCacheCleanup } from "../api/storage";
import { StoragePanel } from "./StoragePanel";

vi.mock("@/shared/desktop/actions", () => ({ getDesktopCacheStatistics: vi.fn() }));
vi.mock("@/shared/desktop/runtime", () => ({ isDesktopRuntime: vi.fn() }));
vi.mock("../api/storage", () => ({
	getStorageSnapshot: vi.fn(),
	previewPosterCacheCleanup: vi.fn(),
	cleanupPosterCache: vi.fn(),
}));

const statistics = {
	categories: [
		{ id: "projects", bytes: 2048, fileCount: 2, skippedCount: 0, unknownCount: 0, errorCount: 0 },
		{
			id: "poster-cache",
			bytes: 1024,
			fileCount: 1,
			skippedCount: 1,
			unknownCount: 0,
			errorCount: 0,
		},
	],
	bytes: 3072,
	fileCount: 3,
	skippedCount: 1,
	unknownCount: 0,
	errorCount: 0,
	measuredAt: "2026-10-16T00:00:00.000Z",
};
const candidate = {
	id: "opaque-id",
	name: "preview.poster.jpg",
	bytes: 1024,
	active: false,
	categoryId: "project-1",
};
const preview = { candidates: [candidate], bytes: 1024, measuredAt: "2026-10-16T00:00:00.000Z" };
const mount = () =>
	render(
		<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
			<StoragePanel />
		</SWRConfig>,
	);

describe("StoragePanel", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.mocked(isDesktopRuntime).mockReturnValue(true);
		vi.mocked(getDesktopCacheStatistics).mockResolvedValue({
			cacheBytes: 2048,
			profilePath: "E:/isolated/profile",
			measuredAt: "2026-10-16T00:00:00.000Z",
		});
		vi.mocked(getStorageSnapshot).mockResolvedValue(statistics);
		vi.mocked(previewPosterCacheCleanup).mockResolvedValue(preview);
		vi.mocked(cleanupPosterCache).mockResolvedValue({
			outcomes: [{ ...candidate, status: "removed" }],
			removed: 1,
			skipped: 0,
			failed: 0,
			bytes: 1024,
		});
		vi.stubGlobal(
			"confirm",
			vi.fn(() => true),
		);
	});
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it("shows storage categories and confirms the exact preview before cleanup", async () => {
		mount();
		await screen.findByText("已登记项目");
		expect(screen.getByText("3.0 KiB (3,072 字节)")).toBeInTheDocument();
		expect(previewPosterCacheCleanup).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "预览清理" }));
		await screen.findByText("preview.poster.jpg");
		fireEvent.click(screen.getByRole("button", { name: "确认清理" }));
		expect(window.confirm).toHaveBeenCalledWith(
			expect.stringContaining("1 个生成的海报缓存文件，共 1,024 字节"),
		);
		await screen.findByText(/已删除 1 个文件/);
		expect(cleanupPosterCache).toHaveBeenCalledWith([candidate.id]);
	});

	it("keeps candidates after cancel and reports partial per-file results", async () => {
		vi.mocked(window.confirm).mockReturnValue(false);
		mount();
		fireEvent.click(screen.getByRole("button", { name: "预览清理" }));
		await screen.findByText("preview.poster.jpg");
		fireEvent.click(screen.getByRole("button", { name: "确认清理" }));
		expect(cleanupPosterCache).not.toHaveBeenCalled();
		expect(screen.getByText("preview.poster.jpg")).toBeInTheDocument();

		vi.mocked(window.confirm).mockReturnValue(true);
		vi.mocked(cleanupPosterCache).mockResolvedValueOnce({
			outcomes: [{ ...candidate, status: "skipped", reason: "poster is in use" }],
			removed: 0,
			skipped: 1,
			failed: 0,
			bytes: 0,
		});
		fireEvent.click(screen.getByRole("button", { name: "确认清理" }));
		expect(await screen.findByText(/已删除 0 个文件/)).toBeInTheDocument();
		expect(screen.getByText(/已保留（poster is in use）/)).toBeInTheDocument();
	});

	it("shows retryable scan and preview errors without inventing zero usage", async () => {
		vi.mocked(getStorageSnapshot).mockRejectedValueOnce(new Error("统计接口失败"));
		vi.mocked(previewPosterCacheCleanup).mockRejectedValueOnce(new Error("缓存目录不可读"));
		mount();
		await waitFor(() => expect(screen.getByText(/统计接口失败/)).toBeInTheDocument());
		expect(previewPosterCacheCleanup).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "预览清理" }));
		await waitFor(() => expect(screen.getByText(/缓存目录不可读/)).toBeInTheDocument());
		expect(screen.queryByText("0 B (0 字节)")).not.toBeInTheDocument();
		vi.mocked(getStorageSnapshot).mockResolvedValueOnce(statistics);
		vi.mocked(previewPosterCacheCleanup).mockResolvedValueOnce(preview);
		fireEvent.click(screen.getByRole("button", { name: "重试" }));
		fireEvent.click(screen.getByRole("button", { name: "重试预览" }));
		await screen.findByText("已登记项目");
		await screen.findByText("preview.poster.jpg");
	});

	it("does not expose filesystem preview or cleanup in browser mode", async () => {
		vi.mocked(isDesktopRuntime).mockReturnValue(false);
		mount();
		await screen.findByText("已登记项目");
		expect(screen.getByText("文件清理仅在桌面客户端提供。")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "预览清理" })).not.toBeInTheDocument();
		expect(previewPosterCacheCleanup).not.toHaveBeenCalled();
		expect(cleanupPosterCache).not.toHaveBeenCalled();
	});
});
