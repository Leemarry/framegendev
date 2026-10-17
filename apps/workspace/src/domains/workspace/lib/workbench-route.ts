import type { WorkMode } from "@/lib/stores/work-mode";

export type AgentProjectView = "agent" | "document" | "overview";
export type AgentDocumentWorkbench = "canvas" | "timeline";
export type AgentResourceType = "character" | "scene" | "storyboard" | "prop";

export const getRouteProjectId = (search: string) => getSearchParam(search, "projectId");

export const getRouteResourceType = (search: string): AgentResourceType | null => {
	const value = getSearchParam(search, "resourceType");
	return value === "character" || value === "scene" || value === "storyboard" || value === "prop"
		? value
		: null;
};

export const getRouteDocumentId = (search: string) => getSearchParam(search, "documentId");

export const getRouteAssetId = (search: string) => getSearchParam(search, "assetId");

export const getRouteAgentSessionId = (search: string) =>
	getSearchParam(search, "agentSessionId") ?? getSearchParam(search, "agentSession");

export const getRouteDocumentWorkbench = (search: string): AgentDocumentWorkbench | null => {
	const value = getSearchParam(search, "workbench");
	return value === "timeline" || value === "canvas" ? value : null;
};

export const isAgentRoute = (pathname: string) => pathname === "/projects";

export const isProjectSettingsRoute = (pathname: string, search: string) =>
	pathname === "/project-settings" ||
	pathname.startsWith("/project-settings/") ||
	// legacy `/settings?projectId=…` links redirect to the dedicated route, but the
	// shell still has to treat them as project settings until the redirect lands.
	(isSettingsRoute(pathname) && Boolean(getRouteProjectId(search)));

export const isSettingsRoute = (pathname: string) =>
	pathname === "/settings" || pathname.startsWith("/settings/");

export const isAgentDocumentRoute = (_pathname: string, _search: string) => false;

export const workbenchModeForRoute = (
	pathname: string,
	workMode?: WorkMode | null,
): WorkMode | null => {
	if (isAgentRoute(pathname)) return "agent";
	if (pathname === "/toolbox" || pathname.startsWith("/toolbox/")) return "studio";
	if (pathname === "/") return workMode ?? null;
	return null;
};

export const shouldForceDocumentWorkbench = (pathname: string, _search: string) => {
	if (!isAgentRoute(pathname)) {
		const mode = workbenchModeForRoute(pathname);
		return mode === "studio";
	}
	return false;
};

export const agentProjectPath = (
	projectId: string,
	options: {
		assetId?: string | null;
		agentSessionId?: string | null;
		documentId?: string | null;
		resourceType?: AgentResourceType | null;
		workbench?: AgentDocumentWorkbench | null;
	} = {},
) => {
	const params = new URLSearchParams();
	params.set("projectId", projectId);
	if (options.documentId) params.set("documentId", options.documentId);
	if (options.assetId && !options.documentId) params.set("assetId", options.assetId);
	if (options.resourceType && !options.documentId && !options.assetId) {
		params.set("resourceType", options.resourceType);
	}
	if (options.agentSessionId) params.set("agentSessionId", options.agentSessionId);
	return `/projects?${params.toString()}`;
};

export const studioTabPath = (
	tab: "image" | "text" | "video" | "audio",
	options: { conversationId?: string | null } = {},
) => {
	const params = new URLSearchParams();
	if (options.conversationId) params.set("conversation", options.conversationId);
	const query = params.toString();
	return query ? `/toolbox/${tab}?${query}` : `/toolbox/${tab}`;
};

/** historyPath points at the generation history pages, project scoped when a project id is given. */
export const historyPath = (
	tab: "image" | "text" | "video" | "audio",
	options: { conversationId?: string | null; projectId?: string | null } = {},
) => {
	const params = new URLSearchParams();
	if (options.conversationId) params.set("conversation", options.conversationId);
	if (options.projectId) params.set("projectId", options.projectId);
	const query = params.toString();
	return query ? `/history/${tab}?${query}` : `/history/${tab}`;
};

export const settingsPath = (projectId?: string | null) => {
	if (!projectId) return "/settings";
	const params = new URLSearchParams();
	params.set("projectId", projectId);
	return `/project-settings?${params.toString()}`;
};

export const agentProjectRouteState = (projectView: AgentProjectView) => ({ projectView });

export const isAgentProjectViewState = (state: unknown, projectView: AgentProjectView): boolean =>
	Boolean(
		state &&
		typeof state === "object" &&
		(state as { projectView?: unknown }).projectView === projectView,
	);

const getSearchParam = (search: string, key: string) => {
	const value = new URLSearchParams(search).get(key)?.trim() ?? "";
	return value || null;
};
