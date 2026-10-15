import httpClient from "@/shared/lib/http";

export interface AssetLibraryFolder {
	id: string;
	projectId: string;
	parentId: string;
	name: string;
	createdAt: string;
	updatedAt: string;
}

export const libraryFoldersKey = (projectId?: string | null) =>
	projectId
		? `/projects/${encodeURIComponent(projectId)}/asset-library-folders`
		: "/asset-library-folders";

export const getLibraryFolders = async (projectId?: string | null) => {
	const response = await httpClient.get<{ folders: AssetLibraryFolder[] }>(
		libraryFoldersKey(projectId),
	);
	return response.data;
};

export const createLibraryFolder = async (
	projectId: string | null,
	name: string,
	parentId: string,
) => {
	const response = await httpClient.post<AssetLibraryFolder>(libraryFoldersKey(projectId), {
		name,
		parentId,
	});
	return response.data;
};

export const renameLibraryFolder = async (projectId: string | null, id: string, name: string) => {
	const response = await httpClient.put<AssetLibraryFolder>(
		`${libraryFoldersKey(projectId)}/${encodeURIComponent(id)}`,
		{ name },
	);
	return response.data;
};

export const deleteLibraryFolder = async (projectId: string | null, id: string) => {
	const response = await httpClient.delete<void>(
		`${libraryFoldersKey(projectId)}/${encodeURIComponent(id)}`,
	);
	return response.data;
};

export const reparentLibraryFolder = async (
	projectId: string | null,
	id: string,
	newParentId: string,
) => {
	const response = await httpClient.patch<AssetLibraryFolder>(
		`${libraryFoldersKey(projectId)}/${encodeURIComponent(id)}`,
		{ newParentId },
	);
	return response.data;
};
