import {
	getWorkspaceDocuments,
	updateWorkspaceDocumentRecord,
} from "@/domains/workspace/api/workspace";
import type { ApiError } from "@/types/api";
import type { DocumentsGet, DocumentsSet } from "./action-types";
import type { MarkdownDocument } from "./types";

/**
 * Serialized per-document autosave queue.
 *
 * Invariants:
 * - At most one PATCH is in flight per document, so requests can never arrive
 *   out of order and race each other into spurious version conflicts.
 * - `document.version` in the store always holds the last server-confirmed
 *   version (the save base); local edits never bump it optimistically.
 * - `isDirty` is only cleared after the server acknowledged the exact content
 *   that is still current — never on a timer, never optimistically.
 * - Failures keep the local copy and the dirty flag; the user's typed content
 *   is never rolled back to an older snapshot.
 */

interface DocumentSaveTask {
	running: boolean;
	rerun: boolean;
	retryTimer: ReturnType<typeof setTimeout> | null;
	sent?: MarkdownDocument;
}

export interface DocumentSaveQueueContext {
	get: DocumentsGet;
	set: DocumentsSet;
}

const saveTasks = new Map<string, DocumentSaveTask>();

const maxSaveAttemptsPerBurst = 3;
let saveRetryDelayMs = 2000;
let saveBackgroundRetryDelayMs = 10000;

/** Test hook: shrink the transient-failure retry delay so specs stay fast. */
export const setDocumentSaveRetryDelayForTests = (delayMs: number) => {
	saveRetryDelayMs = delayMs;
};

/** Test hook: shrink the background retry delay so specs stay fast. */
export const setDocumentSaveBackgroundRetryDelayForTests = (delayMs: number) => {
	saveBackgroundRetryDelayMs = delayMs;
};

/** Test hook: forget all in-memory queue state between specs. */
export const resetDocumentSaveQueueForTests = () => {
	for (const task of saveTasks.values()) {
		if (task.retryTimer) clearTimeout(task.retryTimer);
	}
	saveTasks.clear();
	saveRetryDelayMs = 2000;
	saveBackgroundRetryDelayMs = 10000;
};

/**
 * Request persistence of a document's current store state. Coalesces bursts of
 * edits: if a save is already in flight the queue re-reads the latest content
 * once the in-flight request settles.
 */
export const scheduleDocumentSave = (context: DocumentSaveQueueContext, documentId: string) => {
	const projectId = context.get().projectId;
	if (!projectId) return;
	if (context.get().documents.find((document) => document.id === documentId)?.saveConflict) return;
	const key = JSON.stringify([projectId, documentId]);
	const task = saveTasks.get(key) ?? { running: false, rerun: false, retryTimer: null };
	saveTasks.set(key, task);
	if (task.retryTimer) {
		clearTimeout(task.retryTimer);
		task.retryTimer = null;
	}
	if (task.running) {
		task.rerun = true;
		return;
	}
	task.running = true;
	void runDocumentSaveLoop(context, projectId, documentId, task).finally(() => {
		task.running = false;
		if (task.rerun && context.get().projectId === projectId) {
			task.rerun = false;
			scheduleDocumentSave(context, documentId);
		}
	});
};

const runDocumentSaveLoop = async (
	context: DocumentSaveQueueContext,
	projectId: string,
	documentId: string,
	task: DocumentSaveTask,
) => {
	let attempts = 0;
	while (true) {
		task.rerun = false;
		const state = context.get();
		if (state.projectId !== projectId) return;
		const document = state.documents.find((item) => item.id === documentId);
		if (!document || !document.isDirty || !projectId || document.saveConflict) return;

		try {
			task.sent = document;
			const { document: saved } = await updateWorkspaceDocumentRecord(
				documentId,
				{
					title: document.title,
					content: document.content,
					parentId: document.parentId,
					folderId: document.folderId,
					sortOrder: document.sortOrder,
					category: document.category,
					comments: document.comments,
					workbenchDraft: document.workbenchDraft,
					isDirty: false,
					expectedVersion: document.version,
				},
				projectId,
			);
			attempts = 0;
			acknowledgeDocumentSave(context, documentId, projectId, document, saved);
		} catch (error) {
			attempts += 1;
			if (isVersionConflictError(error)) {
				context.set((state) =>
					state.projectId !== projectId
						? state
						: {
								documents: state.documents.map((item) =>
									item.id === documentId
										? { ...item, saveConflict: item.saveConflict ?? { server: null } }
										: item,
								),
							},
				);
				markSaveFailed(context, projectId, "文档保存冲突，自动保存已暂停，本地修改已保留");
				await refreshDocumentConflict(context, documentId, projectId);
				return;
			}
			if (attempts >= maxSaveAttemptsPerBurst) {
				markSaveFailed(context, projectId, "文档保存失败，本地修改已保留，稍后自动重试");
				scheduleBackgroundRetry(context, projectId, documentId, task);
				return;
			}
			await sleep(saveRetryDelayMs);
		} finally {
			task.sent = undefined;
		}
	}
};

/**
 * Adopt the server-confirmed version. The dirty flag is cleared only when the
 * store still holds exactly the content that was sent; otherwise the newer
 * local edits stay dirty and the loop immediately saves them next.
 */
export const acknowledgeDocumentSave = (
	context: DocumentSaveQueueContext,
	documentId: string,
	projectId: string,
	sent: MarkdownDocument,
	saved: MarkdownDocument,
) => {
	context.set((state) => {
		if (state.projectId !== projectId) return state;
		let allClean = true;
		const documents = state.documents.map((document) => {
			if (document.id !== documentId) {
				if (document.isDirty) allClean = false;
				return document;
			}
			if (document.saveConflict) {
				allClean = false;
				return document;
			}
			const unchangedSinceSend =
				!document.saveConflict && persistedFields(document) === persistedFields(sent);
			if (!unchangedSinceSend) allClean = false;
			return {
				...document,
				version: saved.version,
				updatedAt: saved.updatedAt || document.updatedAt,
				filename: saved.filename ?? document.filename,
				isDirty: !unchangedSinceSend,
			};
		});
		return allClean
			? { documents, syncStatus: "synced", syncMessage: "文档已保存" }
			: { documents };
	});
};

const scheduleBackgroundRetry = (
	context: DocumentSaveQueueContext,
	projectId: string,
	documentId: string,
	task: DocumentSaveTask,
) => {
	if (task.retryTimer) return;
	task.retryTimer = setTimeout(() => {
		task.retryTimer = null;
		if (context.get().projectId === projectId) scheduleDocumentSave(context, documentId);
	}, saveBackgroundRetryDelayMs);
};

/**
 * After a version conflict, fetch the server's current version for the
 * document without adopting it as the save base or changing local content.
 */
export const refreshDocumentConflict = async (
	context: DocumentSaveQueueContext,
	documentId: string,
	projectId: string,
) => {
	try {
		const payload = await getWorkspaceDocuments(projectId, [documentId]);
		const serverDocument = payload.documents.find((item) => item.id === documentId);
		if (!serverDocument) return false;
		context.set((state) => {
			if (state.projectId !== projectId) return state;
			return {
				documents: state.documents.map((document) =>
					document.id === documentId && document.isDirty
						? { ...document, saveConflict: { server: serverDocument } }
						: document,
				),
			};
		});
		return true;
	} catch {
		return false;
	}
};

const persistedFields = (document: MarkdownDocument) =>
	JSON.stringify(
		[
			document.title,
			document.content,
			document.parentId,
			document.folderId ?? null,
			document.sortOrder,
			document.category,
			document.comments.map((comment) => ({
				...comment,
				updatedAt: comment.updatedAt ?? comment.createdAt,
			})),
			document.workbenchDraft,
		],
		(_key, value: unknown) =>
			value && typeof value === "object" && !Array.isArray(value)
				? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))
				: value,
	);

export const isDocumentSaveEcho = (incoming: MarkdownDocument, projectId: string | null) => {
	const sent = saveTasks.get(JSON.stringify([projectId, incoming.id]))?.sent;
	return Boolean(
		sent &&
		incoming.version === sent.version + 1 &&
		persistedFields(incoming) === persistedFields(sent),
	);
};

/** Resolving against the displayed version deliberately allows a fresh 409. */
export const resolveDocumentConflict = (
	context: DocumentSaveQueueContext,
	documentId: string,
	server: MarkdownDocument,
	merged?: { title: string; content: string },
) => {
	context.set((state) => ({
		documents: state.documents.map((local) => {
			if (local.id !== documentId || !local.saveConflict) return local;
			if (!merged) return { ...server, isDirty: false, saveConflict: undefined };
			const comments = new Map(server.comments.map((comment) => [comment.id, comment]));
			for (const comment of local.comments) comments.set(comment.id, comment);
			return {
				...server,
				...merged,
				comments: [...comments.values()],
				isDirty: true,
				saveConflict: undefined,
			};
		}),
	}));
	if (merged) scheduleDocumentSave(context, documentId);
	else if (!context.get().documents.some((document) => document.isDirty)) {
		context.get().markWorkspaceSyncStatus("synced", "已重载服务器版本，本地副本已保留");
	}
};

const markSaveFailed = (context: DocumentSaveQueueContext, projectId: string, message: string) => {
	const state = context.get();
	if (state.projectId !== projectId) return;
	state.markWorkspaceSyncStatus("error", message);
};

const isVersionConflictError = (error: unknown) =>
	typeof error === "object" && error !== null && (error as ApiError).code === 409;

const sleep = (delayMs: number) =>
	new Promise<void>((resolve) => {
		setTimeout(resolve, delayMs);
	});
