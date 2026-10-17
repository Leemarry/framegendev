import { describe, expect, it } from "vitest";
import {
	resolveAppRouteDescriptor,
	usesProjectSettingsSidebar,
} from "@/domains/workspace/lib/app-route-descriptor";

describe("app route descriptor", () => {
	it("treats work modes as level-one home screens", () => {
		expect(resolveAppRouteDescriptor("/", "", { workMode: "agent" })).toMatchObject({
			level: 1,
			sidebarScreen: "projects",
			title: "项目管理",
		});
		expect(resolveAppRouteDescriptor("/", "", { workMode: "studio" })).toMatchObject({
			level: 1,
			sidebarScreen: "studio-types",
			title: "生成历史",
		});
	});

	it("marks project and detail pages as second-level pages", () => {
		expect(
			resolveAppRouteDescriptor("/projects", "?projectId=project-1", {
				workMode: "agent",
				projectId: "project-1",
			}),
		).toMatchObject({
			level: 2,
			sidebarHidden: false,
			sidebarScreen: "project",
		});
		expect(
			resolveAppRouteDescriptor("/projects", "?projectId=project-1&documentId=doc-1", {
				workMode: "agent",
				projectId: "project-1",
			}),
		).toMatchObject({
			level: 2,
			sidebarHidden: false,
			sidebarScreen: "project",
		});
		expect(
			resolveAppRouteDescriptor(
				"/projects",
				"?projectId=project-1&documentId=doc-1&workbench=timeline",
				{
					workMode: "agent",
					projectId: "project-1",
				},
			),
		).toMatchObject({
			level: 2,
			sidebarHidden: false,
			sidebarScreen: "project",
		});
		expect(resolveAppRouteDescriptor("/toolbox/video", "", { workMode: "studio" })).toMatchObject({
			level: 1,
			sidebarScreen: "studio-types",
		});
	});

	it("uses a sentinel level for all settings pages", () => {
		expect(resolveAppRouteDescriptor("/settings", "", { workMode: "agent" })).toMatchObject({
			level: 9999,
			sidebarScreen: "settings",
			title: "设置",
		});
		expect(
			resolveAppRouteDescriptor("/settings", "?projectId=project-1", {
				workMode: "agent",
				projectId: "project-1",
			}),
		).toMatchObject({
			level: 9999,
			sidebarScreen: "settings",
			title: "设置",
		});
	});

	it("stacks the library, history and agent screens on their official levels", () => {
		expect(resolveAppRouteDescriptor("/library", "", { workMode: "agent" })).toMatchObject({
			level: 2,
			sidebarScreen: "asset-library",
			title: "素材库",
			workMode: "agent",
		});
		expect(
			resolveAppRouteDescriptor("/library", "?projectId=project-1", {
				workMode: "agent",
				projectId: "project-1",
				projectName: "测试项目",
			}),
		).toMatchObject({
			level: 3,
			sidebarScreen: "project-asset-library",
			title: "测试项目",
		});
		expect(resolveAppRouteDescriptor("/history/video", "", { workMode: "agent" })).toMatchObject({
			level: 2,
			sidebarScreen: "generation-history",
			title: "生成历史",
			workMode: "studio",
		});
		expect(
			resolveAppRouteDescriptor("/history", "?projectId=project-1", {
				workMode: "agent",
				projectId: "project-1",
			}),
		).toMatchObject({
			level: 3,
			sidebarScreen: "project-generation-center",
		});
		expect(resolveAppRouteDescriptor("/agent", "", { workMode: "agent" })).toMatchObject({
			level: 2,
			sidebarScreen: "global-agent",
			title: "Drami",
		});
		expect(resolveAppRouteDescriptor("/agent/archived", "", { workMode: "agent" })).toMatchObject({
			level: 3,
			sidebarScreen: "global-agent-archive",
			title: "已归档会话",
		});
	});

	it("keeps project settings on level three and off the project list", () => {
		expect(
			resolveAppRouteDescriptor("/project-settings", "?projectId=project-1", {
				workMode: "agent",
				projectId: "project-1",
				projectName: "测试项目",
			}),
		).toMatchObject({
			level: 3,
			sidebarScreen: "project-settings",
			title: "测试项目",
		});
		expect(resolveAppRouteDescriptor("/project-settings", "", { workMode: "agent" })).toMatchObject(
			{
				level: 1,
				sidebarScreen: "projects",
				title: "项目管理",
			},
		);
	});

	it("uses project-settings sidebar semantics while entering and leaving project settings", () => {
		expect(usesProjectSettingsSidebar("project", false)).toBe(true);
		expect(usesProjectSettingsSidebar("project-asset-library", false)).toBe(true);
		expect(usesProjectSettingsSidebar("project-settings", false)).toBe(true);
		expect(usesProjectSettingsSidebar("settings", true)).toBe(true);
		expect(usesProjectSettingsSidebar("projects", false)).toBe(false);
		expect(usesProjectSettingsSidebar("settings", false)).toBe(false);
	});
});
