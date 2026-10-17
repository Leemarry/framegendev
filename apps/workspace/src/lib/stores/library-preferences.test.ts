import { describe, expect, it } from "vitest";
import {
	clampLibraryThumbnailSize,
	defaultLibraryThumbnailSize,
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
});
