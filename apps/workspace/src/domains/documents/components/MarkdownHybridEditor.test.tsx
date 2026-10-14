import type { Editor } from "@tiptap/core";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MarkdownHybridEditor } from "./MarkdownHybridEditor";

describe("MarkdownHybridEditor", () => {
	afterEach(() => {
		cleanup();
		delete window.mediagoDesktop;
		vi.unstubAllEnvs();
		vi.restoreAllMocks();
	});

	it.each([
		[
			"chinese",
			"基线验收剧本。仅用于隔离测试。\n\n角色：测试角色。\n\n验收：保存、刷新、重启后内容一致。",
		],
		["blank-paragraphs", "正文\n\n&nbsp;\n\n&nbsp;\n"],
		["heading", "# 中文标题"],
		["list", "- 第一项\n- 第二项"],
		["empty", ""],
		["image", "![角色图](/test.png)"],
		["table", "| 标题 |\n| --- |\n| 中文 |"],
	])("does not emit a save when opening %s without edits", async (id, value) => {
		const onChange = vi.fn();
		render(<MarkdownHybridEditor documentId={`no-edit-${id}`} value={value} onChange={onChange} />);
		await waitFor(() =>
			expect(screen.getByLabelText("Markdown 编辑器")).toHaveAttribute("contenteditable", "true"),
		);
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 250));
		});
		expect(onChange).not.toHaveBeenCalled();
	});

	it("does not save externally loaded content or comment decorations", async () => {
		const onChange = vi.fn();
		const { rerender } = render(
			<MarkdownHybridEditor documentId="external-sync" value="初始正文" onChange={onChange} />,
		);
		await waitFor(() =>
			expect(screen.getByLabelText("Markdown 编辑器")).toHaveTextContent("初始正文"),
		);
		rerender(
			<MarkdownHybridEditor
				documentId="external-sync"
				value={"# 服务端标题\n\n- 中文条目\n"}
				activeCommentId="comment-1"
				onChange={onChange}
			/>,
		);
		await waitFor(() =>
			expect(screen.getByLabelText("Markdown 编辑器")).toHaveTextContent("中文条目"),
		);
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 250));
		});
		expect(onChange).not.toHaveBeenCalled();
	});

	it("saves real edits and formatting, then reopens cached content without another save", async () => {
		vi.spyOn(window, "scrollBy").mockImplementation(() => {});
		const onChange = vi.fn();
		const { unmount } = render(
			<MarkdownHybridEditor documentId="editable-roundtrip" value="原文" onChange={onChange} />,
		);
		await waitFor(() =>
			expect(screen.getByLabelText("Markdown 编辑器")).toHaveAttribute("contenteditable", "true"),
		);
		const editor = (screen.getByLabelText("Markdown 编辑器") as HTMLElement & { editor: Editor })
			.editor;
		act(() => {
			editor.commands.insertContentAt(3, "中文新增");
		});
		await waitFor(() => expect(onChange).toHaveBeenLastCalledWith("原文中文新增"));
		act(() => {
			editor.commands.setTextSelection({ from: 1, to: 3 });
		});
		fireEvent.click(screen.getByRole("button", { name: "一级标题" }));
		await waitFor(() => expect(onChange).toHaveBeenLastCalledWith("# 原文中文新增"));
		unmount();
		onChange.mockClear();
		render(
			<MarkdownHybridEditor
				documentId="editable-roundtrip"
				value="# 原文中文新增"
				onChange={onChange}
			/>,
		);
		await waitFor(() =>
			expect(screen.getByLabelText("Markdown 编辑器")).toHaveTextContent("原文中文新增"),
		);
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 250));
		});
		expect(onChange).not.toHaveBeenCalled();
	});

	it("imprints template locks without saving and still saves body edits", async () => {
		const onChange = vi.fn();
		render(
			<MarkdownHybridEditor
				documentId="locked-no-edit"
				value={"# 模板标题\n\n\n正文\n"}
				lockedHeadingPlan={{
					count: 1,
					titles: [{ sectionId: "section_template", title: "模板标题", level: 1 }],
				}}
				onChange={onChange}
			/>,
		);
		await waitFor(() =>
			expect(screen.getByRole("heading", { name: "模板标题" })).toHaveClass(
				"template-locked-heading",
			),
		);
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 250));
		});
		expect(onChange).not.toHaveBeenCalled();
		const editor = (screen.getByLabelText("Markdown 编辑器") as HTMLElement & { editor: Editor })
			.editor;
		act(() => {
			editor.commands.insertContentAt(editor.state.doc.content.size - 1, "追加");
		});
		await waitFor(() => expect(onChange).toHaveBeenLastCalledWith("# 模板标题\n\n正文追加"));
		expect(screen.getByRole("heading", { name: "模板标题" })).toHaveClass(
			"template-locked-heading",
		);
	});

	it("renders markdown image URLs against the packaged desktop server", async () => {
		vi.stubEnv("DEV", false);
		window.mediagoDesktop = { isElectron: true } as typeof window.mediagoDesktop;

		render(
			<MarkdownHybridEditor
				documentId="doc-character"
				value="![角色图](</api/v1/media-assets/character/content>)"
				onChange={vi.fn()}
			/>,
		);

		await waitFor(() => {
			expect(screen.getByRole("img", { name: "角色图" })).toHaveAttribute(
				"src",
				"http://127.0.0.1:48273/api/v1/media-assets/character/content",
			);
		});
	});
});
