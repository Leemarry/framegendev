import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceStatePayload } from "@/domains/workspace/api/workspace";
import { useDocumentsStore } from "@/domains/documents/stores";
import { DocumentStateSync } from "./DocumentStateSync";

const swr = vi.hoisted(() => ({
	data: undefined as WorkspaceStatePayload | undefined,
	isLoading: true,
}));

vi.mock("swr", () => ({ default: () => swr }));
vi.mock("./DocumentConflictNotice", () => ({ DocumentConflictNotice: () => null }));

describe("DocumentStateSync loading lifecycle", () => {
	beforeEach(() => {
		vi.stubGlobal("EventSource", undefined);
		localStorage.clear();
		useDocumentsStore.getState().prepareWorkspaceLoad("Waiting");
		swr.data = undefined;
		swr.isLoading = true;
	});

	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it("keeps completed layout hydration ready when the loading effect follows it", () => {
		swr.data = {
			projectId: "project-a",
			workspaceDir: "/isolated/project-a",
			documents: [],
			operationLog: [],
			assets: [],
			folders: [],
		};
		render(<DocumentStateSync projectId="project-a" />);

		expect(useDocumentsStore.getState()).toMatchObject({
			projectId: "project-a",
			workspaceDir: "/isolated/project-a",
			syncStatus: "synced",
		});
	});

	it("keeps an unloaded project waiting and clears the previous workspace", () => {
		useDocumentsStore.getState().hydrateWorkspaceState([], [], "/isolated/old", "old");
		render(<DocumentStateSync projectId="project-a" />);

		expect(useDocumentsStore.getState()).toMatchObject({
			projectId: null,
			workspaceDir: "",
			syncStatus: "syncing",
		});
	});
});
