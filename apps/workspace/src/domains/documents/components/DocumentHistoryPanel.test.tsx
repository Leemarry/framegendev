import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentHistoryPanel } from "./DocumentHistoryPanel";
import { useDocumentsStore, type MarkdownDocument } from "@/domains/documents/stores";
import {
	getWorkspaceDocumentHistory,
	getWorkspaceDocumentHistoryDiff,
	restoreWorkspaceDocumentHistoryVersion,
} from "@/domains/workspace/api/workspace";
import { confirmDialog } from "@/shared/components/callable/ConfirmDialog";

vi.mock("@/domains/workspace/api/workspace", async (original) => ({
	...(await original<object>()),
	getWorkspaceDocumentHistory: vi.fn(),
	getWorkspaceDocumentHistoryDiff: vi.fn(),
	restoreWorkspaceDocumentHistoryVersion: vi.fn(),
}));
vi.mock("@/shared/components/callable/ConfirmDialog", () => ({ confirmDialog: vi.fn() }));
vi.mock("@/hooks/useToast", () => ({ useToast: () => ({ success: vi.fn() }) }));

const document: MarkdownDocument = {
	id: "doc",
	title: "Document",
	content: "current",
	parentId: null,
	sortOrder: 0,
	version: 4,
	updatedAt: "2026-10-15T00:00:00Z",
	isDirty: false,
	comments: [],
	workbenchDraft: null,
};
const renderPanel = (value = document) =>
	render(
		<SWRConfig
			value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}
		>
			<DocumentHistoryPanel open projectId="project" document={value} onOpenChange={vi.fn()} />
		</SWRConfig>,
	);

describe("document history review", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		if (!HTMLElement.prototype.scrollIntoView) HTMLElement.prototype.scrollIntoView = vi.fn();
		localStorage.clear();
		useDocumentsStore.setState({ projectId: "project", documents: [document] });
		vi.mocked(getWorkspaceDocumentHistory).mockResolvedValue({
			projectId: "project",
			documentId: "doc",
			items: ["current", "old"].map((hash) => ({
				hash,
				summary: hash,
				message: hash,
				documentIds: ["doc"],
				paths: [],
				createdAt: document.updatedAt,
			})),
		});
		vi.mocked(getWorkspaceDocumentHistoryDiff).mockResolvedValue({
			projectId: "project",
			documentId: "doc",
			diff: {
				documentId: "doc",
				from: {
					hash: "old",
					documentId: "doc",
					title: "Document",
					content: "# Historical heading\n\n  exact **source**  \n",
					path: "doc.md",
					createdAt: document.updatedAt,
				},
				to: {
					hash: "current",
					documentId: "doc",
					title: "Document",
					content: "current",
					path: "doc.md",
					createdAt: document.updatedAt,
				},
				lines: [
					{ type: "removed", text: "old", oldLine: 1 },
					{ type: "added", text: "current", newLine: 1 },
				],
			},
		});
	});
	afterEach(cleanup);
	it("keeps dropdown/sidebar selection and current comparison synchronized without writing", async () => {
		const base = await vi.mocked(getWorkspaceDocumentHistoryDiff)(
			"doc",
			"current",
			"project",
			"old",
		);
		vi.mocked(getWorkspaceDocumentHistoryDiff).mockImplementation(
			async (_id, _to, _project, from) => ({
				...base,
				diff: {
					...base.diff,
					from: from === "current" ? base.diff.to : base.diff.from,
					lines: from === "current" ? [] : base.diff.lines,
				},
			}),
		);
		renderPanel();
		await waitFor(() => expect(screen.getByRole("button", { name: "恢复所选版本" })).toBeEnabled());
		const selector = screen.getByRole("combobox", { name: "选择历史版本" });
		expect(selector).toHaveTextContent("old");
		fireEvent.keyDown(selector, { key: "ArrowDown" });
		fireEvent.click(await screen.findByRole("option", { name: /当前版本/ }));
		await waitFor(() =>
			expect(getWorkspaceDocumentHistoryDiff).toHaveBeenLastCalledWith(
				"doc",
				"current",
				"project",
				"current",
			),
		);
		expect(screen.getByRole("button", { name: /^当前版本/ })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		expect(screen.getByRole("button", { name: "恢复所选版本" })).toBeDisabled();
		fireEvent.click(screen.getByRole("button", { name: /^old/ }));
		await waitFor(() => expect(selector).toHaveTextContent("old"));
		await waitFor(() => expect(screen.getByRole("button", { name: "恢复所选版本" })).toBeEnabled());
		expect(useDocumentsStore.getState().documents[0]).toEqual(document);
		expect(restoreWorkspaceDocumentHistoryVersion).not.toHaveBeenCalled();
	});
	it("does not show or restore a snapshot returned for a different document", async () => {
		const response = await vi.mocked(getWorkspaceDocumentHistoryDiff)(
			"doc",
			"current",
			"project",
			"old",
		);
		vi.mocked(getWorkspaceDocumentHistoryDiff).mockResolvedValue({
			...response,
			documentId: "other",
		});
		renderPanel();
		await waitFor(() => expect(getWorkspaceDocumentHistoryDiff).toHaveBeenCalled());
		fireEvent.mouseDown(screen.getByRole("tab", { name: "源文件" }), { button: 0, ctrlKey: false });
		expect(screen.queryByLabelText("历史版本源文件")).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "恢复所选版本" })).toBeDisabled();
	});
	it("reads complete historical content and exact source without changing the restore target or document", async () => {
		renderPanel();
		await waitFor(() => expect(screen.getByRole("button", { name: "恢复所选版本" })).toBeEnabled());
		const selector = screen.getByRole("combobox", { name: "选择文档差异内容视图" });
		expect(screen.getByRole("region", { name: "文档版本差异" })).toHaveClass("font-sans");
		fireEvent.keyDown(selector, { key: "ArrowDown" });
		fireEvent.click(await screen.findByRole("option", { name: "源文件" }));
		expect(screen.getByRole("region", { name: "文档版本差异" })).toHaveClass("font-mono");
		expect(screen.getByRole("combobox", { name: "选择历史版本" })).toHaveTextContent("old");
		fireEvent.mouseDown(screen.getByRole("tab", { name: "全文阅读" }), {
			button: 0,
			ctrlKey: false,
		});
		await screen.findByRole("heading", { name: "Historical heading" });
		expect(screen.getByLabelText("历史版本正文")).toHaveAttribute("contenteditable", "false");
		fireEvent.mouseDown(screen.getByRole("tab", { name: "源文件" }), { button: 0, ctrlKey: false });
		expect(screen.getByLabelText("历史版本源文件").textContent).toBe(
			"# Historical heading\n\n  exact **source**  \n",
		);
		expect(useDocumentsStore.getState().documents[0]).toEqual(document);
		expect(restoreWorkspaceDocumentHistoryVersion).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "恢复所选版本" }));
		vi.mocked(restoreWorkspaceDocumentHistoryVersion).mockRejectedValue({ code: 409 });
		await vi.mocked(confirmDialog).mock.calls[0][0].onConfirm?.();
		expect(restoreWorkspaceDocumentHistoryVersion).toHaveBeenCalledWith("doc", "old", "project", 4);
	});
	it("hides cached snapshot content when refresh fails and recovers on retry", async () => {
		renderPanel();
		await waitFor(() => expect(screen.getByRole("button", { name: "恢复所选版本" })).toBeEnabled());
		fireEvent.mouseDown(screen.getByRole("tab", { name: "源文件" }), { button: 0, ctrlKey: false });
		expect(screen.getByLabelText("历史版本源文件")).toBeInTheDocument();
		const response = await vi.mocked(getWorkspaceDocumentHistoryDiff).mock.results[0].value;
		vi.mocked(getWorkspaceDocumentHistoryDiff).mockRejectedValue(new Error("offline"));
		fireEvent.click(screen.getByRole("button", { name: "刷新变更记录" }));
		await screen.findByText("版本差异加载失败，请刷新重试。");
		expect(screen.queryByLabelText("历史版本源文件")).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "恢复所选版本" })).toBeDisabled();
		vi.mocked(getWorkspaceDocumentHistoryDiff).mockResolvedValue(response);
		fireEvent.click(screen.getByRole("button", { name: "刷新变更记录" }));
		await screen.findByLabelText("历史版本源文件");
		expect(useDocumentsStore.getState().documents[0]).toEqual(document);
	});
	it("compares the selected history to current and freezes the reviewed save base", async () => {
		renderPanel();
		await waitFor(() =>
			expect(getWorkspaceDocumentHistoryDiff).toHaveBeenCalledWith(
				"doc",
				"current",
				"project",
				"old",
			),
		);
		fireEvent.mouseDown(screen.getByRole("tab", { name: "合并" }), { button: 0, ctrlKey: false });
		await waitFor(() =>
			expect(
				within(screen.getByRole("region", { name: "文档版本差异" })).getByText("old").parentElement,
			).toHaveTextContent("- old"),
		);
		fireEvent.click(screen.getByRole("button", { name: "恢复所选版本" }));
		const confirmation = vi.mocked(confirmDialog).mock.calls[0][0];
		useDocumentsStore.setState({ documents: [{ ...document, version: 5 }] });
		vi.mocked(restoreWorkspaceDocumentHistoryVersion).mockRejectedValue({ code: 409 });
		expect(await confirmation.onConfirm?.()).toBeUndefined();
		expect(restoreWorkspaceDocumentHistoryVersion).toHaveBeenCalledWith("doc", "old", "project", 4);
		await screen.findByText(/文档已被修改，恢复未执行/);
	});
	it("does not send a restore when typing appears after opening confirmation", async () => {
		renderPanel();
		await waitFor(() => expect(screen.getByRole("button", { name: "恢复所选版本" })).toBeEnabled());
		fireEvent.click(screen.getByRole("button", { name: "恢复所选版本" }));
		useDocumentsStore.setState({ documents: [{ ...document, content: "local", isDirty: true }] });
		await vi.mocked(confirmDialog).mock.calls[0][0].onConfirm?.();
		expect(restoreWorkspaceDocumentHistoryVersion).not.toHaveBeenCalled();
		expect(useDocumentsStore.getState().documents[0].content).toBe("local");
	});
	it("keeps dirty documents disabled and exposes history read failures", async () => {
		vi.mocked(getWorkspaceDocumentHistory).mockRejectedValue(new Error("offline"));
		renderPanel({ ...document, isDirty: true });
		await screen.findByText("变更记录加载失败，请刷新重试。");
		expect(screen.getByRole("combobox", { name: "选择历史版本" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "恢复所选版本" })).toBeDisabled();
		fireEvent.click(screen.getByRole("button", { name: "刷新变更记录" }));
		await waitFor(() => expect(getWorkspaceDocumentHistory).toHaveBeenCalledTimes(2));
	});
});
