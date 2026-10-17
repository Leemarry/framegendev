import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

/** Default thumbnail edge in pixels; matches the range control in the asset library toolbar. */
export const defaultLibraryThumbnailSize = 190;
export const minLibraryThumbnailSize = 120;
export const maxLibraryThumbnailSize = 300;

interface LibraryPreferencesState {
	setThumbnailSize: (size: number) => void;
	thumbnailSize: number;
}

const libraryPreferencesStoreKey = "library-preferences.v1";

export const clampLibraryThumbnailSize = (size: number) => {
	if (!Number.isFinite(size)) return defaultLibraryThumbnailSize;

	return Math.min(maxLibraryThumbnailSize, Math.max(minLibraryThumbnailSize, Math.round(size)));
};

export const useLibraryPreferencesStore = create<LibraryPreferencesState>()(
	persist(
		immer((set) => ({
			thumbnailSize: defaultLibraryThumbnailSize,
			setThumbnailSize: (size) =>
				set((state) => {
					state.thumbnailSize = clampLibraryThumbnailSize(size);
				}),
		})),
		{
			name: libraryPreferencesStoreKey,
			storage: createJSONStorage(() => localStorage),
			version: 1,
			partialize: (state) => ({ thumbnailSize: state.thumbnailSize }),
			merge: (persisted, current) => {
				const size = (persisted as Partial<LibraryPreferencesState> | undefined)?.thumbnailSize;
				return {
					...current,
					thumbnailSize:
						typeof size === "number" ? clampLibraryThumbnailSize(size) : current.thumbnailSize,
				};
			},
		},
	),
);
