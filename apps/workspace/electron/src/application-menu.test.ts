import type { MenuItemConstructorOptions } from "electron";
import { describe, expect, it, vi } from "vitest";
import { applicationMenuTemplate } from "./application-menu";
import { isDesktopMenuCommand } from "./ipc-contract";

const items = (group: MenuItemConstructorOptions) => group.submenu as MenuItemConstructorOptions[];
const click = (item: MenuItemConstructorOptions) => {
	if (!item.click) throw new Error("Expected a command menu item");
	Reflect.apply(item.click, undefined, []);
};

describe("native application menu", () => {
	it("routes settings commands to the renderer without triggering updates or project windows", () => {
		const command = vi.fn(),
			about = vi.fn();
		const template = applicationMenuTemplate({ command, about, development: false });
		const tools = items(template[3]);
		click(tools[0]);
		click(tools[1]);
		click(items(template[5])[0]);
		expect(command.mock.calls).toEqual([["settings"], ["shortcuts"], ["updates"]]);
		click(items(template[5])[2]);
		expect(about).toHaveBeenCalledOnce();
		expect(template.flatMap(items).some((item) => item.role === "toggleDevTools")).toBe(false);
		expect(
			items(template[0])
				.map((item) => item.role)
				.filter(Boolean),
		).toEqual(["close", "quit"]);
	});
	it("rejects unknown commands at the preload event boundary", () => {
		for (const value of [null, {}, "install", "new-window", 1])
			expect(isDesktopMenuCommand(value)).toBe(false);
		expect(isDesktopMenuCommand("settings")).toBe(true);
	});
});
