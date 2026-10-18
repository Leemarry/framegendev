import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { CommentsGutter } from "./CommentsGutter";
import { useAgentStore } from "@/domains/agent/stores";
import { useDocumentsStore } from "@/domains/documents/stores";
import { useProjectStore } from "@/domains/projects/stores";
import { createTextAnchor } from "@/domains/documents/lib/operations";

const LocationProbe = () => {
	const location = useLocation();
	return <output data-testid="route">{location.pathname + location.search}</output>;
};

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	vi.restoreAllMocks();
	useAgentStore.getState().resetSession();
});

it("anchors formatted multi-block selections and moves their cards with document scrolling", async () => {
	const quote = "人物 唐僧：话多 悟空：急躁";
	const comment = {
		id: "anchored",
		body: "补充人物描述",
		anchorText: quote,
		anchor: createTextAnchor("", quote),
		resolved: false,
		createdAt: "2026-10-16",
	};
	useDocumentsStore.setState({
		projectId: "project",
		activeDocumentId: "doc",
		activeCommentId: null,
		pendingComment: null,
		selection: null,
		showComments: true,
		documents: [
			{
				id: "doc",
				title: "Document",
				content: "## 人物\n\n- **唐僧**：话多\n- **悟空**：急躁",
				parentId: null,
				sortOrder: 0,
				version: 1,
				updatedAt: "2026-10-16",
				isDirty: false,
				workbenchDraft: null,
				comments: [
					comment,
					{ ...comment, id: "deleted", anchor: createTextAnchor("", "人物 唐僧：原文已删除") },
				],
			},
		],
	});
	vi.spyOn(Range.prototype, "getClientRects").mockImplementation(() => {
		const scrollTop = document.querySelector("main")?.scrollTop ?? 0;
		const rect = new DOMRect(0, 240 - scrollTop, 100, 20);
		return {
			0: rect,
			length: 1,
			item: (index: number) => (index === 0 ? rect : null),
			[Symbol.iterator]: () => [rect].values(),
		};
	});
	const { container } = render(
		<>
			<main data-document-scroll-container="">
				<div className="tiptap-content">
					<h2>人物</h2>
					<ul>
						<li>
							<strong>唐僧</strong>：话多
						</li>
						<li>
							<strong>悟空</strong>：急躁
						</li>
					</ul>
				</div>
			</main>
			<CommentsGutter />
		</>,
	);
	await screen.findByRole("tab", { name: "正文 1" });
	expect(screen.getByRole("tab", { name: "悬空 1" })).toBeInTheDocument();
	const header = screen.getByRole("banner", { name: "批注工具栏" });
	expect(within(header).getByRole("button", { name: "交给 Agent" })).toBeInTheDocument();
	const card = container.querySelector<HTMLElement>('[data-comment-card-id="anchored"]')!;
	await waitFor(() => expect(card.style.top).toBe("240px"));
	const editor = container.querySelector("main")!;
	fireEvent.wheel(card, { deltaY: 100 });
	expect(editor.scrollTop).toBe(100);
	fireEvent.scroll(editor);
	await waitFor(() => expect(card.style.top).toBe("140px"));
	fireEvent.wheel(card, { deltaY: 200 });
	fireEvent.scroll(editor);
	await waitFor(() => expect(card.style.top).toBe("-60px"));
	// The card leaves the viewport with its paragraph instead of sticking to the pane top.
	expect(screen.getByRole("tabpanel").className).toContain("overflow-hidden");
	fireEvent.click(card);
	const danglingTab = screen.getByRole("tab", { name: "悬空 1" });
	fireEvent.mouseDown(danglingTab, { button: 0, ctrlKey: false });
	await waitFor(() => expect(danglingTab).toHaveAttribute("data-state", "active"));
	fireEvent.scroll(editor);
	await waitFor(() => expect(danglingTab).toHaveAttribute("data-state", "active"));
});

it("opens Drami with the visible document's open comments without auto-sending", () => {
	const comment = {
		id: "comment",
		body: "Review",
		anchorText: "body",
		anchor: createTextAnchor("body", "body"),
		resolved: false,
		createdAt: "2026-10-16",
	};
	useProjectStore.setState({ activeProjectId: "project" });
	useDocumentsStore.setState({
		projectId: "project",
		activeDocumentId: "doc",
		activeCommentId: null,
		pendingComment: null,
		selection: null,
		showComments: true,
		documents: [
			{
				id: "doc",
				title: "Document",
				content: "body",
				parentId: null,
				sortOrder: 0,
				version: 1,
				updatedAt: "2026-10-16",
				isDirty: false,
				workbenchDraft: null,
				comments: [comment, { ...comment, id: "closed", resolved: true }],
			},
		],
	});
	render(
		<MemoryRouter
			initialEntries={[
				"/projects?projectId=project&documentId=doc&agentSessionId=session&resourcePanel=open",
			]}
		>
			<CommentsGutter />
			<LocationProbe />
		</MemoryRouter>,
	);
	fireEvent.click(screen.getByRole("button", { name: "交给 Agent" }));
	expect(screen.getByTestId("route").textContent).toBe(
		"/projects?projectId=project&documentId=doc&agentSessionId=session&resourcePanel=open",
	);
	expect(useAgentStore.getState().composerSeed).toEqual({ text: "按照评论修改", focus: true });
	fireEvent.click(screen.getByRole("button", { name: "隐藏批注" }));
	expect(useDocumentsStore.getState().showComments).toBe(false);
});
