import { describe, expect, it } from "vitest";
import {
	mediaReferenceKindLabel,
	mediaReferencePath,
	mediaReferenceTitle,
} from "./library-references";

describe("library reference labels", () => {
	it("maps the official use kinds and falls back to the project usage label", () => {
		expect(mediaReferenceKindLabel("selected-resource")).toBe("已选资源");
		expect(mediaReferenceKindLabel("document-binding")).toBe("文档使用");
		expect(mediaReferenceKindLabel("generation-output")).toBe("生成结果");
		expect(mediaReferenceKindLabel("unknown-kind")).toBe("项目引用");
		expect(mediaReferenceKindLabel(undefined)).toBe("项目引用");
	});

	it("prefers the label, then the resource title, then the project name", () => {
		expect(
			mediaReferenceTitle({
				label: "主角",
				projectId: "p1",
				projectName: "项目甲",
				resourceTitle: "旧标题",
			}),
		).toBe("主角");
		expect(
			mediaReferenceTitle({ projectId: "p1", projectName: "项目甲", resourceTitle: "场景" }),
		).toBe("场景");
		expect(mediaReferenceTitle({ projectId: "p1", projectName: "项目甲" })).toBe("项目甲");
		expect(mediaReferenceTitle({ projectId: "p1" })).toBe("p1");
	});

	it("links only live usages that carry a document", () => {
		expect(mediaReferencePath({ projectId: "p1", documentId: "doc-a" })).toBe(
			"/projects?projectId=p1&documentId=doc-a",
		);
		expect(mediaReferencePath({ projectId: "p1" })).toBeNull();
		expect(mediaReferencePath({ projectId: "p1", documentId: "  " })).toBeNull();
		expect(mediaReferencePath({ projectId: "p1", documentId: "doc-a", removed: true })).toBeNull();
		expect(mediaReferencePath({ projectId: "  ", documentId: "doc-a" })).toBeNull();
	});
});
