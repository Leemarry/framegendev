import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

/** Default thumbnail edge in pixels; matches the range control in the asset library toolbar. */
export const defaultLibraryThumbnailSize = 190;
export const minLibraryThumbnailSize = 120;
export const maxLibraryThumbnailSize = 300;

/** Upper bound on remembered scroll offsets so storage cannot grow without limit. */
export const maxLibraryScrollEntries = 32;

const clampLibraryScrollOffset = (offset: number) => {
	if (!Number.isFinite(offset)) return 0;

	return Math.max(0, Math.round(offset));
};

interface LibraryPreferencesState {
	scrollPositions: Record<string, number>;
	setScrollPosition: (key: string, offset: number) => void;
	setThumbnailSize: (size: number) => void;
	thumbnailSize: number;
}

const libraryPreferencesStoreKey = "library-preferences.v1";

export const clampLibraryThumbnailSize = (size: number) => {
	if (!Number.isFinite(size)) return defaultLibraryThumbnailSize;

	return Math.min(maxLibraryThumbnailSize, Math.max(minLibraryThumbnailSize, Math.round(size)));
};

const sanitizeScrollPositions = (value: unknown): Record<string, number> => {
	if (!value || typeof value !== "object") return {};

	const entries: [string, number][] = [];
	for (const [key, offset] of Object.entries(value as Record<string, unknown>)) {
		if (typeof offset !== "number" || !Number.isFinite(offset)) continue;
		entries.push([key, clampLibraryScrollOffset(offset)]);
	}

	return Object.fromEntries(entries.slice(-maxLibraryScrollEntries));
};

export const useLibraryPreferencesStore = create<LibraryPreferencesState>()(
	persist(
		immer((set) => ({
			thumbnailSize: defaultLibraryThumbnailSize,
			scrollPositions: {},
			setThumbnailSize: (size) =>
				set((state) => {
					state.thumbnailSize = clampLibraryThumbnailSize(size);
				}),
			setScrollPosition: (key, offset) =>
				set((state) => {
					const value = clampLibraryScrollOffset(offset);
					if (state.scrollPositions[key] === value) return;
					state.scrollPositions[key] = value;
					const keys = Object.keys(state.scrollPositions);
					if (keys.length <= maxLibraryScrollEntries) return;
					for (const stale of keys.slice(0, keys.length - maxLibraryScrollEntries)) {
						delete state.scrollPositions[stale];
					}
				}),
		})),
		{
			name: libraryPreferencesStoreKey,
			storage: createJSONStorage(() => localStorage),
			version: 1,
			partialize: (state) => ({
				thumbnailSize: state.thumbnailSize,
				scrollPositions: state.scrollPositions,
			}),
			merge: (persisted, current) => {
				const saved = persisted as
					| Partial<Pick<LibraryPreferencesState, "thumbnailSize" | "scrollPositions">>
					| undefined;
				const size = saved?.thumbnailSize;
				return {
					...current,
					scrollPositions: sanitizeScrollPositions(saved?.scrollPositions),
					thumbnailSize:
						typeof size === "number" ? clampLibraryThumbnailSize(size) : current.thumbnailSize,
				};
			},
		},
	),
);
