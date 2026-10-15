export const projectWindowSearch = (value: unknown): string => {
	if (typeof value !== "string" || !value.trim() || value.length > 200 || /\p{Cc}/u.test(value)) {
		throw new Error("项目 ID 无效。");
	}
	return `?${new URLSearchParams({ projectId: value.trim() }).toString()}`;
};
