import type { WorkMode } from "@/lib/stores/work-mode";
import type { SidebarScreenId } from "@/domains/workspace/components/ProjectNavigatorTypes";
import {
	resolveSidebarScreen,
	workModeForScreen,
} from "@/domains/workspace/lib/sidebar-navigation";
import { isAgentDocumentRoute } from "./workbench-route";

export type AppPageLevel = 1 | 2 | 3 | 9999;

export interface AppRouteDescriptor {
	/**
	 * Page level is the product navigation depth, not the URL segment count.
	 * The sidebar slide animation is derived from this number.
	 */
	level: AppPageLevel;
	sidebarHidden: boolean;
	sidebarScreen: SidebarScreenId;
	title: string;
	workMode: WorkMode | null;
}

interface ResolveAppRouteDescriptorOptions {
	projectId?: string | null;
	projectName?: string | null;
	workMode: WorkMode;
}

/** Screen depth mirrors the official shell's screen level map. */
const screenLevel: Record<SidebarScreenId, AppPageLevel> = {
	projects: 1,
	"studio-types": 1,
	project: 2,
	"global-agent": 2,
	"asset-library": 2,
	"generation-history": 2,
	"studio-conversations": 2,
	"project-asset-library": 3,
	"project-generation-center": 3,
	"project-settings": 3,
	"global-agent-archive": 3,
	settings: 9999,
};

export const sidebarScreenLevel = (screen: SidebarScreenId): AppPageLevel => screenLevel[screen];

export const usesProjectSettingsSidebar = (
	activeScreen: SidebarScreenId,
	isProjectSettingsRoute: boolean,
) =>
	isProjectSettingsRoute ||
	activeScreen === "project" ||
	activeScreen === "project-asset-library" ||
	activeScreen === "project-generation-center" ||
	activeScreen === "project-settings";

export const resolveAppRouteDescriptor = (
	pathname: string,
	search: string,
	options: ResolveAppRouteDescriptorOptions,
): AppRouteDescriptor => {
	const sidebarScreen = resolveSidebarScreen(pathname, search, options);
	const workMode = workModeForScreen(sidebarScreen);

	return {
		level: sidebarScreenLevel(sidebarScreen),
		sidebarHidden: isAgentDocumentRoute(pathname, search),
		sidebarScreen,
		title: sidebarScreenTitle(sidebarScreen, options.projectName),
		workMode,
	};
};

/** sidebarScreenTitle follows the official title map; project scoped screens show the project name. */
const sidebarScreenTitle = (screen: SidebarScreenId, projectName?: string | null) => {
	switch (screen) {
		case "settings":
			return "设置";
		case "global-agent-archive":
			return "已归档会话";
		case "global-agent":
			return "Drami";
		case "asset-library":
			return "素材库";
		case "generation-history":
		case "studio-types":
		case "studio-conversations":
			return "生成历史";
		case "project":
		case "project-asset-library":
		case "project-generation-center":
		case "project-settings":
			return projectName?.trim() ?? "";
		case "projects":
			return "项目管理";
		default:
			return "";
	}
};
