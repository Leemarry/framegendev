import type { DocumentHistoryDiffLine } from "@/domains/workspace/api/workspace";
import {
	historyChangeStarts,
	parallelHistoryRows,
} from "@/domains/documents/lib/document-history-diff";
import { cn } from "@/shared/lib/utils";

export const DocumentHistoryDiff = ({
	lines,
	parallel,
	reading = false,
}: {
	lines: DocumentHistoryDiffLine[];
	parallel: boolean;
	reading?: boolean;
}) => {
	const starts = new Set(historyChangeStarts(lines));
	if (!starts.size)
		return <p className="p-4 text-sm text-muted-foreground">两个版本的正文内容一致。</p>;
	return (
		<div
			role="region"
			aria-label="文档版本差异"
			className={cn("min-w-0 py-2 text-xs leading-5", reading ? "font-sans" : "font-mono")}
		>
			{parallel
				? parallelHistoryRows(lines).map((row, index) => (
						<div key={index} data-change-start={row.changeStart} className="grid grid-cols-2">
							<ParallelCell line={row.before} reading={reading} before />
							<ParallelCell line={row.after} reading={reading} />
						</div>
					))
				: lines.map((line, index) => (
						<div
							key={index}
							data-change-start={starts.has(index) ? index : undefined}
							className={cn("grid grid-cols-[2rem_2rem_minmax(0,1fr)] px-2", lineColor(line))}
						>
							<span className="select-none pr-2 text-right font-mono text-muted-foreground">
								{line.oldLine}
							</span>
							<span className="select-none pr-2 text-right font-mono text-muted-foreground">
								{line.newLine}
							</span>
							<span className="min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
								<span className="font-mono">
									{line.type === "added" ? "+ " : line.type === "removed" ? "- " : "  "}
								</span>
								<LineText line={line} reading={reading} />
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

const ParallelCell = ({
	line,
	before,
	reading,
}: {
	line?: DocumentHistoryDiffLine;
	before?: boolean;
	reading: boolean;
}) => (
	<div
		className={cn(
			"grid min-w-0 grid-cols-[2rem_1rem_minmax(0,1fr)] px-1",
			before && "border-r border-border",
			lineColor(line),
		)}
	>
		<span className="select-none pr-2 text-right font-mono text-muted-foreground">
			{before ? line?.oldLine : line?.newLine}
		</span>
		<span className="select-none font-mono">
			{line?.type === "added" ? "+" : line?.type === "removed" ? "-" : " "}
		</span>
		<span className="min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
			<LineText line={line} reading={reading} />
		</span>
	</div>
);

const LineText = ({ line, reading }: { line?: DocumentHistoryDiffLine; reading: boolean }) => (
	<span
		className={cn(
			reading && line?.type === "added" && "rounded-xs bg-success-border text-foreground",
			reading && line?.type === "removed" && "rounded-xs bg-error-border text-foreground",
		)}
	>
		{line?.text || " "}
	</span>
);
