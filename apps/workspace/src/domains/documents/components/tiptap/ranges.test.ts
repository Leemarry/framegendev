import { Editor } from "@tiptap/core";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import { createTextNodeRangeResolver } from "./ranges";

describe("text node range resolver", () => {
	it("selects the whole formatted, multi-paragraph quote without matching deleted text", () => {
		const editor = new Editor({
			extensions: [StarterKit, Markdown],
			content: "## 人物\n\n- **唐僧**：话多\n- **悟空**：急躁",
			contentType: "markdown",
		});
		try {
			const resolver = createTextNodeRangeResolver(editor.state.doc);
			const range = resolver.findRange("人物 唐僧：话多 悟空：急躁");
			expect(textForRange(editor, range)?.replace(/\s/g, "")).toBe("人物唐僧：话多悟空：急躁");
			expect(resolver.findRange("人物 唐僧：原文已删除")).toBeNull();
		} finally {
			editor.destroy();
		}
	});

	it("resolves multiple anchors from one ProseMirror text index", () => {
		const editor = new Editor({
			extensions: [StarterKit, Markdown],
			content: "Alpha Beta and Beta tail\n\nGamma closes",
			contentType: "markdown",
		});

		try {
			const resolver = createTextNodeRangeResolver(editor.state.doc);
			const firstBeta = resolver.findRange({
				quote: "Beta",
				contextBefore: "Alpha ",
				contextAfter: " and",
			});
			const gamma = resolver.findRange("Gamma");

			expect(textForRange(editor, firstBeta)).toBe("Beta");
			expect(textForRange(editor, gamma)).toBe("Gamma");
		} finally {
			editor.destroy();
		}
	});

	it("supports token fallback for fuzzy anchors", () => {
		const editor = new Editor({
			extensions: [StarterKit, Markdown],
			content: "Alpha Beta\n\nGamma closes",
			contentType: "markdown",
		});

		try {
			const resolver = createTextNodeRangeResolver(editor.state.doc);
			const range = resolver.findRange("Gamma missing", { fallbackToToken: true });

			expect(textForRange(editor, range)).toBe("Gamma");
		} finally {
			editor.destroy();
		}
	});
});

const textForRange = (editor: Editor, range: { from: number; to: number } | null) =>
	range ? editor.state.doc.textBetween(range.from, range.to, "\n") : null;
