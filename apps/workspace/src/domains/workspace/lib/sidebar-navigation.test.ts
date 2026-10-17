import { describe, expect, it } from "vitest";
import {
	isRootScreen,
	resolveSidebarScreen,
	sidebarStackScreen,
	studioTabFromPath,
	workModeForScreen,
} from "@/domains/workspace/lib/sidebar-navigation";

describe("sidebar navigation", () => {
	it("uses work mode to resolve the root shell", () => {
		expect(resolveSidebarScreen("/", "", { workMode: "agent", projectId: null })).toBe("projects");
		expect(resolveSidebarScreen("/", "", { workMode: "studio", projectId: null })).toBe(
			"studio-types",
		);
	});

	it("uses the project sidebar for agent project routes", () => {
		expect(resolveSidebarScreen("/projects", "?projectId=project-1", { workMode: "agent" })).toBe(
			"project",
		);
		expect(
			resolveSidebarScreen("/projects", "?projectId=project-1&documentId=doc-1", {
				workMode: "agent",
			}),
		).toBe("project");
	});

	it("uses explicit studio path segments for generation conversations", () => {
		expect(resolveSidebarScreen("/toolbox/image", "", { workMode: "studio" })).toBe("studio-types");
		expect(resolveSidebarScreen("/toolbox/audio-transcribe", "", { workMode: "studio" })).toBe(
			"studio-types",
		);
		expect(resolveSidebarScreen("/toolbox/unmapped-tool", "", { workMode: "studio" })).toBe(
			"studio-types",
		);
		expect(studioTabFromPath("/toolbox/video")).toBe("video");
		expect(studioTabFromPath("/toolbox/audio")).toBe("audio");
		expect(studioTabFromPath("/history/image")).toBe("image");
		expect(studioTabFromPath("/history/audio-transcribe")).toBeNull();
	});

	it("splits the library and history screens by project scope", () => {
		expect(resolveSidebarScreen("/library", "", { workMode: "agent", projectId: null })).toBe(
			"asset-library",
		);
		expect(resolveSidebarScreen("/library", "", { workMode: "agent", projectId: "p" })).toBe(
			"project-asset-library",
		);
		expect(resolveSidebarScreen("/history/video", "", { workMode: "agent", projectId: null })).toBe(
			"generation-history",
		);
		expect(resolveSidebarScreen("/history", "", { workMode: "agent", projectId: "p" })).toBe(
			"project-generation-center",
		);
		expect(
			resolveSidebarScreen("/project-settings", "", { workMode: "agent", projectId: "p" }),
		).toBe("project-settings");
		expect(
			resolveSidebarScreen("/project-settings", "", { workMode: "agent", projectId: null }),
		).toBe("projects");
	});

	it("gives the global agent its own screens", () => {
		expect(resolveSidebarScreen("/agent", "", { workMode: "agent" })).toBe("global-agent");
		expect(resolveSidebarScreen("/agent/archived", "", { workMode: "agent" })).toBe(
			"global-agent-archive",
		);
	});

	it("maps work modes for every screen", () => {
		expect(workModeForScreen("asset-library")).toBe("agent");
		expect(workModeForScreen("global-agent-archive")).toBe("agent");
		expect(workModeForScreen("generation-history")).toBe("studio");
		expect(workModeForScreen("settings")).toBeNull();
	});

	it("marks only the level one screens as roots", () => {
		expect(isRootScreen("projects")).toBe(true);
		expect(isRootScreen("studio-types")).toBe(true);
		expect(isRootScreen("asset-library")).toBe(false);
	});

	it("falls back to a rendered panel for screens that have no panel yet", () => {
		expect(sidebarStackScreen("project-asset-library")).toBe("project");
		expect(sidebarStackScreen("project-settings")).toBe("settings");
		expect(sidebarStackScreen("generation-history")).toBe("studio-types");
		expect(sidebarStackScreen("global-agent")).toBe("projects");
		expect(sidebarStackScreen("project")).toBe("project");
	});
});
