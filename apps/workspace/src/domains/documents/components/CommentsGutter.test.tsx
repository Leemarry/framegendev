import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { CommentsGutter } from "./CommentsGutter";
import { runAgentPrompt } from "@/domains/agent/lib/controller";
import { useAgentStore } from "@/domains/agent/stores";
import { useDocumentsStore } from "@/domains/documents/stores";
import { useProjectStore } from "@/domains/projects/stores";
import { createTextAnchor } from "@/domains/documents/lib/operations";

vi.mock("@/domains/agent/lib/controller", () => ({ runAgentPrompt: vi.fn() }));
afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	useAgentStore.getState().resetSession();
});

it("submits only the visible document's open comments with explicit project context", () => {
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
		<MemoryRouter>
			<CommentsGutter />
		</MemoryRouter>,
	);
	fireEvent.click(screen.getByRole("button", { name: "提交给 agent" }));
	expect(runAgentPrompt).toHaveBeenCalledWith(
		"",
		expect.objectContaining({ projectId: "project", documentId: "doc", comments: [comment] }),
	);
	fireEvent.click(screen.getByRole("button", { name: "隐藏批注" }));
	expect(useDocumentsStore.getState().showComments).toBe(false);
});
