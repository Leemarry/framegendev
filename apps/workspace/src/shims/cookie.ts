type CookieOptions = {
	encode?: (value: string) => string;
	maxAge?: number;
	domain?: string;
	path?: string;
	expires?: Date;
	httpOnly?: boolean;
	secure?: boolean;
	sameSite?: boolean | "lax" | "strict" | "none";
};

export function parse(header: string, options: { decode?: (value: string) => string } = {}) {
	const decode = options.decode ?? decodeURIComponent;
	return Object.fromEntries(
		header.split(";").flatMap((part) => {
			const separator = part.indexOf("=");
			if (separator < 1) return [];
			const name = part.slice(0, separator).trim();
			const value = part.slice(separator + 1).trim();
			try {
				return [[name, decode(value)]];
			} catch {
				return [[name, value]];
			}
		}),
	);
}

export function serialize(name: string, value: string, options: CookieOptions = {}) {
	const encode = options.encode ?? encodeURIComponent;
	let result = `${name}=${encode(value)}`;
	if (options.maxAge !== undefined) result += `; Max-Age=${Math.floor(options.maxAge)}`;
	if (options.domain) result += `; Domain=${options.domain}`;
	if (options.path) result += `; Path=${options.path}`;
	if (options.expires) result += `; Expires=${options.expires.toUTCString()}`;
	if (options.httpOnly) result += "; HttpOnly";
	if (options.secure) result += "; Secure";
	if (options.sameSite) {
		const sameSite =
			options.sameSite === true
				? "Strict"
				: options.sameSite[0].toUpperCase() + options.sameSite.slice(1);
		result += `; SameSite=${sameSite}`;
	}
	return result;
}
