import type { DocumentHistoryDiffLine } from "@/domains/workspace/api/workspace";
import {
	historyChangeStarts,
	parallelHistoryRows,
} from "@/domains/documents/lib/document-history-diff";
import { cn } from "@/shared/lib/utils";

export const DocumentHistoryDiff = ({
	lines,
	parallel,
}: {
	lines: DocumentHistoryDiffLine[];
	parallel: boolean;
}) => {
	const starts = new Set(historyChangeStarts(lines));
	if (!starts.size)
		return <p className="p-4 text-sm text-muted-foreground">两个版本的正文内容一致。</p>;
	return (
		<div className="min-w-0 py-2 font-mono text-xs leading-5">
			{parallel
				? parallelHistoryRows(lines).map((row, index) => (
						<div key={index} data-change-start={row.changeStart} className="grid grid-cols-2">
							<ParallelCell line={row.before} before />
							<ParallelCell line={row.after} />
						</div>
					))
				: lines.map((line, index) => (
						<div
							key={index}
							data-change-start={starts.has(index) ? index : undefined}
							className={cn("grid grid-cols-[2rem_2rem_minmax(0,1fr)] px-2", lineColor(line))}
						>
							<span className="select-none pr-2 text-right text-muted-foreground">
								{line.oldLine}
							</span>
							<span className="select-none pr-2 text-right text-muted-foreground">
								{line.newLine}
							</span>
							<span className="min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
								{line.type === "added" ? "+ " : line.type === "removed" ? "- " : "  "}
								{line.text || " "}
							</span>
						</div>
					))}
		</div>
	);
};

const lineColor = (line?: DocumentHistoryDiffLine) =>
	line?.type === "added"
		? "bg-success-surface text-success-foreground"
		: line?.type === "removed"
			? "bg-error-surface text-error-foreground"
			: "text-muted-foreground";

const ParallelCell = ({ line, before }: { line?: DocumentHistoryDiffLine; before?: boolean }) => (
	<div
		className={cn(
			"grid min-w-0 grid-cols-[2rem_minmax(0,1fr)] px-1",
			before && "border-r border-border",
			lineColor(line),
		)}
	>
		<span className="select-none pr-2 text-right text-muted-foreground">
			{before ? line?.oldLine : line?.newLine}
		</span>
		<span className="min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
			{line?.text || " "}
		</span>
	</div>
);
