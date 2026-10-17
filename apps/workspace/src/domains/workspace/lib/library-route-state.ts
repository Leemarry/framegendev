import type {
	AssetLibraryFavoriteFilter,
	AssetLibraryKindFilter,
	AssetLibraryProvenanceFilter,
	AssetLibraryRatingFilter,
	AssetLibraryResourceFilter,
	AssetLibrarySort,
	AssetLibrarySourceFilter,
	AssetLibraryUsageFilter,
} from "@/domains/workspace/lib/asset-library";

/**
 * Asset library filter state lives in the URL so a library view can be linked and
 * survives a reload. Parameter names follow the official shell: `view`, `kind`,
 * `q`, `tag`, `sort`, `resource`, `source`, `usage`, `minRating`, `favorite`,
 * `includeDescendants` and `folder`. `source` and `sort` keep our own value space
 * because the official ones (upload/browser/…, created-desc) do not map onto our
 * media/selected and updatedDesc filters without losing information.
 */
export interface LibraryRouteFilters {
	browseScope: "directory" | "all";
	favorite: AssetLibraryFavoriteFilter;
	folderId: string;
	includeSubfolders: boolean;
	kind: AssetLibraryKindFilter;
	provenance: AssetLibraryProvenanceFilter;
	q: string;
	rating: AssetLibraryRatingFilter;
	resource: AssetLibraryResourceFilter;
	sort: AssetLibrarySort;
	source: AssetLibrarySourceFilter;
	tag: string;
	usage: AssetLibraryUsageFilter;
}

export const defaultLibraryRouteFilters: LibraryRouteFilters = {
	browseScope: "directory",
	favorite: "all",
	folderId: "",
	includeSubfolders: false,
	kind: "all",
	provenance: "all",
	q: "",
	rating: "all",
	resource: "all",
	sort: "createdDesc",
	source: "all",
	tag: "",
	usage: "all",
};

const kindValues = new Set<AssetLibraryKindFilter>([
	"all",
	"image",
	"video",
	"audio",
	"text",
	"binary",
]);
const sourceValues = new Set<AssetLibrarySourceFilter>(["all", "media", "selected"]);
const usageValues = new Set<AssetLibraryUsageFilter>([
	"all",
	"selected",
	"candidate",
	"reference",
	"unused",
]);
const provenanceValues = new Set<AssetLibraryProvenanceFilter>([
	"all",
	"local",
	"browser",
	"generated",
	"other",
	"unrecorded",
]);
const resourceValues = new Set<AssetLibraryResourceFilter>([
	"all",
	"screenplay",
	"character",
	"scene",
	"storyboard",
	"prop",
	"reference",
]);
const sortValues = new Set<AssetLibrarySort>([
	"updatedDesc",
	"createdDesc",
	"ratingDesc",
	"nameAsc",
	"sizeDesc",
]);

const pick = <T extends string>(values: Set<T>, value: string | null, fallback: T): T =>
	value && values.has(value as T) ? (value as T) : fallback;

const readRating = (params: URLSearchParams): AssetLibraryRatingFilter => {
	const rating = params.get("rating");
	if (rating === "rated") return "rated";

	// The official UI exposes a 0–5 star threshold; map it onto our rating filter.
	const minRating = Math.max(0, Math.min(5, Number(params.get("minRating")) || 0));
	if (!minRating) return "all";

	return String(minRating) as AssetLibraryRatingFilter;
};

/** readLibraryRouteFilters parses the asset library filters out of a query string. */
export const readLibraryRouteFilters = (search: string): LibraryRouteFilters => {
	const params = new URLSearchParams(search);

	return {
		browseScope: params.get("view") === "assets" ? "all" : "directory",
		favorite: params.get("favorite") === "favorite" ? "favorite" : "all",
		// `folderId` is the legacy name and stays readable until old links age out.
		folderId: params.get("folder") ?? params.get("folderId") ?? "",
		includeSubfolders: params.get("includeDescendants") === "true",
		kind: pick(kindValues, params.get("kind"), "all"),
		provenance: pick(provenanceValues, params.get("provenance"), "all"),
		q: params.get("q") ?? "",
		rating: readRating(params),
		resource: pick(resourceValues, params.get("resource"), "all"),
		sort: pick(sortValues, params.get("sort"), defaultLibraryRouteFilters.sort),
		source: pick(sourceValues, params.get("source"), "all"),
		tag: params.get("tag") ?? "",
		usage: pick(usageValues, params.get("usage"), "all"),
	};
};

/** patchLibraryRouteSearch applies a filter patch and returns the new query string. */
export const patchLibraryRouteSearch = (
	currentSearch: string,
	patch: Partial<LibraryRouteFilters>,
): string => {
	const params = new URLSearchParams(currentSearch);
	const next = { ...readLibraryRouteFilters(currentSearch), ...patch };

	writeParam(params, "view", next.browseScope === "all" ? "assets" : "");
	writeParam(params, "favorite", next.favorite === "favorite" ? "favorite" : "");
	params.delete("folderId");
	writeParam(params, "folder", next.folderId);
	writeParam(params, "includeDescendants", next.includeSubfolders ? "true" : "");
	writeParam(params, "kind", next.kind === "all" ? "" : next.kind);
	writeParam(params, "provenance", next.provenance === "all" ? "" : next.provenance);
	writeParam(params, "q", next.q);
	writeParam(params, "resource", next.resource === "all" ? "" : next.resource);
	writeParam(params, "sort", next.sort === defaultLibraryRouteFilters.sort ? "" : next.sort);
	writeParam(params, "source", next.source === "all" ? "" : next.source);
	writeParam(params, "tag", next.tag);
	writeParam(params, "usage", next.usage === "all" ? "" : next.usage);

	if (next.rating === "all") {
		params.delete("minRating");
		params.delete("rating");
	} else if (next.rating === "rated") {
		params.delete("minRating");
		params.set("rating", "rated");
	} else {
		params.delete("rating");
		params.set("minRating", next.rating);
	}

	return params.toString();
};

const writeParam = (params: URLSearchParams, key: string, value: string) => {
	if (value) params.set(key, value);
	else params.delete(key);
};
