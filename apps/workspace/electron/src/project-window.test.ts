import { describe, expect, it } from "vitest";
import { projectWindowSearch } from "./project-window";

describe("native project window route", () => {
	it("encodes an ID as a query value without accepting a route or URL", () => {
		expect(projectWindowSearch(" project-123 ")).toBe("?projectId=project-123");
		expect(projectWindowSearch("a&projectId=other#https://example.com")).toBe(
			"?projectId=a%26projectId%3Dother%23https%3A%2F%2Fexample.com",
		);
	});
	it.each([undefined, null, {}, 42, "", " ", "x\n", "x".repeat(201)])(
		"rejects malformed identifiers %j",
		(value) => {
			expect(() => projectWindowSearch(value)).toThrow("项目 ID 无效");
		},
	);
});
