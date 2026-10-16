import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	getWorkspaceDocuments,
	updateWorkspaceDocumentRecord,
} from "@/domains/workspace/api/workspace";
import { useDocumentsStore, type MarkdownDocument } from "@/domains/documents/stores";
import { DocumentConflictNotice } from "./DocumentConflictNotice";

vi.mock("@/domains/workspace/api/workspace", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/domains/workspace/api/workspace")>()),
	getWorkspaceDocuments: vi.fn(),
	updateWorkspaceDocumentRecord: vi.fn(),
}));

const server: MarkdownDocument = {
	id: "doc-a",
	title: "Document A",
	content: "server v5",
	parentId: null,
	sortOrder: 0,
	version: 5,
	updatedAt: "2026-10-16T02:00:00Z",
	isDirty: false,
	comments: [],
	workbenchDraft: null,
};
const sourceKey = "mediago-document-recovery-v1:old-window-a:project-a";
const draft = { ...server, content: "retained old-window draft A", version: 2, isDirty: true };
const payload = (documents = [server]) => ({
	projectId: "project-a",
	documents,
	folders: [],
	assets: [],
	workspaceDir: "/isolated/project-a",
});

beforeEach(() => {
	localStorage.clear();
	sessionStorage.clear();
	useDocumentsStore.setState({
		projectId: "project-a",
		workspaceDir: "/isolated/project-a",
		documents: [server],
		activeDocumentId: server.id,
		syncStatus: "synced",
	});
	localStorage.setItem(sourceKey, JSON.stringify([draft]));
	localStorage.setItem(
		"mediago-document-recovery-v1:old-window-b:project-a",
		JSON.stringify([{ ...draft, content: "retained draft B" }]),
	);
	vi.mocked(getWorkspaceDocuments).mockResolvedValue(payload());
});

afterEach(() => {
	cleanup();
	useDocumentsStore.getState().prepareWorkspaceLoad("reset");
	localStorage.clear();
	sessionStorage.clear();
	vi.restoreAllMocks();
	vi.clearAllMocks();
});

describe("prior-window recovery notice", () => {
	it("previews two competing drafts and cancels without any server or source write", async () => {
		render(<DocumentConflictNotice />);
		fireEvent.click(await screen.findByRole("button", { name: "查看恢复草稿" }));
		expect(screen.getByLabelText("恢复正文")).toHaveValue(draft.content);
		expect(screen.getByRole("combobox", { name: "选择恢复草稿" }).children).toHaveLength(2);
		fireEvent.click(screen.getByRole("button", { name: "取消" }));
		expect(getWorkspaceDocuments).not.toHaveBeenCalled();
		expect(updateWorkspaceDocumentRecord).not.toHaveBeenCalled();
		expect(useDocumentsStore.getState().documents).toEqual([server]);
		expect(localStorage.getItem(sourceKey)).toBe(JSON.stringify([draft]));
	});

	it("loads only the chosen draft as a paused conflict against a fresh server read", async () => {
		render(<DocumentConflictNotice />);
		fireEvent.click(await screen.findByRole("button", { name: "查看恢复草稿" }));
		const select = screen.getByRole("combobox", { name: "选择恢复草稿" });
		fireEvent.change(select, {
			target: { value: (select.children[1] as HTMLOptionElement).value },
		});
		fireEvent.click(screen.getByRole("button", { name: "载入为待合并稿" }));
		await waitFor(() =>
			expect(useDocumentsStore.getState().documents[0].saveConflict?.server).toEqual(server),
		);
		expect(useDocumentsStore.getState().documents[0].content).toBe("retained draft B");
		expect(useDocumentsStore.getState().documents[0].isDirty).toBe(true);
		expect(getWorkspaceDocuments).toHaveBeenCalledWith("project-a", ["doc-a"]);
		expect(updateWorkspaceDocumentRecord).not.toHaveBeenCalled();
		expect(localStorage.getItem(sourceKey)).toBe(JSON.stringify([draft]));
	});

	it("downloads the reviewed draft without replacing its source or writing to the server", async () => {
		const createURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:recovery");
		const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
		render(<DocumentConflictNotice />);
		fireEvent.click(await screen.findByRole("button", { name: "查看恢复草稿" }));
		fireEvent.click(screen.getByRole("button", { name: "下载恢复副本" }));
		expect(createURL).toHaveBeenCalledOnce();
		expect(createURL.mock.calls[0][0]).toBeInstanceOf(Blob);
		expect(click).toHaveBeenCalledOnce();
		expect(localStorage.getItem(sourceKey)).toBe(JSON.stringify([draft]));
		expect(Object.entries(localStorage).filter(([key]) => key.includes(":backup:"))).toEqual([
			[expect.stringContaining(":backup:doc-a"), JSON.stringify(draft)],
		]);
		expect(getWorkspaceDocuments).not.toHaveBeenCalled();
		expect(updateWorkspaceDocumentRecord).not.toHaveBeenCalled();
		expect(useDocumentsStore.getState().documents).toEqual([server]);
	});

	it("rejects staging over work already dirty in this window", async () => {
		const ownDraft = { ...server, content: "current window draft", isDirty: true };
		useDocumentsStore.setState({ documents: [ownDraft] });
		render(<DocumentConflictNotice />);
		fireEvent.click(await screen.findByRole("button", { name: "查看恢复草稿" }));
		fireEvent.click(screen.getByRole("button", { name: "载入为待合并稿" }));
		expect(screen.getByText("请先处理本窗口的未保存修改，并等待工作区加载完成")).toBeVisible();
		expect(useDocumentsStore.getState().documents).toEqual([ownDraft]);
		expect(getWorkspaceDocuments).not.toHaveBeenCalled();
		expect(updateWorkspaceDocumentRecord).not.toHaveBeenCalled();
	});

	it("keeps the existing dirty draft when the server read is pending", async () => {
		let complete: ((value: ReturnType<typeof payload>) => void) | undefined;
		vi.mocked(getWorkspaceDocuments).mockImplementation(
			() =>
				new Promise((resolve) => {
					complete = resolve;
				}),
		);
		render(<DocumentConflictNotice />);
		fireEvent.click(await screen.findByRole("button", { name: "查看恢复草稿" }));
		fireEvent.click(screen.getByRole("button", { name: "载入为待合并稿" }));
		useDocumentsStore.setState({
			documents: [{ ...server, content: "new local work", isDirty: true }],
		});
		complete?.(payload());
		expect(await screen.findByText("本窗口已有未保存修改，请先处理后再载入草稿")).toBeVisible();
		expect(useDocumentsStore.getState().documents[0].content).toBe("new local work");
		expect(updateWorkspaceDocumentRecord).not.toHaveBeenCalled();
	});

	it("retains a missing remote document as downloadable paused local work", async () => {
		vi.mocked(getWorkspaceDocuments).mockResolvedValue(payload([]));
		useDocumentsStore.setState({ documents: [] });
		render(<DocumentConflictNotice />);
		fireEvent.click(await screen.findByRole("button", { name: "查看恢复草稿" }));
		expect(screen.getByText("当前项目未找到此文档，副本仍可下载。")).toBeVisible();
		fireEvent.click(screen.getByRole("button", { name: "载入为待合并稿" }));
		await waitFor(() =>
			expect(useDocumentsStore.getState().documents[0].saveConflict).toEqual({ server: null }),
		);
		expect(useDocumentsStore.getState().documents[0].content).toBe(draft.content);
		expect(updateWorkspaceDocumentRecord).not.toHaveBeenCalled();
	});

	it("does not stage a draft after request failure or a project switch", async () => {
		vi.mocked(getWorkspaceDocuments).mockRejectedValueOnce(new Error("offline recovery read"));
		render(<DocumentConflictNotice />);
		fireEvent.click(await screen.findByRole("button", { name: "查看恢复草稿" }));
		fireEvent.click(screen.getByRole("button", { name: "载入为待合并稿" }));
		expect(await screen.findByText("offline recovery read")).toBeVisible();
		expect(useDocumentsStore.getState().documents).toEqual([server]);
		let complete: ((value: ReturnType<typeof payload>) => void) | undefined;
		vi.mocked(getWorkspaceDocuments).mockImplementation(
			() =>
				new Promise((resolve) => {
					complete = resolve;
				}),
		);
		fireEvent.click(screen.getByRole("button", { name: "载入为待合并稿" }));
		useDocumentsStore.setState({ projectId: "project-b", documents: [] });
		complete?.(payload());
		await waitFor(() => expect(useDocumentsStore.getState().projectId).toBe("project-b"));
		expect(useDocumentsStore.getState().documents).toEqual([]);
		expect(localStorage.getItem(sourceKey)).toBe(JSON.stringify([draft]));
	});
});
