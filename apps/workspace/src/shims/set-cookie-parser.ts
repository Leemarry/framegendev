export function splitCookiesString(value: string | string[]) {
	if (Array.isArray(value)) return value;
	if (typeof value !== "string" || !value) return [];
	return value.split(/,(?=\s*[^;,=\s]+\s*=)/);
}
