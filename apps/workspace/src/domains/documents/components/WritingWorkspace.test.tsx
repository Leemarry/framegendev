import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { WritingWorkspace } from "./WritingWorkspace";
import { useDocumentsStore, type MarkdownDocument } from "@/domains/documents/stores";

vi.mock("./WritingEditor", () => ({
	WritingEditor: () => <input aria-label="editor draft" defaultValue="pending selection" />,
	prewarmWritingEditorDocument: vi.fn(),
}));
vi.mock("./CommentsGutter", () => ({ CommentsGutter: () => <div>Comments</div> }));
vi.mock("@/domains/episode/components/EpisodeTimelineView", () => ({
	EpisodeTimelineView: ({ documentId }: { documentId: string }) => <div>Timeline:{documentId}</div>,
}));
const document: MarkdownDocument = {
	id: "doc",
	title: "Shots",
	content: "## Shot A\nBody",
	category: "storyboard",
	parentId: null,
	sortOrder: 0,
	version: 3,
	updatedAt: "2026-10-16",
	isDirty: false,
	comments: [],
	workbenchDraft: null,
};
const Location = () => {
	const location = useLocation();
	return (
		<output>
			{location.search}:{JSON.stringify(location.state)}
		</output>
	);
};
const show = (search = "?projectId=p&documentId=doc&other=keep") =>
	render(
		<MemoryRouter
			initialEntries={[{ pathname: "/projects", search, state: { projectView: "document" } }]}
		>
			<WritingWorkspace />
			<Location />
		</MemoryRouter>,
	);
beforeEach(() =>
	useDocumentsStore.setState({
		projectId: "p",
		activeDocumentId: "doc",
		activeAssetId: "",
		assets: [],
		documents: [{ ...document }],
	}),
);
afterEach(cleanup);

it("preserves the document editor, URL parameters, route state and stored content across modes", () => {
	show();
	const editor = screen.getByRole("textbox", { name: "editor draft" });
	fireEvent.change(editor, { target: { value: "kept transient draft" } });
	fireEvent.click(screen.getByRole("button", { name: "时间轴" }));
	expect(screen.getByText("Timeline:doc")).toBeVisible();
	expect(editor).not.toBeVisible();
	expect(screen.getByRole("status")).toHaveTextContent("other=keep&documentMode=timeline");
	expect(screen.getByRole("status")).toHaveTextContent('"projectView":"document"');
	fireEvent.click(screen.getByRole("button", { name: "正文" }));
	expect(screen.getByRole("textbox", { name: "editor draft" })).toBe(editor);
	expect(editor).toHaveValue("kept transient draft");
	expect(useDocumentsStore.getState().documents[0]).toEqual(document);
});

it.each([{ isDirty: true }, { saveConflict: { server: null } }])(
	"blocks timeline entry for unsafe document state %j",
	(patch) => {
		useDocumentsStore.setState({ documents: [{ ...document, ...patch }] });
		show("?projectId=p&documentId=doc&documentMode=timeline");
		expect(screen.getByRole("button", { name: "时间轴" })).toBeDisabled();
		expect(screen.queryByText("Timeline:doc")).toBeNull();
		expect(screen.getByRole("textbox", { name: "editor draft" })).toBeVisible();
	},
);

it("reopens a saved timeline URL and ignores timeline for non-storyboard or stale project context", () => {
	const view = show("?projectId=p&documentId=doc&documentMode=timeline");
	expect(screen.getByText("Timeline:doc")).toBeVisible();
	view.unmount();
	useDocumentsStore.setState({ documents: [{ ...document, category: "screenplay" }] });
	show("?projectId=p&documentId=doc&documentMode=timeline");
	expect(screen.queryByRole("group", { name: "分镜视图" })).toBeNull();
	expect(screen.queryByText("Timeline:doc")).toBeNull();
	cleanup();
	useDocumentsStore.setState({ documents: [document] });
	show("?projectId=other&documentId=doc&documentMode=timeline");
	expect(screen.queryByText("Timeline:doc")).toBeNull();
});
