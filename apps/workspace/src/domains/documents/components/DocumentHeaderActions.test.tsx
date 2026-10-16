import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import { useDocumentsStore } from "@/domains/documents/stores";
import { DocumentHeaderActions } from "./DocumentHeaderActions";

const Location = () => {
	const location = useLocation();
	return (
		<output>
			{location.search}:{JSON.stringify(location.state)}
		</output>
	);
};

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
		render(
			<MemoryRouter>
				<DocumentHeaderActions projectId="p" />
			</MemoryRouter>,
		);
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
	it("opens storyboard resources, closes comments and preserves route/document state", () => {
		const document = {
			id: "d",
			title: "Shots",
			content: "## Group\nBody",
			category: "storyboard" as const,
			parentId: null,
			sortOrder: 0,
			updatedAt: "2026-10-16",
			version: 3,
			isDirty: false,
			comments: [],
			workbenchDraft: null,
		};
		useDocumentsStore.setState({
			projectId: "p",
			activeDocumentId: "d",
			activeAssetId: "",
			documents: [document],
			showComments: true,
		});
		render(
			<MemoryRouter
				initialEntries={[
					{
						pathname: "/projects",
						search: "?projectId=p&documentId=d&keep=yes",
						state: { projectView: "document" },
					},
				]}
			>
				<DocumentHeaderActions projectId="p" />
				<Location />
			</MemoryRouter>,
		);
		fireEvent.click(screen.getByRole("button", { name: "打开资源栏" }));
		expect(useDocumentsStore.getState().showComments).toBe(false);
		expect(screen.getByRole("status")).toHaveTextContent("keep=yes&resourcePanel=open");
		expect(screen.getByRole("status")).toHaveTextContent('"projectView":"document"');
		fireEvent.click(screen.getByRole("button", { name: "关闭资源栏" }));
		expect(screen.getByRole("status")).not.toHaveTextContent("resourcePanel");
		expect(useDocumentsStore.getState().documents[0]).toEqual(document);
	});
	it("does not expose history or comments for a different project", () => {
		render(
			<MemoryRouter>
				<DocumentHeaderActions projectId="other" />
			</MemoryRouter>,
		);
		expect(screen.queryByRole("button")).toBeNull();
	});
});
