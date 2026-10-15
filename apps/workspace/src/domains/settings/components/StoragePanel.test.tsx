import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDesktopCacheStatistics } from "@/shared/desktop/actions";
import { isDesktopRuntime } from "@/shared/desktop/runtime";
import { StoragePanel } from "./StoragePanel";

vi.mock("@/shared/desktop/actions", () => ({ getDesktopCacheStatistics: vi.fn() }));
vi.mock("@/shared/desktop/runtime", () => ({ isDesktopRuntime: vi.fn() }));
const statistics = {
	cacheBytes: 2048,
	profilePath: "E:/isolated/profile",
	measuredAt: "2026-10-16T00:00:00.000Z",
};
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
		vi.mocked(getDesktopCacheStatistics).mockResolvedValue(statistics);
	});
	afterEach(cleanup);
	it("shows native readings and retains a stale reading after refresh failure, then recovers", async () => {
		mount();
		await screen.findByText("2.0 KiB");
		expect(screen.getByText(statistics.profilePath)).toBeInTheDocument();
		vi.mocked(getDesktopCacheStatistics).mockRejectedValueOnce(new Error("缓存暂不可读"));
		fireEvent.click(screen.getByRole("button", { name: "刷新" }));
		expect(await screen.findByRole("alert")).toHaveTextContent("上次读数");
		expect(screen.getByText("2.0 KiB")).toBeInTheDocument();
		vi.mocked(getDesktopCacheStatistics).mockResolvedValue({ ...statistics, cacheBytes: 0 });
		fireEvent.click(screen.getByRole("button", { name: "重试" }));
		await screen.findByText("0 B");
		await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
	});
	it("does not fabricate a zero reading on initial failure and prevents overlapping refreshes", async () => {
		vi.mocked(getDesktopCacheStatistics).mockRejectedValueOnce(new Error("接口不可用"));
		mount();
		expect(await screen.findByRole("alert")).toHaveTextContent("接口不可用");
		expect(screen.queryByText("0 B")).not.toBeInTheDocument();
		let resolveRead: ((value: typeof statistics) => void) | undefined;
		vi.mocked(getDesktopCacheStatistics).mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					resolveRead = resolve;
				}),
		);
		fireEvent.click(screen.getByRole("button", { name: "重试" }));
		await waitFor(() => expect(screen.getByRole("button", { name: "重试" })).toBeDisabled());
		fireEvent.click(screen.getByRole("button", { name: "重试" }));
		expect(getDesktopCacheStatistics).toHaveBeenCalledTimes(2);
		resolveRead?.(statistics);
		await screen.findByText("2.0 KiB");
	});
	it("shows an unsupported browser state without calling native statistics", () => {
		vi.mocked(isDesktopRuntime).mockReturnValue(false);
		mount();
		expect(screen.getByRole("status")).toHaveTextContent("不支持桌面缓存统计");
		expect(screen.getByRole("button", { name: "刷新" })).toBeDisabled();
		expect(getDesktopCacheStatistics).not.toHaveBeenCalled();
	});
});
