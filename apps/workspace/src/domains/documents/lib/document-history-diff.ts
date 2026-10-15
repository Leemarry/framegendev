import type { DocumentHistoryDiffLine } from "@/domains/workspace/api/workspace";

export interface ParallelHistoryRow {
	before?: DocumentHistoryDiffLine;
	after?: DocumentHistoryDiffLine;
	changeStart?: number;
}

export const historyChangeStarts = (lines: DocumentHistoryDiffLine[]) =>
	lines.flatMap((line, index) =>
		line.type !== "context" && (index === 0 || lines[index - 1].type === "context") ? [index] : [],
	);

/** Align each changed run without pretending unrelated lines share a source line. */
export const parallelHistoryRows = (lines: DocumentHistoryDiffLine[]): ParallelHistoryRow[] => {
	const rows: ParallelHistoryRow[] = [];
	for (let index = 0; index < lines.length; ) {
		const line = lines[index];
		if (line.type === "context") {
			rows.push({ before: line, after: line });
			index += 1;
			continue;
		}
		const start = index;
		const before: DocumentHistoryDiffLine[] = [];
		const after: DocumentHistoryDiffLine[] = [];
		while (index < lines.length && lines[index].type !== "context") {
			const changed = lines[index++];
			(changed.type === "removed" ? before : after).push(changed);
		}
		for (let row = 0; row < Math.max(before.length, after.length); row += 1) {
			rows.push({
				before: before[row],
				after: after[row],
				changeStart: row === 0 ? start : undefined,
			});
		}
	}
	return rows;
};
