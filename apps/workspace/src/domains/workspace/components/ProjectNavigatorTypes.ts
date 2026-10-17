export type SidebarScreenId =
	| "projects"
	| "project"
	| "project-asset-library"
	| "project-generation-center"
	| "project-settings"
	| "global-agent"
	| "global-agent-archive"
	| "asset-library"
	| "generation-history"
	| "studio-types"
	| "studio-conversations"
	| "settings";
export type StudioTab = "video" | "image" | "text" | "audio";
export type ActiveStudioTab = StudioTab | null;
