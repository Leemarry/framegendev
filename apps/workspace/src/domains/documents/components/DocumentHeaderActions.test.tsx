import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDocumentsStore } from "@/domains/documents/stores";
import { DocumentHeaderActions } from "./DocumentHeaderActions";

vi.mock("./DocumentHistoryPanel", () => ({
	DocumentHistoryPanel: ({
		open,
		projectId,
		document,
	}: {
		open: boolean;
		projectId: string;
		document: { id: string };
	}) =>
		open ? (
			<div data-testid="history">
				{projectId}:{document.id}
			</div>
		) : null,
}));

describe("DocumentHeaderActions", () => {
	afterEach(() => {
		cleanup();
		useDocumentsStore.getState().prepareWorkspaceLoad("reset");
	});
	it("opens history for the current project/document and toggles comments without changing content", () => {
		useDocumentsStore.getState().hydrateWorkspaceDocuments({
			projectId: "p",
			workspaceDir: "/isolated",
			documents: [
				{
					id: "d",
					title: "文档",
					content: "正文",
					category: "screenplay",
					parentId: null,
					sortOrder: 0,
					updatedAt: "2026-10-14",
					version: 4,
					isDirty: false,
					comments: [],
					workbenchDraft: null,
				},
			],
			folders: [],
			assets: [],
		});
		useDocumentsStore.getState().selectDocument("d");
		useDocumentsStore.getState().setShowComments(false);
		render(<DocumentHeaderActions projectId="p" />);
		fireEvent.click(screen.getByRole("button", { name: "展开批注" }));
		expect(useDocumentsStore.getState().showComments).toBe(true);
		fireEvent.click(screen.getByRole("button", { name: "查看变更记录" }));
		expect(screen.getByTestId("history")).toHaveTextContent("p:d");
		expect(useDocumentsStore.getState().documents[0]).toMatchObject({
			content: "正文",
			version: 4,
			isDirty: false,
		});
	});
	it("does not expose history or comments for a different project", () => {
		render(<DocumentHeaderActions projectId="other" />);
		expect(screen.queryByRole("button")).toBeNull();
	});
});
