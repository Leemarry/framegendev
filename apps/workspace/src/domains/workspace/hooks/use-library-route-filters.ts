import { useCallback, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { AssetLibrarySort } from "@/domains/workspace/lib/asset-library";
import {
	type LibraryRouteFilters,
	patchLibraryRouteSearch,
	readLibraryRouteFilters,
} from "@/domains/workspace/lib/library-route-state";

/** LibraryRouteController is the page's bridge between the URL and the filters. */
export interface LibraryRouteController {
	replaceSearch: (search: string) => void;
	search: string;
}

/**
 * useLibraryRouteController exposes the current query string plus a replace-only
 * setter. Only the library page calls it, so the dialog stays router free.
 */
export const useLibraryRouteController = (): LibraryRouteController => {
	const location = useLocation();
	const navigate = useNavigate();
	const replaceSearch = useCallback(
		(search: string) => {
			navigate({ pathname: location.pathname, search }, { replace: true, state: location.state });
		},
		[location.pathname, location.state, navigate],
	);

	return { replaceSearch, search: location.search };
};

/**
 * useLibraryFilters keeps the asset library filters in the URL when the page hands
 * over a controller and in local state otherwise, so a dialog never rewrites the
 * route it was opened from.
 */
export const useLibraryFilters = (
	controller: LibraryRouteController | null,
	fallbackSort: AssetLibrarySort,
) => {
	const [localFilters, setLocalFilters] = useState<LibraryRouteFilters>(() => ({
		...readLibraryRouteFilters(""),
		sort: fallbackSort,
	}));
	const filters = controller ? readLibraryRouteFilters(controller.search) : localFilters;

	const patchFilters = useCallback(
		(patch: Partial<LibraryRouteFilters>) => {
			if (!controller) {
				setLocalFilters((previous) => ({ ...previous, ...patch }));
				return;
			}

			controller.replaceSearch(patchLibraryRouteSearch(controller.search, patch));
		},
		[controller],
	);

	return { filters, patchFilters };
};
