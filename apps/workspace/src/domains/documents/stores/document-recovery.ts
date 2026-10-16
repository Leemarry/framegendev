import type { MarkdownDocument } from "./types";

const prefix = "mediago-document-recovery-v1";

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
	return local ? { ...local, isDirty: true, saveConflict: { server } } : server;
};

/** Deleted remote documents still need a visible, downloadable recovery copy. */
export const recoverMissingDocuments = (projectId: string | null, documentIds: Set<string>) =>
	readRecovery(projectId)
		.filter((document) => !documentIds.has(document.id))
		.map((document) => ({ ...document, isDirty: true, saveConflict: { server: null } }));

export const archiveDocumentRecovery = (projectId: string, document: MarkdownDocument) => {
	localStorage.setItem(`${recoveryKey(projectId)}:backup:${document.id}`, JSON.stringify(document));
};
