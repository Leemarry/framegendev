import { describe, expect, it } from "vitest";
import { historyChangeStarts, parallelHistoryRows } from "./document-history-diff";
import type { DocumentHistoryDiffLine } from "@/domains/workspace/api/workspace";

describe("history diff alignment", () => {
	it("aligns unequal replacements, insertions and deletions without inventing line numbers", () => {
		const lines: DocumentHistoryDiffLine[] = [
			{ type: "removed", text: "old", oldLine: 1 },
			{ type: "added", text: "new", newLine: 1 },
			{ type: "added", text: "extra", newLine: 2 },
			{ type: "context", text: "same", oldLine: 2, newLine: 3 },
			{ type: "removed", text: "deleted", oldLine: 3 },
		];
		expect(historyChangeStarts(lines)).toEqual([0, 4]);
		expect(parallelHistoryRows(lines)).toEqual([
			{ before: lines[0], after: lines[1], changeStart: 0 },
			{ before: undefined, after: lines[2], changeStart: undefined },
			{ before: lines[3], after: lines[3] },
			{ before: lines[4], after: undefined, changeStart: 4 },
		]);
	});
	it("keeps empty and unchanged bodies free of fake changes", () => {
		expect(parallelHistoryRows([])).toEqual([]);
		const lines: DocumentHistoryDiffLine[] = [
			{ type: "context", text: "", oldLine: 1, newLine: 1 },
		];
		expect(historyChangeStarts(lines)).toEqual([]);
		expect(parallelHistoryRows(lines)).toEqual([{ before: lines[0], after: lines[0] }]);
	});
});
