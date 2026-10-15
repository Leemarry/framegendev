import type { BrowserWindow } from "electron";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	listeners: new Map<string, (...args: unknown[]) => void>(),
	handle: vi.fn(),
}));
vi.mock("electron", () => ({
	app: { isPackaged: true, getVersion: () => "0.1.17" },
	ipcMain: { handle: mocks.handle },
}));
vi.mock("electron-updater", () => ({
	default: {
		autoUpdater: {
			on: (name: string, listener: (...args: unknown[]) => void) =>
				mocks.listeners.set(name, listener),
		},
	},
}));
import { registerDesktopUpdater } from "./updater";

describe("updater workspace windows", () => {
	it("broadcasts status to live windows and skips closed windows without checking or installing", () => {
		const send = vi.fn(),
			sendSecond = vi.fn(),
			sendClosed = vi.fn();
		const windows = [
			{ isDestroyed: () => false, webContents: { isDestroyed: () => false, send } },
			{ isDestroyed: () => false, webContents: { isDestroyed: () => false, send: sendSecond } },
			{ isDestroyed: () => true, webContents: { isDestroyed: () => true, send: sendClosed } },
		];
		const getWindow = () => windows as BrowserWindow[];
		registerDesktopUpdater({ authorizeIpcSender: vi.fn(), getWindow });
		mocks.listeners.get("checking-for-update")?.();
		expect(send).toHaveBeenCalledWith("desktop:update-status", {
			currentVersion: "0.1.17",
			phase: "checking",
		});
		expect(sendSecond).toHaveBeenCalledOnce();
		expect(sendClosed).not.toHaveBeenCalled();
	});
});
