import { beforeEach, expect, it, vi } from "vitest";
import httpClient from "@/shared/lib/http";
import {
	createLibraryFolder,
	deleteLibraryFolder,
	getLibraryFolders,
	renameLibraryFolder,
	reparentLibraryFolder,
} from "./library-folders";
import {
	getMediaAssetReferences,
	mediaAssetReferencesPath,
	mediaAssetsScanPath,
	scanMediaAssets,
	uploadMediaAsset,
	updateMediaAssetFields,
	updateMediaAssetMetadata,
} from "./media";

vi.mock("@/shared/lib/http", () => ({
	default: { delete: vi.fn(), get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}));
beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(httpClient.get).mockResolvedValue({
		data: { folders: [] },
		success: true,
		code: 0,
		message: "",
	});
	vi.mocked(httpClient.post).mockResolvedValue({ data: {}, success: true, code: 0, message: "" });
	vi.mocked(httpClient.put).mockResolvedValue({ data: {}, success: true, code: 0, message: "" });
	vi.mocked(httpClient.patch).mockResolvedValue({ data: {}, success: true, code: 0, message: "" });
	vi.mocked(httpClient.delete).mockResolvedValue({
		data: undefined,
		success: true,
		code: 0,
		message: "",
	});
});

it("uses encoded project/global folder routes and a creation-only parent", async () => {
	await getLibraryFolders();
	expect(httpClient.get).toHaveBeenCalledWith("/asset-library-folders");
	await createLibraryFolder("project/a", "人物", "parent");
	expect(httpClient.post).toHaveBeenCalledWith("/projects/project%2Fa/asset-library-folders", {
		name: "人物",
		parentId: "parent",
	});
	await renameLibraryFolder(null, "folder/a", "角色");
	expect(httpClient.put).toHaveBeenCalledWith("/asset-library-folders/folder%2Fa", {
		name: "角色",
	});
	await deleteLibraryFolder("project/a", "folder/a");
	expect(httpClient.delete).toHaveBeenCalledWith(
		"/projects/project%2Fa/asset-library-folders/folder%2Fa",
	);
});

it("uploads with the destination in multipart and shares the scoped media patch contract", async () => {
	const file = new File(["bytes"], "image.png", { type: "image/png" });
	await uploadMediaAsset(file, "project/a", "folder-a");
	const call = vi.mocked(httpClient.post).mock.calls[0];
	expect(call[0]).toBe("/projects/project%2Fa/media-assets");
	expect(call[1]).toBeInstanceOf(FormData);
	const form = call[1] as FormData;
	expect(form.get("file")).toBe(file);
	expect(form.get("folderId")).toBe("folder-a");
	await updateMediaAssetFields("asset/a", { folderId: "" }, "project/a");
	expect(httpClient.put).toHaveBeenCalledWith("/projects/project%2Fa/media-assets/asset%2Fa", {
		folderId: "",
	});
	await updateMediaAssetMetadata("global", { tags: [], note: "", rating: 0 });
	expect(httpClient.put).toHaveBeenCalledWith("/media-assets/global", {
		tags: [],
		note: "",
		rating: 0,
	});
});

it("reparents folders through scoped PATCH routes including a move to root", async () => {
	await reparentLibraryFolder("project/a", "folder/a", "parent");
	expect(httpClient.patch).toHaveBeenCalledWith(
		"/projects/project%2Fa/asset-library-folders/folder%2Fa",
		{ newParentId: "parent" },
	);
	await reparentLibraryFolder(null, "folder/a", "");
	expect(httpClient.patch).toHaveBeenCalledWith("/asset-library-folders/folder%2Fa", {
		newParentId: "",
	});
});

it("resolves reference routes by asset scope and keeps an empty path when there is no asset", async () => {
	expect(mediaAssetReferencesPath("", "project/a")).toBeNull();
	expect(mediaAssetReferencesPath(null)).toBeNull();
	expect(mediaAssetReferencesPath("asset/a")).toBe("/media-assets/asset%2Fa/references");
	expect(mediaAssetReferencesPath("asset/a", "project/a")).toBe(
		"/projects/project%2Fa/media-assets/asset%2Fa/references",
	);

	vi.mocked(httpClient.get).mockResolvedValue({
		data: { references: [] },
		success: true,
		code: 0,
		message: "",
	});
	await getMediaAssetReferences("asset/a", "project/a");
	expect(httpClient.get).toHaveBeenCalledWith(
		"/projects/project%2Fa/media-assets/asset%2Fa/references",
	);
	await getMediaAssetReferences("global/asset");
	expect(httpClient.get).toHaveBeenCalledWith("/media-assets/global%2Fasset/references");
});

it("scans the scope library directory and keeps the project route encoded", async () => {
	expect(mediaAssetsScanPath()).toBe("/media-assets/scan");
	expect(mediaAssetsScanPath("project/a")).toBe("/projects/project%2Fa/media-assets/scan");

	vi.mocked(httpClient.post).mockResolvedValue({
		data: { scanned: 3, added: 1, updated: 2 },
		success: true,
		code: 0,
		message: "",
	});
	const result = await scanMediaAssets("project/a");
	expect(httpClient.post).toHaveBeenCalledWith("/projects/project%2Fa/media-assets/scan", {
		folderId: "",
	});
	expect(result).toEqual({ scanned: 3, added: 1, updated: 2 });

	await scanMediaAssets();
	expect(httpClient.post).toHaveBeenCalledWith("/media-assets/scan", { folderId: "" });
});
