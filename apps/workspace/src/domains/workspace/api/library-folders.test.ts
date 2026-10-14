import { beforeEach, expect, it, vi } from "vitest";
import httpClient from "@/shared/lib/http";
import { createLibraryFolder, getLibraryFolders, renameLibraryFolder } from "./library-folders";
import { uploadMediaAsset, updateMediaAssetFields, updateMediaAssetMetadata } from "./media";

vi.mock("@/shared/lib/http", () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
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
