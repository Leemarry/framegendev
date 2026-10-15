import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { DocumentHistoryDiff } from "./DocumentHistoryDiff";
import type { DocumentHistoryDiffLine } from "@/domains/workspace/api/workspace";

afterEach(cleanup);
const lines: DocumentHistoryDiffLine[] = [
	{ type: "context", text: "  unchanged  ", oldLine: 1, newLine: 1 },
	{ type: "removed", text: "# old <script>literal</script>", oldLine: 2 },
	{ type: "added", text: "# new **literal**  ", newLine: 2 },
];
it.each([true, false])(
	"switches readable/source typography without changing literal diff lines or anchors (parallel=%s)",
	(parallel) => {
		const before = structuredClone(lines);
		const view = render(<DocumentHistoryDiff lines={lines} parallel={parallel} reading />);
		const diff = screen.getByRole("region", { name: "文档版本差异" });
		expect(diff).toHaveClass("font-sans");
		expect(screen.getByText(lines[1].text, { normalizer: (value) => value }).textContent).toBe(
			lines[1].text,
		);
		expect(screen.getByText(lines[2].text, { normalizer: (value) => value }).textContent).toBe(
			lines[2].text,
		);
		expect(diff.querySelector("script")).toBeNull();
		expect(screen.getByText("+")).toBeVisible();
		expect(screen.getByText("-")).toBeVisible();
		expect(diff.querySelectorAll("[data-change-start='1']")).toHaveLength(1);
		view.rerender(<DocumentHistoryDiff lines={lines} parallel={parallel} reading={false} />);
		expect(diff).toHaveClass("font-mono");
		expect(screen.getByText(lines[1].text, { normalizer: (value) => value }).textContent).toBe(
			lines[1].text,
		);
		expect(diff.querySelectorAll("[data-change-start='1']")).toHaveLength(1);
		expect(lines).toEqual(before);
	},
);
