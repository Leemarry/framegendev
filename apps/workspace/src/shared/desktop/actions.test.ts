import { afterEach, describe, expect, it, vi } from "vitest";
import {
	getDesktopCacheStatistics,
	openNativePath,
	getDesktopUpdateCapability,
	showDesktopNotification,
	subscribeDesktopMenuCommands,
} from "@/shared/desktop/actions";

describe("native directory opening", () => {
	afterEach(() => {
		delete window.mediagoDesktop;
	});
	it("rejects browsers and missing native methods", async () => {
		await expect(openNativePath("E:/isolated/project")).rejects.toThrow("不支持打开本地文件夹");
		Object.defineProperty(window, "mediagoDesktop", {
			configurable: true,
			value: { isElectron: true },
		});
		await expect(openNativePath("E:/isolated/project")).rejects.toThrow(
			"未检测到桌面端打开文件夹接口",
		);
	});
	it("uses openPath and propagates its failure", async () => {
		const openPath = vi.fn().mockRejectedValue(new Error("folder unavailable"));
		Object.defineProperty(window, "mediagoDesktop", {
			configurable: true,
			value: { isElectron: true, openPath },
		});
		await expect(openNativePath("E:/isolated/project")).rejects.toThrow("folder unavailable");
		expect(openPath).toHaveBeenCalledWith("E:/isolated/project");
	});
});

describe("desktop cache capability", () => {
	afterEach(() => {
		delete window.mediagoDesktop;
	});
	it("rejects browsers and older bridges instead of reporting zero", async () => {
		await expect(getDesktopCacheStatistics()).rejects.toThrow("不支持桌面缓存统计");
		Object.defineProperty(window, "mediagoDesktop", {
			configurable: true,
			value: { isElectron: true },
		});
		await expect(getDesktopCacheStatistics()).rejects.toThrow("未检测到桌面缓存统计接口");
	});
	it("returns native data and propagates native failure", async () => {
		const value = { cacheBytes: 42, profilePath: "E:/test", measuredAt: "2026-10-16T00:00:00Z" };
		const getCacheStatistics = vi
			.fn()
			.mockResolvedValueOnce(value)
			.mockRejectedValueOnce(new Error("native read failed"));
		Object.defineProperty(window, "mediagoDesktop", {
			configurable: true,
			value: { isElectron: true, getCacheStatistics },
		});
		await expect(getDesktopCacheStatistics()).resolves.toEqual(value);
		await expect(getDesktopCacheStatistics()).rejects.toThrow("native read failed");
	});
});

describe("desktop menu subscription", () => {
	afterEach(() => {
		delete window.mediagoDesktop;
	});
	it("cleans up the native bridge listener and tolerates browser or older hosts", () => {
		expect(() => subscribeDesktopMenuCommands(vi.fn())()).not.toThrow();
		const unsubscribe = vi.fn(),
			callback = vi.fn(),
			onMenuCommand = vi.fn(() => unsubscribe);
		window.mediagoDesktop = { onMenuCommand } as unknown as typeof window.mediagoDesktop;
		const cleanup = subscribeDesktopMenuCommands(callback);
		expect(onMenuCommand).toHaveBeenCalledWith(callback);
		cleanup();
		expect(unsubscribe).toHaveBeenCalledOnce();
	});
});

describe("showDesktopNotification click bridge", () => {
	afterEach(() => {
		delete window.mediagoDesktop;
		vi.restoreAllMocks();
	});

	it("routes a native notification click back to its onClick handler", async () => {
		let clickBridge: ((id: string) => void) | undefined;
		const showNotification = vi.fn().mockResolvedValue(true);
		window.mediagoDesktop = {
			isElectron: true,
			showNotification,
			onNotificationClicked: (callback: (id: string) => void) => {
				clickBridge = callback;
				return () => {};
			},
		} as unknown as typeof window.mediagoDesktop;

		const onClick = vi.fn();
		const shown = await showDesktopNotification({
			title: "Agent 等待权限确认",
			body: "需要确认后继续。",
			group: "agent-permissions",
			onClick,
		});

		expect(shown).toBe(true);
		expect(showNotification).toHaveBeenCalledWith({
			title: "Agent 等待权限确认",
			body: "需要确认后继续。",
			id: "agent-permissions",
		});

		expect(onClick).not.toHaveBeenCalled();
		clickBridge?.("agent-permissions");
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("omits the id when no onClick handler is supplied", async () => {
		const showNotification = vi.fn().mockResolvedValue(true);
		window.mediagoDesktop = {
			isElectron: true,
			showNotification,
			onNotificationClicked: () => () => {},
		} as unknown as typeof window.mediagoDesktop;

		await showDesktopNotification({ title: "生成完成", body: "已生成图片。" });

		expect(showNotification).toHaveBeenCalledWith({
			title: "生成完成",
			body: "已生成图片。",
			id: undefined,
		});
	});
});

describe("getDesktopUpdateCapability", () => {
	afterEach(() => {
		delete window.mediagoDesktop;
		vi.restoreAllMocks();
	});

	it("uses the release list for the browser fallback download link", async () => {
		await expect(getDesktopUpdateCapability()).resolves.toMatchObject({
			supportsAutoUpdate: false,
			releasePageUrl: "https://github.com/mediago-dev/mediago-drama/releases",
		});
	});
});
