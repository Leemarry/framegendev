import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { DocumentHistoryVersion } from "@/domains/workspace/api/workspace";
import { DocumentHistorySnapshot } from "./DocumentHistorySnapshot";

const version: DocumentHistoryVersion = {
	hash: "old",
	documentId: "doc",
	title: "Historical snapshot",
	content:
		"# Before\n\n- Item\n\n| Key | Value |\n| --- | --- |\n| Saved | Yes |\n\n![Reference](/api/v1/media-assets/fixture/content)\n",
	path: "document.md",
	createdAt: "2026-10-16T00:00:00Z",
};

describe("historical snapshot preview", () => {
	afterEach(cleanup);
	it("uses the document schema for read-only headings, lists, tables and local images", async () => {
		render(<DocumentHistorySnapshot version={version} source={false} />);
		await screen.findByRole("heading", { name: "Before" });
		expect(screen.getByLabelText("历史版本正文")).toHaveAttribute("contenteditable", "false");
		expect(screen.getByRole("listitem")).toHaveTextContent("Item");
		expect(screen.getByRole("cell", { name: "Yes" })).toBeInTheDocument();
		expect(screen.getByAltText("Reference")).toHaveAttribute(
			"src",
			"/api/v1/media-assets/fixture/content",
		);
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});
	it.each([false, true])(
		"replaces the previous snapshot without retaining its content (source=%s)",
		async (source) => {
			const { rerender } = render(<DocumentHistorySnapshot version={version} source={source} />);
			if (source) expect(screen.getByLabelText("历史版本源文件").textContent).toBe(version.content);
			else await screen.findByRole("heading", { name: "Before" });
			rerender(
				<DocumentHistorySnapshot
					version={{ ...version, hash: "other", content: "# After" }}
					source={source}
				/>,
			);
			if (source) expect(screen.getByLabelText("历史版本源文件").textContent).toBe("# After");
			else {
				await waitFor(() =>
					expect(screen.queryByRole("heading", { name: "Before" })).not.toBeInTheDocument(),
				);
				await screen.findByRole("heading", { name: "After" });
			}
		},
	);
	it("preserves literal markup, blank lines, entities and trailing spaces in source", () => {
		const content = "  # Source\n\n&nbsp;\n<script>literal</script>  \n";
		render(<DocumentHistorySnapshot version={{ ...version, content }} source />);
		expect(screen.getByLabelText("历史版本源文件").textContent).toBe(content);
		expect(screen.queryByRole("heading")).not.toBeInTheDocument();
	});
});
