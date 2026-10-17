import { describe, expect, it } from "vitest";
import { libraryScrollKey } from "./library-scroll";

describe("library scroll key", () => {
	it("separates scopes, folders and the trash view", () => {
		expect(libraryScrollKey({ projectId: "project-a", status: "ready" })).toBe(
			"ready|project-a|root",
		);
		expect(
			libraryScrollKey({ folderId: "folder-b", projectId: "project-a", status: "trashed" }),
		).toBe("trashed|project-a|folder-b");
	});

	it("falls back to the global library root for empty scopes", () => {
		expect(libraryScrollKey({ folderId: "", projectId: null, status: "ready" })).toBe(
			"ready|global|root",
		);
		expect(libraryScrollKey({ folderId: "  ", projectId: "  ", status: "ready" })).toBe(
			"ready|global|root",
		);
	});
});
