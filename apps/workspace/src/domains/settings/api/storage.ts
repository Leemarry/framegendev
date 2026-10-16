import httpClient from "@/shared/lib/http";

export interface StorageCategoryUsage {
	id: string;
	bytes: number;
	fileCount: number;
	skippedCount: number;
	unknownCount: number;
	errorCount: number;
}

export interface StorageSnapshot {
	categories: StorageCategoryUsage[];
	bytes: number;
	fileCount: number;
	skippedCount: number;
	unknownCount: number;
	errorCount: number;
	measuredAt: string;
}

export interface PosterCacheCandidate {
	id: string;
	name: string;
	bytes: number;
	active: boolean;
	categoryId: string;
}

export interface PosterCachePreview {
	candidates: PosterCacheCandidate[];
	bytes: number;
	measuredAt: string;
}

export interface PosterCleanupOutcome {
	id: string;
	name: string;
	bytes: number;
	status: "removed" | "skipped" | "failed";
	reason?: string;
}

export interface PosterCleanupResult {
	outcomes: PosterCleanupOutcome[];
	removed: number;
	skipped: number;
	failed: number;
	bytes: number;
}

export const getStorageSnapshot = async () => {
	const response = await httpClient.get<StorageSnapshot>("/storage/statistics");
	return response.data;
};

export const previewPosterCacheCleanup = async () => {
	const response = await httpClient.post<PosterCachePreview>("/storage/poster-cache/preview");
	return response.data;
};

export const cleanupPosterCache = async (ids: string[]) => {
	const response = await httpClient.post<PosterCleanupResult>("/storage/poster-cache/cleanup", {
		ids,
	});
	return response.data;
};
