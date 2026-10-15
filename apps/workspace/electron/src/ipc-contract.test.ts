import { describe, expect, it } from "vitest";
import { isDesktopCacheStatistics } from "./ipc-contract";

const statistics = {
	cacheBytes: 0,
	profilePath: "E:/isolated/profile",
	measuredAt: "2026-10-16T00:00:00.000Z",
};

describe("cache statistics IPC contract", () => {
	it("accepts a measured empty cache", () => {
		expect(isDesktopCacheStatistics(statistics)).toBe(true);
	});
	it.each([
		null,
		{},
		{ ...statistics, cacheBytes: -1 },
		{ ...statistics, cacheBytes: NaN },
		{ ...statistics, cacheBytes: Infinity },
		{ ...statistics, cacheBytes: 1.2 },
		{ ...statistics, cacheBytes: "0" },
		{ ...statistics, profilePath: " " },
		{ ...statistics, measuredAt: "invalid" },
	])("rejects invalid IPC data %j", (value) => {
		expect(isDesktopCacheStatistics(value)).toBe(false);
	});
});
