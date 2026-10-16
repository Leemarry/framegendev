import httpClient from "@/shared/lib/http";

export type MediaAssetKind = "image" | "video" | "audio" | "text";

export interface MediaAsset {
	usage?: { selected: boolean; candidate: boolean; reference: boolean };
	id: string;
	kind: MediaAssetKind;
	filename: string;
	tags?: string[];
	note?: string;
	rating?: number;
	favorite?: boolean;
	folderId?: string;
	mimeType: string;
	sizeBytes: number;
	url: string;
	sourceUrl?: string;
	projectId?: string;
	source?: "upload" | "generation" | "toolbox" | "preview" | string;
	conversationId?: string;
	sectionId?: string;
	relativePath?: string;
	downloadPath?: string;
	durationSeconds?: number;
	width?: number;
	height?: number;
	posterUrl?: string;
	metadataStatus?: "ready" | "failed" | string;
	metadataError?: string;
	metadataUpdatedAt?: string;
	storageStatus?: "ready" | "missing" | string;
	storageError?: string;
	createdAt: string;
	updatedAt: string;
}

export interface MediaAssetsResponse {
	assets: MediaAsset[];
}

const mediaAssetsPath = (projectId?: string | null) => {
	const id = projectId?.trim();
	return id ? `/projects/${encodeURIComponent(id)}/media-assets` : "/media-assets";
};

export const mediaAssetsKey = mediaAssetsPath();

export interface MediaAssetReference {
	projectId: string;
	projectName: string;
	documentId?: string;
	resourceTitle?: string;
	resourceType?: string;
	source?: "selection" | "document" | string;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
}

export interface MediaAssetReferencesResponse {
	references: MediaAssetReference[];
}

export const mediaAssetReferencesPath = (assetId?: string | null, projectId?: string | null) => {
	const id = assetId?.trim();
	if (!id) return null;
	const scope = projectId?.trim();
	return scope
		? `/projects/${encodeURIComponent(scope)}/media-assets/${encodeURIComponent(id)}/references`
		: `/media-assets/${encodeURIComponent(id)}/references`;
};

export const getMediaAssetReferences = async (assetId: string, projectId?: string | null) => {
	const path = mediaAssetReferencesPath(assetId, projectId);
	if (!path) throw new Error("asset id is required");
	const response = await httpClient.get<MediaAssetReferencesResponse>(path);
	return response.data;
};

export interface MediaAssetFilters {
	includeUsage?: boolean;
	kind?: "all" | MediaAssetKind;
	projectId?: string;
	q?: string;
}

export const getMediaAssets = async (filters: MediaAssetFilters = {}) => {
	const response = await httpClient.get<MediaAssetsResponse>(mediaAssetsPath(filters.projectId), {
		params: {
			includeUsage: filters.includeUsage,
			kind: filters.kind,
			q: filters.q,
		},
	});
	return response.data;
};

export interface MediaAssetScanResult {
	scanned: number;
	added: number;
	updated: number;
}

export const mediaAssetsScanPath = (projectId?: string | null) =>
	`${mediaAssetsPath(projectId)}/scan`;

/** Registers media files copied onto disk and refreshes metadata of known files. */
export const scanMediaAssets = async (projectId?: string | null, folderId?: string) => {
	const response = await httpClient.post<MediaAssetScanResult>(mediaAssetsScanPath(projectId), {
		folderId: folderId ?? "",
	});
	return response.data;
};

export const uploadMediaAsset = async (
	file: File,
	projectId?: string | null,
	folderId?: string,
) => {
	const formData = new FormData();
	formData.append("file", file);
	if (folderId !== undefined) formData.append("folderId", folderId);

	const response = await httpClient.post<MediaAsset>(mediaAssetsPath(projectId), formData, {
		headers: {
			"Content-Type": "multipart/form-data",
		},
	});
	return response.data;
};

export const deleteMediaAsset = async (id: string, projectId?: string) => {
	const response = await httpClient.delete<MediaAssetsResponse>(
		`${mediaAssetsPath(projectId)}/${encodeURIComponent(id)}`,
	);
	return response.data;
};

export const updateMediaAsset = async (id: string, filename: string, projectId?: string | null) => {
	return updateMediaAssetFields(id, { filename }, projectId);
};

export interface MediaAssetMetadataUpdate {
	tags: string[];
	note: string;
	rating: number;
	favorite?: boolean;
}

export const updateMediaAssetMetadata = async (
	id: string,
	payload: MediaAssetMetadataUpdate,
	projectId?: string | null,
) => {
	return updateMediaAssetFields(id, payload, projectId);
};

export const updateMediaAssetFields = async (
	id: string,
	payload: Partial<MediaAssetMetadataUpdate> & { filename?: string; folderId?: string },
	projectId?: string | null,
) => {
	const response = await httpClient.put<MediaAsset>(
		`${mediaAssetsPath(projectId)}/${encodeURIComponent(id)}`,
		payload,
	);
	return response.data;
};
