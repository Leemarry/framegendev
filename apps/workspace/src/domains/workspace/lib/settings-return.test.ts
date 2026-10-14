import { describe, expect, it } from "vitest";
import { OVERVIEW_SENTINEL } from "@/lib/stores/last-document";
import { resolveSettingsReturn } from "./settings-return";

describe("resolveSettingsReturn", () => {
	it("restores the exact document/session/view instead of browser history", () => {
		const target = {
			path: "/projects?projectId=p&documentId=d&agentSessionId=s",
			state: { projectView: "document" },
		};
		expect(resolveSettingsReturn({ settingsReturn: target }, "p", "other")).toEqual(target);
	});
	it("preserves a nested settings return when software settings opens inside project settings", () => {
		const target = {
			path: "/settings?projectId=p&tab=project-files",
			state: { settingsReturn: { path: "/projects?projectId=p&documentId=d" } },
		};
		expect(resolveSettingsReturn({ settingsReturn: target }, null)).toEqual(target);
	});
	it("uses the last document for direct project settings and overview for its sentinel", () => {
		expect(resolveSettingsReturn(null, "p", "d").path).toBe("/projects?projectId=p&documentId=d");
		expect(resolveSettingsReturn(null, "p", OVERVIEW_SENTINEL)).toEqual({
			path: "/projects?projectId=p",
			state: { projectView: "overview" },
		});
	});
	it("preserves existing studio return paths from software settings", () => {
		const target = { path: "/studio/image?conversation=c", state: null };
		expect(resolveSettingsReturn({ settingsReturn: target }, null)).toEqual(target);
	});
	it("rejects invalid return targets", () => {
		for (const path of ["//example.com", "https://example.com", "/\\example.com", "projects"]) {
			expect(resolveSettingsReturn({ settingsReturn: { path } }, null)).toEqual({
				path: "/",
				state: null,
			});
		}
	});
});
