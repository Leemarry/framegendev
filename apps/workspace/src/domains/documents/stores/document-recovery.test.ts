import { beforeEach, describe, expect, it } from "vitest";
import {
	archiveDocumentRecovery,
	archiveRecoveryDraft,
	listOtherWindowRecoveries,
	persistDocumentRecovery,
	recoverDocument,
} from "./document-recovery";
import type { MarkdownDocument } from "./types";

const draft: MarkdownDocument = {
	id: "doc-a",
	title: "Recovered document",
	content: "unsaved A",
	parentId: null,
	sortOrder: 0,
	version: 2,
	updatedAt: "2026-10-16T02:00:00Z",
	isDirty: true,
	comments: [],
	workbenchDraft: null,
};

beforeEach(() => {
	localStorage.clear();
	sessionStorage.clear();
});

describe("other-window document recovery", () => {
	it("archives already saved duplicates across windows while retaining their source backups", () => {
		const first = "mediago-document-recovery-v1:old-a:project-a";
		const second = "mediago-document-recovery-v1:old-b:project-a";
		for (const key of [first, second]) localStorage.setItem(key, JSON.stringify([draft]));
		persistDocumentRecovery("project-a", [{ ...draft, version: 9, isDirty: false }]);
		expect(listOtherWindowRecoveries("project-a")).toEqual([]);
		sessionStorage.clear();
		expect(listOtherWindowRecoveries("project-a")).toEqual([]);
		for (const key of [first, second]) {
			expect(localStorage.getItem(key)).toBe(JSON.stringify([draft]));
			expect(localStorage.getItem(`${key}:handled:${draft.id}`)).toBe(JSON.stringify(draft));
		}
	});

	it("does not revive a saved own-window draft as a conflict", () => {
		persistDocumentRecovery("project-a", [draft]);
		const server = { ...draft, version: 9, isDirty: false };
		expect(recoverDocument("project-a", server)).toBe(server);
	});

	it("retains changed body, comments and failed saves, and detects edits after archiving", () => {
		const key = "mediago-document-recovery-v1:old:project-a";
		localStorage.setItem(key, JSON.stringify([draft]));
		persistDocumentRecovery("project-a", [{ ...draft, content: "different", isDirty: false }]);
		expect(listOtherWindowRecoveries("project-a")).toHaveLength(1);
		persistDocumentRecovery("project-a", [draft]);
		expect(listOtherWindowRecoveries("project-a")).toHaveLength(1);
		archiveRecoveryDraft(listOtherWindowRecoveries("project-a")[0]!);
		expect(listOtherWindowRecoveries("project-a")).toEqual([]);
		localStorage.setItem(key, JSON.stringify([{ ...draft, content: "new unsaved edit" }]));
		expect(listOtherWindowRecoveries("project-a")[0]?.document.content).toBe("new unsaved edit");
	});

	it("only retires a draft when all its comments are preserved in the saved document", () => {
		const comment = {
			id: "c1",
			body: "change this",
			anchorText: "text",
			anchor: {},
			createdAt: draft.updatedAt,
			resolved: false,
		};
		const local = { ...draft, comments: [comment] } as MarkdownDocument;
		const key = "mediago-document-recovery-v1:old:project-a";
		localStorage.setItem(key, JSON.stringify([local]));
		persistDocumentRecovery("project-a", [{ ...draft, isDirty: false }]);
		expect(listOtherWindowRecoveries("project-a")).toHaveLength(1);
		persistDocumentRecovery("project-a", [
			{
				...local,
				isDirty: false,
				comments: [
					{ ...comment, documentId: draft.id },
					{ ...comment, id: "c2" },
				],
			} as MarkdownDocument,
		]);
		expect(listOtherWindowRecoveries("project-a")).toEqual([]);
	});

	it("discovers competing drafts after window identity loss without adopting or deleting either", () => {
		sessionStorage.setItem("mediago-document-recovery-v1-window", "window-a");
		persistDocumentRecovery("project-a", [draft]);
		sessionStorage.setItem("mediago-document-recovery-v1-window", "window-b");
		persistDocumentRecovery("project-a", [{ ...draft, content: "unsaved B" }]);
		const savedKeys = Object.keys(localStorage).sort();
		const savedValues = savedKeys.map((key) => localStorage.getItem(key));
		sessionStorage.clear();
		const recovered = listOtherWindowRecoveries("project-a");
		expect(recovered.map((entry) => entry.document.content).sort()).toEqual([
			"unsaved A",
			"unsaved B",
		]);
		expect(new Set(recovered.map((entry) => entry.windowId)).size).toBe(2);
		expect(Object.keys(localStorage).sort()).toEqual(savedKeys);
		expect(savedKeys.map((key) => localStorage.getItem(key))).toEqual(savedValues);
		const server = { ...draft, content: "saved server", isDirty: false, version: 5 };
		expect(recoverDocument("project-a", server)).toBe(server);
	});

	it("excludes own-window, backup, other-project, clean and malformed entries", () => {
		sessionStorage.setItem("mediago-document-recovery-v1-window", "own");
		persistDocumentRecovery("project-a", [draft]);
		archiveDocumentRecovery("project-a", draft);
		localStorage.setItem("mediago-document-recovery-v1:other:project-b", JSON.stringify([draft]));
		localStorage.setItem(
			"mediago-document-recovery-v1:clean:project-a",
			JSON.stringify([{ ...draft, isDirty: false }]),
		);
		localStorage.setItem("mediago-document-recovery-v1:broken:project-a", "{");
		localStorage.setItem("mediago-document-recovery-v1:object:project-a", JSON.stringify(draft));
		localStorage.setItem(
			"mediago-document-recovery-v1:invalid:project-a",
			JSON.stringify([{ ...draft, comments: [null] }]),
		);
		localStorage.setItem("mediago-document-recovery-v1:old:project-a", JSON.stringify([draft]));
		expect(listOtherWindowRecoveries("project-a").map((entry) => entry.windowId)).toEqual(["old"]);
	});
});
