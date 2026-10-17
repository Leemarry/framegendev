import type { WorkMode } from "@/lib/stores/work-mode";
import type {
	ActiveStudioTab,
	SidebarScreenId,
} from "@/domains/workspace/components/ProjectNavigatorTypes";

/**
 * Sidebar screen order, shallowest first. Mirrors the official screen id set so the
 * stack animation can sort by level without inventing an order per call site.
 */
export const sidebarScreenOrder: readonly SidebarScreenId[] = [
	"projects",
	"studio-types",
	"project",
	"global-agent",
	"asset-library",
	"generation-history",
	"studio-conversations",
	"project-asset-library",
	"project-generation-center",
	"project-settings",
	"global-agent-archive",
	"settings",
];

interface ResolveSidebarScreenOptions {
	projectId?: string | null;
	workMode: WorkMode;
}

const isLibraryRoute = (pathname: string) =>
	pathname === "/library" || pathname.startsWith("/library/");

const isHistoryRoute = (pathname: string) =>
	pathname === "/history" || pathname.startsWith("/history/");

/** resolveSidebarScreen maps a route to the sidebar screen the official shell would show. */
export const resolveSidebarScreen = (
	pathname: string,
	_search: string,
	{ projectId, workMode }: ResolveSidebarScreenOptions,
): SidebarScreenId => {
	if (isSettingsRoute(pathname)) return "settings";

	if (pathname === "/agent/archived") return "global-agent-archive";
	if (pathname === "/agent") return "global-agent";

	// Project scoped screens only exist while a project is open, so the same URL
	// resolves to a deeper screen in project mode and a flatter one otherwise.
	if (projectId && isLibraryRoute(pathname)) return "project-asset-library";
	if (projectId && isHistoryRoute(pathname)) return "project-generation-center";
	if (projectId && pathname === "/project-settings") return "project-settings";

	if (isLibraryRoute(pathname)) return "asset-library";
	if (isHistoryRoute(pathname)) return "generation-history";

	if (pathname === "/project-settings") return "projects";

	if (pathname === "/toolbox" || pathname.startsWith("/toolbox/")) {
		return "studio-types";
	}

	if (pathname === "/projects") return "project";

	if (pathname === "/") {
		if (workMode === "studio") return "studio-types";
		return projectId ? "project" : "projects";
	}

	return "projects";
};

/** isRootScreen marks the level 1 screens, which slide out instead of stacking. */
export const isRootScreen = (screen: SidebarScreenId) =>
	screen === "projects" || screen === "studio-types";

/**
 * sidebarStackScreen maps every route screen onto a screen the current sidebar stack
 * renders. Screens whose dedicated panels are not built yet fall back to the nearest
 * existing panel so the sidebar never renders blank.
 */
export const sidebarStackScreen = (screen: SidebarScreenId): SidebarScreenId => {
	switch (screen) {
		case "project-asset-library":
		case "project-generation-center":
			return "project";
		case "project-settings":
			return "settings";
		case "global-agent":
		case "global-agent-archive":
		case "asset-library":
			return "projects";
		case "generation-history":
			return "studio-types";
		default:
			return screen;
	}
};

export const workModeForScreen = (screen: SidebarScreenId): WorkMode | null => {
	switch (screen) {
		case "projects":
		case "project":
		case "project-asset-library":
		case "project-generation-center":
		case "project-settings":
		case "global-agent":
		case "global-agent-archive":
		case "asset-library":
			return "agent";
		case "studio-types":
		case "studio-conversations":
		case "generation-history":
			return "studio";
		default:
			return null;
	}
};

export const studioTabFromPath = (pathname: string): ActiveStudioTab => {
	const tab = studioPathSegment(pathname);
	return tab === "image" || tab === "video" || tab === "text" || tab === "audio" ? tab : null;
};

const isSettingsRoute = (pathname: string) =>
	pathname === "/settings" || pathname.startsWith("/settings/");

const studioPathSegment = (pathname: string) =>
	pathname
		.replace(/^\/(?:toolbox|history)\/?/, "")
		.split("/")[0]
		.trim();
