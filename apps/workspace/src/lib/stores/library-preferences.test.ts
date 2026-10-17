import { describe, expect, it } from "vitest";
import {
	clampLibraryThumbnailSize,
	defaultLibraryThumbnailSize,
	maxLibraryScrollEntries,
	maxLibraryThumbnailSize,
	minLibraryThumbnailSize,
	useLibraryPreferencesStore,
} from "@/lib/stores/library-preferences";

describe("library preferences store", () => {
	it("starts with the default thumbnail size", () => {
		expect(useLibraryPreferencesStore.getState().thumbnailSize).toBe(defaultLibraryThumbnailSize);
	});

	it("remembers the thumbnail size the user picked", () => {
		useLibraryPreferencesStore.getState().setThumbnailSize(240);

		expect(useLibraryPreferencesStore.getState().thumbnailSize).toBe(240);
	});

	it("clamps values the slider cannot produce", () => {
		expect(clampLibraryThumbnailSize(10)).toBe(minLibraryThumbnailSize);
		expect(clampLibraryThumbnailSize(900)).toBe(maxLibraryThumbnailSize);
		expect(clampLibraryThumbnailSize(Number.NaN)).toBe(defaultLibraryThumbnailSize);
		expect(clampLibraryThumbnailSize(199.6)).toBe(200);
	});

	it("stores one scroll offset per library scope", () => {
		useLibraryPreferencesStore.getState().setScrollPosition("ready|project-a|root", 320.4);
		useLibraryPreferencesStore.getState().setScrollPosition("trashed|global|folder-b", 48);

		expect(useLibraryPreferencesStore.getState().scrollPositions).toMatchObject({
			"ready|project-a|root": 320,
			"trashed|global|folder-b": 48,
		});
	});

	it("rejects unusable scroll offsets instead of persisting them", () => {
		useLibraryPreferencesStore.getState().setScrollPosition("ready|global|root", -80);
		useLibraryPreferencesStore.getState().setScrollPosition("ready|global|root", Number.NaN);

		expect(useLibraryPreferencesStore.getState().scrollPositions["ready|global|root"]).toBe(0);
	});

	it("drops the oldest scopes once the cap is reached", () => {
		for (let index = 0; index < maxLibraryScrollEntries + 4; index += 1) {
			useLibraryPreferencesStore
				.getState()
				.setScrollPosition(`ready|global|folder-${index}`, index);
		}

		const keys = Object.keys(useLibraryPreferencesStore.getState().scrollPositions);
		expect(keys.length).toBe(maxLibraryScrollEntries);
		expect(keys).not.toContain("ready|global|folder-0");
		expect(keys).toContain(`ready|global|folder-${maxLibraryScrollEntries + 3}`);
	});
});
