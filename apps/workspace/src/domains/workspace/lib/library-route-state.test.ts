import { describe, expect, it } from "vitest";
import {
	defaultLibraryRouteFilters,
	patchLibraryRouteSearch,
	readLibraryRouteFilters,
} from "@/domains/workspace/lib/library-route-state";

describe("library route state", () => {
	it("reads the official asset library parameters", () => {
		const filters = readLibraryRouteFilters(
			"?view=assets&kind=video&q=cat&tag=hero&sort=nameAsc&resource=character&source=selected&usage=candidate&minRating=3&favorite=favorite&includeDescendants=true&folder=folder-1&provenance=generated",
		);

		expect(filters).toEqual({
			browseScope: "all",
			favorite: "favorite",
			folderId: "folder-1",
			includeSubfolders: true,
			kind: "video",
			provenance: "generated",
			q: "cat",
			rating: "3",
			resource: "character",
			sort: "nameAsc",
			source: "selected",
			tag: "hero",
			usage: "candidate",
		});
	});

	it("falls back to defaults for unknown values", () => {
		const filters = readLibraryRouteFilters(
			"?view=list&kind=nope&sort=random&minRating=abc&resource=unknown&source=nope",
		);

		expect(filters).toMatchObject({
			browseScope: "directory",
			kind: "all",
			rating: "all",
			resource: "all",
			sort: defaultLibraryRouteFilters.sort,
			source: "all",
		});
	});

	it("clamps the star threshold like the official shell", () => {
		expect(readLibraryRouteFilters("?minRating=99").rating).toBe("5");
		expect(readLibraryRouteFilters("?minRating=-3").rating).toBe("all");
	});

	it("still reads the legacy folderId parameter", () => {
		expect(readLibraryRouteFilters("?folderId=parent").folderId).toBe("parent");
	});

	it("keeps the rated filter separate from a numeric threshold", () => {
		expect(readLibraryRouteFilters("?rating=rated").rating).toBe("rated");
		expect(readLibraryRouteFilters("?minRating=0").rating).toBe("all");
	});

	it("writes the official parameter names and drops defaults", () => {
		const search = patchLibraryRouteSearch("?scope=all&projectId=project-a", {
			folderId: "folder-1",
			kind: "image",
			q: "cat",
			rating: "4",
		});
		const params = new URLSearchParams(search);

		expect(params.get("folder")).toBe("folder-1");
		expect(params.has("folderId")).toBe(false);
		expect(params.get("kind")).toBe("image");
		expect(params.get("q")).toBe("cat");
		expect(params.get("minRating")).toBe("4");
		expect(params.has("view")).toBe(false);
		expect(params.has("sort")).toBe(false);
		// Scope parameters the page owns survive a filter patch.
		expect(params.get("scope")).toBe("all");
		expect(params.get("projectId")).toBe("project-a");
	});

	it("clears a parameter when the filter goes back to its default", () => {
		const search = patchLibraryRouteSearch("?kind=image&folder=folder-1&includeDescendants=true", {
			folderId: "",
			includeSubfolders: false,
			kind: "all",
		});
		const params = new URLSearchParams(search);

		expect(params.has("kind")).toBe(false);
		expect(params.has("folder")).toBe(false);
		expect(params.has("includeDescendants")).toBe(false);
	});

	it("round trips every filter", () => {
		const wanted = {
			browseScope: "all" as const,
			favorite: "favorite" as const,
			folderId: "folder-2",
			includeSubfolders: true,
			kind: "audio" as const,
			provenance: "browser" as const,
			q: "music",
			rating: "rated" as const,
			resource: "prop" as const,
			sort: "sizeDesc" as const,
			source: "media" as const,
			tag: "bgm",
			usage: "unused" as const,
		};

		expect(readLibraryRouteFilters(patchLibraryRouteSearch("", wanted))).toEqual(wanted);
	});

	it("writes the assets view only when browsing everything", () => {
		expect(
			new URLSearchParams(patchLibraryRouteSearch("", { browseScope: "all" })).get("view"),
		).toBe("assets");
		expect(
			new URLSearchParams(
				patchLibraryRouteSearch("?view=assets", { browseScope: "directory" }),
			).has("view"),
		).toBe(false);
	});
});
