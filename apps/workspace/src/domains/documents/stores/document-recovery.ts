import type { MarkdownDocument } from "./types";

const prefix = "mediago-document-recovery-v1";
export const documentRecoveryChangedEvent = "document-recovery-changed";

const recoveryKey = (projectId: string) => {
	let windowId = sessionStorage.getItem(`${prefix}-window`);
	if (!windowId) {
		windowId = crypto.randomUUID();
		sessionStorage.setItem(`${prefix}-window`, windowId);
	}
	return `${prefix}:${windowId}:${projectId}`;
};

/** Keep each window's unsaved work separate from other windows and projects. */
export const persistDocumentRecovery = (projectId: string, documents: MarkdownDocument[]) => {
	const key = recoveryKey(projectId);
	const entries = [
		...listOtherWindowRecoveries(projectId),
		...readRecoveryAtKey(key).map((document) => ({ key, document })),
	];
	for (const entry of entries) {
		const saved = documents.find((document) => document.id === entry.document.id);
		if (
			saved &&
			!saved.isDirty &&
			!saved.saveConflict &&
			isRecoveryAlreadySaved(entry.document, saved)
		) {
			archiveRecoveryDraft(entry);
		}
	}
	const dirty = documents.filter((document) => document.isDirty);
	if (dirty.length) localStorage.setItem(key, JSON.stringify(dirty));
	else localStorage.removeItem(key);
};

const readRecoveryAtKey = (key: string): MarkdownDocument[] => {
	try {
		const raw: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
		if (!Array.isArray(raw)) return [];
		return raw.filter((draft): draft is MarkdownDocument => {
			if (!draft || typeof draft !== "object") return false;
			const local = draft as Partial<MarkdownDocument>;
			return (
				localStorage.getItem(`${key}:handled:${local.id}`) !== JSON.stringify(draft) &&
				typeof local.id === "string" &&
				typeof local.title === "string" &&
				typeof local.content === "string" &&
				typeof local.version === "number" &&
				Number.isInteger(local.version) &&
				typeof local.sortOrder === "number" &&
				typeof local.updatedAt === "string" &&
				(local.parentId === null || typeof local.parentId === "string") &&
				Array.isArray(local.comments) &&
				local.comments.every(
					(comment) =>
						comment &&
						typeof comment.id === "string" &&
						typeof comment.body === "string" &&
						typeof comment.anchorText === "string" &&
						comment.anchor !== null &&
						typeof comment.anchor === "object" &&
						typeof comment.createdAt === "string" &&
						typeof comment.resolved === "boolean",
				)
			);
		});
	} catch {
		return [];
	}
};

const readRecovery = (projectId: string | null): MarkdownDocument[] =>
	projectId ? readRecoveryAtKey(recoveryKey(projectId)) : [];

export interface DocumentRecoveryDraft {
	key: string;
	windowId: string;
	projectId: string;
	document: MarkdownDocument;
}

/** Retain the exact reviewed snapshot as a backup; later source edits remain discoverable. */
export const archiveRecoveryDraft = (entry: Pick<DocumentRecoveryDraft, "key" | "document">) => {
	localStorage.setItem(`${entry.key}:handled:${entry.document.id}`, JSON.stringify(entry.document));
	window.dispatchEvent(new Event(documentRecoveryChangedEvent));
};

/** Other windows may still be alive: discovery never adopts or removes their work. */
export const listOtherWindowRecoveries = (projectId: string): DocumentRecoveryDraft[] => {
	const ownKey = recoveryKey(projectId);
	const suffix = `:${projectId}`;
	const result: DocumentRecoveryDraft[] = [];
	for (let index = 0; index < localStorage.length; index += 1) {
		const key = localStorage.key(index);
		if (!key || key === ownKey || !key.startsWith(`${prefix}:`) || !key.endsWith(suffix)) continue;
		const windowId = key.slice(prefix.length + 1, -suffix.length);
		if (!windowId || windowId.includes(":")) continue;
		for (const document of readRecoveryAtKey(key)) {
			if (document.isDirty === true) result.push({ key, windowId, projectId, document });
		}
	}
	return result.sort((left, right) =>
		right.document.updatedAt.localeCompare(left.document.updatedAt),
	);
};

export const recoverDocument = (projectId: string | null, server: MarkdownDocument) => {
	const local = readRecovery(projectId).find((document) => document.id === server.id);
	return local && !isRecoveryAlreadySaved(local, server)
		? { ...local, isDirty: true, saveConflict: { server } }
		: server;
};

// Compare saved user content, not transport metadata or the old version number.
const canonical = (value: unknown) =>
	JSON.stringify(value, (_key, item: unknown) =>
		item && typeof item === "object" && !Array.isArray(item)
			? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
			: item,
	);

const isRecoveryAlreadySaved = (draft: MarkdownDocument, saved: MarkdownDocument) => {
	const fields = (document: MarkdownDocument) => [
		document.id,
		document.title,
		document.content,
		document.parentId,
		document.folderId ?? null,
		document.sortOrder,
		document.category ?? null,
		document.tags ?? [],
		document.workbenchDraft ?? null,
	];
	const commentValue = (comment: MarkdownDocument["comments"][number]) => ({
		...comment,
		documentId: draft.id,
		updatedAt: comment.updatedAt ?? comment.createdAt,
	});
	return (
		canonical(fields(draft)) === canonical(fields(saved)) &&
		draft.comments.every((comment) => {
			const match = saved.comments.find((item) => item.id === comment.id);
			return match && canonical(commentValue(comment)) === canonical(commentValue(match));
		})
	);
};

/** Deleted remote documents still need a visible, downloadable recovery copy. */
export const recoverMissingDocuments = (projectId: string | null, documentIds: Set<string>) =>
	readRecovery(projectId)
		.filter((document) => !documentIds.has(document.id))
		.map((document) => ({ ...document, isDirty: true, saveConflict: { server: null } }));

export const archiveDocumentRecovery = (projectId: string, document: MarkdownDocument) => {
	localStorage.setItem(`${recoveryKey(projectId)}:backup:${document.id}`, JSON.stringify(document));
};
