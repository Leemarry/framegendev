import { OVERVIEW_SENTINEL } from "@/lib/stores/last-document";
import { agentProjectPath, agentProjectRouteState } from "./workbench-route";

export const resolveSettingsReturn = (
	state: unknown,
	projectId: string | null,
	lastDocumentId?: string | null,
) => {
	if (state && typeof state === "object" && "settingsReturn" in state) {
		const target = state.settingsReturn;
		if (
			target &&
			typeof target === "object" &&
			"path" in target &&
			typeof target.path === "string" &&
			/^\/(?![/\\])/.test(target.path)
		) {
			return { path: target.path, state: "state" in target ? target.state : null };
		}
	}
	if (!projectId) return { path: "/", state: null };
	const documentId =
		lastDocumentId && lastDocumentId !== OVERVIEW_SENTINEL ? lastDocumentId : undefined;
	return {
		path: agentProjectPath(projectId, { documentId }),
		state: agentProjectRouteState(documentId ? "document" : "overview"),
	};
};
