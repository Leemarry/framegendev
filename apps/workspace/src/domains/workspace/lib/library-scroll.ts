/**
 * Scroll memory for the asset library grid. Official keeps the last browsing
 * position per library scope so returning to a folder restores where you were.
 */

export interface LibraryScrollContext {
	folderId?: string | null;
	projectId?: string | null;
	status: "ready" | "trashed";
}

/** Stable storage key: one entry per scope, folder and trash state. */
export const libraryScrollKey = ({ folderId, projectId, status }: LibraryScrollContext) =>
	[status, projectId?.trim() || "global", folderId?.trim() || "root"].join("|");
