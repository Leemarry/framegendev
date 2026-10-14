import type { AssetLibraryFolder } from "@/domains/workspace/api/library-folders";

export function libraryFolderPath(folders: AssetLibraryFolder[], id: string): AssetLibraryFolder[] {
	const byId = new Map(folders.map((folder) => [folder.id, folder]));
	const path: AssetLibraryFolder[] = [];
	const seen = new Set<string>();
	while (id && !seen.has(id)) {
		seen.add(id);
		const folder = byId.get(id);
		if (!folder) break;
		path.unshift(folder);
		id = folder.parentId;
	}
	return path;
}

export function libraryFolderOptions(folders: AssetLibraryFolder[]) {
	return folders
		.map((folder) => ({ folder, path: libraryFolderPath(folders, folder.id) }))
		.sort((a, b) =>
			a.path
				.map((entry) => entry.name)
				.join(" / ")
				.localeCompare(b.path.map((entry) => entry.name).join(" / "), "zh-CN"),
		);
}

export function libraryFolderNameError(name: string): string {
	const trimmed = name.trim();
	return !trimmed ||
		trimmed === "." ||
		trimmed === ".." ||
		Array.from(trimmed).length > 80 ||
		/[/\\\p{Cc}]/u.test(trimmed)
		? "名称需为1–80个字符，不能含路径分隔符或控制字符。"
		: "";
}
