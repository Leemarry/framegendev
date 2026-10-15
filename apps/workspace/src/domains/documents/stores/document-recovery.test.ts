import { beforeEach, describe, expect, it } from "vitest";
import {
	archiveDocumentRecovery,
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
