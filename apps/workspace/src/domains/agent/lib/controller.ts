import {
	cancelAgentSession,
	toAgentDocumentSnapshot,
	type AgentACPConfigSelection,
	type AgentReference,
} from "@/domains/agent/api/agent";
import {
	agentPromptWithReferences,
	openCommentsPromptFallback,
} from "@/domains/agent/lib/display-prompt";
import { agentSource } from "@/domains/agent/lib/document-streaming";
import { runDocumentAgent } from "@/domains/agent/lib/document-runtime";
import { connectRemoteAgentRuntime } from "@/domains/agent/lib/remote-runtime";
import { fallbackAgentDocument } from "@/domains/agent/lib/runtime-shared";
import { syncAgentSessionStatus, waitForStreamingRun } from "@/domains/agent/lib/session-sync";
import {
	closeResumedAgentEventStream,
	createStreamingEventContext,
	handleStreamingAgentEvent,
} from "@/domains/agent/lib/streaming-events";
import type { AgentExecutionContext } from "@/domains/agent/lib/types";
import { type AgentMessageMetadata, useAgentStore } from "@/domains/agent/stores";
import { setPersistedAgentSessionId } from "@/domains/agent/stores/persistence";
import {
	createDocumentOperation,
	type DocumentOperation,
} from "@/domains/documents/lib/operations";
import {
	selectActiveDocument,
	useDocumentsStore,
	type DocumentComment,
	type MarkdownDocument,
} from "@/domains/documents/stores";
import { useProjectStore } from "@/domains/projects/stores";

// Orchestrates a single agent run: builds the execution context, derives the
// machine/task prompt and the user-facing display prompt, then dispatches to
// the remote ACP runtime or the local mock runtime. Event handling, session
// reconciliation, and document streaming live in their own modules; the
// re-exports below keep this file the stable public entry point.

export {
	closeAllResumedAgentEventStreams,
	closeResumedAgentEventStream,
	handleStreamingAgentEvent,
	resumeAgentSessionEventStream,
} from "@/domains/agent/lib/streaming-events";

interface RunAgentPromptOptions {
	globalScope?: boolean;
	projectId?: string;
	documentId?: string;
	anchorText?: string;
	commentId?: string;
	comments?: DocumentComment[];
	displayPrompt?: string;
	displayMetadata?: AgentMessageMetadata;
	model?: AgentACPConfigSelection;
	reasoning?: AgentACPConfigSelection;
	permission?: AgentACPConfigSelection;
	references?: AgentReference[];
	reuseCurrentRun?: boolean;
	selection?: string;
	taskPrompt?: string;
}

export const runAgentPrompt = async (prompt: string, options: RunAgentPromptOptions = {}) => {
	const trimmed = prompt.trim();

	const agentStore = useAgentStore.getState();
	const context = buildExecutionContext(trimmed, options);
	if (!context) return;
	const optionTaskPrompt = options.taskPrompt?.trim() ?? "";
	const referencedPrompt = agentPromptWithReferences({
		prompt: trimmed,
		references: options.references,
	});
	const taskPrompt =
		referencedPrompt ||
		optionTaskPrompt ||
		trimmed ||
		(options.globalScope ? trimmed : defaultStructuredAgentDisplayPrompt(context));
	// With renderable display metadata (attachment cards / chips) an empty
	// display prompt is intentional — the bubble shows the cards alone instead
	// of the machine prompt with its `@Title` prefixes. A metadata object
	// without content does not count.
	const displayPrompt =
		options.displayPrompt?.trim() ||
		(displayMetadataHasContent(options.displayMetadata)
			? ""
			: referencedPrompt ||
				optionTaskPrompt ||
				trimmed ||
				(options.globalScope ? trimmed : defaultStructuredAgentDisplayPrompt(context)));

	if (options.reuseCurrentRun) {
		agentStore.beginPendingRun();
	} else {
		agentStore.startRun(displayPrompt, options.displayMetadata);
	}

	try {
		if (agentStore.runtimeMode === "remote") {
			await runStreamingACPAgent(taskPrompt, context, options);
			return;
		}

		await runLocalDocumentAgent(taskPrompt, context, taskPrompt);
	} catch (err) {
		agentStore.failRun(getErrorMessage(err));
	}
};

const buildExecutionContext = (
	trimmedPrompt: string,
	options: RunAgentPromptOptions,
): AgentExecutionContext | null => {
	const documentsStore = useDocumentsStore.getState();
	const projectId = options.globalScope
		? null
		: (useProjectStore.getState().activeProjectId ?? documentsStore.projectId);
	if (
		(options.projectId &&
			(options.projectId !== projectId || options.projectId !== documentsStore.projectId)) ||
		(options.documentId && !documentsStore.documents.some((item) => item.id === options.documentId))
	)
		return null;
	const activeDocument = options.globalScope
		? fallbackAgentDocument()
		: ((options.documentId
				? documentsStore.documents.find((item) => item.id === options.documentId)
				: selectActiveDocument()) ?? fallbackAgentDocument());

	const ambientSelection = options.globalScope
		? ""
		: !trimmedPrompt &&
			  documentsStore.selection &&
			  documentsStore.selection.documentId === activeDocument.id
			? documentsStore.selection.text
			: "";
	const selection = (options.selection?.trim() || ambientSelection || "").trim();
	const comments = options.globalScope ? [] : (options.comments ?? activeDocument.comments);
	const firstOpenComment = comments.find((comment) => !comment.resolved);
	const hasOpenComments = Boolean(firstOpenComment);
	const hasReferences = (options.references?.length ?? 0) > 0;
	if (!trimmedPrompt && !selection && !options.commentId && !hasOpenComments && !hasReferences) {
		return null;
	}

	const anchorText = (
		options.anchorText ??
		(!trimmedPrompt ? firstOpenComment?.anchorText : undefined) ??
		""
	).trim();

	return {
		activeDocument,
		comments,
		documentSnapshots: options.globalScope
			? []
			: documentsStore.documents.map(toAgentDocumentSnapshot),
		// Use the active project as the source of truth so the run and its streamed
		// events agree with the project filter in handleStreamingAgentEvent. documentsStore.projectId
		// lags behind navigation (it only updates after workspace state loads); preferring it here
		// would create the run against the previous project and drop every live event.
		projectId,
		selection,
		anchorText,
		isStructuredScopedEdit: Boolean(
			selection || options.commentId || (!trimmedPrompt && hasOpenComments),
		),
		commentId: options.commentId,
	};
};

const runLocalDocumentAgent = async (
	prompt: string,
	context: AgentExecutionContext,
	commentResolutionPrompt: string,
) => {
	const agentStore = useAgentStore.getState();
	const result = await runDocumentAgent({
		prompt,
		document: context.activeDocument,
		anchorText: context.anchorText || undefined,
		selectionText: context.selection || undefined,
		comments: context.comments,
		commentId: context.commentId,
	});
	agentStore.recordRuntimeStatus(result.runtime);

	agentStore.recordActivity(
		"tool",
		"应用操作",
		`模拟运行时准备了 ${result.operations.length} 个文档操作。`,
	);
	const operationResult = useDocumentsStore
		.getState()
		.applyOperations(context.activeDocument.id, result.operations, {
			source: agentSource("agent"),
			summary: result.summary,
		});

	if (operationResult.applied > 0) {
		agentStore.recordDocumentUpdated(result.summary);
		resolveAppliedComment(context, commentResolutionPrompt);
		if (operationResult.rejected.length > 0) {
			agentStore.recordActivity(
				"patch",
				"模板约束拒绝",
				operationResult.rejected.map((item) => item.reason).join("\n"),
			);
		}
	} else if (operationResult.rejected.length > 0) {
		const reason = operationResult.rejected[0]?.reason ?? "模板标题受保护。";
		agentStore.recordActivity("patch", "模板约束拒绝", reason);
		agentStore.completeAssistantMessage(reason);
		agentStore.finishRun();
		return;
	} else {
		agentStore.recordActivity("patch", "文档无变化", "操作协议已运行，但没有内容发生变化。");
	}

	agentStore.completeAssistantMessage(result.message);
	agentStore.finishRun();
};

export const stopAgentRun = async (scopeProjectId?: string | null) => {
	const agentStore = useAgentStore.getState();
	const sessionId = agentStore.sessionId;
	const projectId =
		scopeProjectId === undefined ? useProjectStore.getState().activeProjectId : scopeProjectId;
	if (sessionId) {
		try {
			await cancelAgentSession(sessionId, projectId);
		} catch {
			agentStore.recordActivity("runtime", "终止请求失败", "后端未确认终止，但已释放前端输入。");
		}
	}
	agentStore.cancelRun("智能体运行已中断。");
};

const runStreamingACPAgent = async (
	prompt: string,
	context: AgentExecutionContext,
	options: RunAgentPromptOptions,
) => {
	const agentStore = useAgentStore.getState();
	const { activeDocument, documentSnapshots, projectId, selection } = context;
	const agentAnchorText =
		context.anchorText || chooseAgentAnchor(activeDocument, "main", selection || undefined);
	const requestAnchorText = context.anchorText;
	const streamingContext = createStreamingEventContext({
		activeDocument,
		anchorText: agentAnchorText,
		isSelectionScoped: context.isStructuredScopedEdit || Boolean(selection),
		projectId,
	});

	// The resumed stream and the runtime connection would otherwise hold two
	// SSE connections delivering the same session's events.
	if (agentStore.sessionId) {
		closeResumedAgentEventStream(agentStore.sessionId, projectId);
	}

	const connection = await connectRemoteAgentRuntime(
		(event, meta) => {
			handleStreamingAgentEvent(event, { ...streamingContext, meta });
		},
		agentStore.sessionId,
		projectId,
		agentStore.lastEventId,
	);

	agentStore.setSessionId(connection.sessionId);
	if (projectId) {
		setPersistedAgentSessionId(projectId, connection.sessionId);
	}
	agentStore.markConnected();
	await syncAgentSessionStatus(connection.sessionId, projectId, { applyTerminal: false }).catch(
		() => {},
	);

	try {
		await connection.send({
			prompt,
			displayPrompt: options.displayPrompt?.trim() || undefined,
			displayMetadata: options.displayMetadata,
			projectId: projectId ?? undefined,
			document: options.globalScope ? undefined : toAgentDocumentSnapshot(activeDocument),
			documents: documentSnapshots,
			references: options.references,
			anchorText: requestAnchorText || undefined,
			commentId: context.commentId,
			comments: context.comments,
			selectionText: selection || undefined,
			model: options.model,
			reasoning: options.reasoning,
			permission: options.permission,
		});

		await waitForStreamingRun(connection.sessionId, projectId);
	} finally {
		connection.close();
	}
};

const displayMetadataHasContent = (metadata?: AgentMessageMetadata) =>
	Boolean(metadata?.displayAttachments?.length || metadata?.displaySegments?.length);

const defaultStructuredAgentDisplayPrompt = (context: AgentExecutionContext) => {
	if (context.commentId) return "根据选中的批注修改文档";
	if (context.selection) return "优化选中文本";
	return openCommentsPromptFallback;
};

export const agentSessionStorageKey = (projectId: string) =>
	`mediago_drama_agent_session_${projectId}`;

const chooseAgentAnchor = (
	document: MarkdownDocument,
	agentId: string,
	selection: string | undefined,
) => {
	if (selection?.trim()) return selection.trim();

	const matchers: Record<string, RegExp[]> = {
		characters: [/角色[^\n]*/u, /人物[^\n]*/u],
		scenes: [/场景[^\n]*/u, /空间[^\n]*/u],
		storyboard: [/分镜[^\n]*/u, /```video[\s\S]{0,120}?```/u],
		rating: [/剧情[^\n]*/u, /^#\s+.+$/mu],
		main: [/剧情[^\n]*/u, /^#\s+.+$/mu],
	};
	for (const matcher of matchers[agentId] ?? matchers.main) {
		const match = document.content.match(matcher);
		if (match?.[0]?.trim()) return compactAnchorText(match[0]);
	}

	return compactAnchorText(document.content);
};

const compactAnchorText = (value: string) => value.trim().replace(/\s+/g, " ").slice(0, 120);

const resolveAppliedComment = (context: AgentExecutionContext, prompt: string) => {
	const documentsStore = useDocumentsStore.getState();
	if (documentsStore.projectId !== context.projectId) return;
	const submitted = context.comments.find((comment) =>
		context.commentId ? comment.id === context.commentId : !comment.resolved,
	);
	if (
		!context.commentId &&
		!["评论", "批注", "反馈", "comment", "annotation"].some((word) => prompt.includes(word))
	)
		return;
	const current = documentsStore.documents
		.find((document) => document.id === context.activeDocument.id)
		?.comments.find((comment) => comment.id === submitted?.id);
	if (!submitted || !current || current.resolved || current.body !== submitted.body) return;

	documentsStore.applyOperations(
		context.activeDocument.id,
		[
			createDocumentOperation<DocumentOperation>({
				type: "resolve_comment",
				summary: "已解决应用过的批注。",
				target: { commentId: submitted.id },
				payload: {},
			}),
		],
		{
			source: "agent",
			summary: "已解决应用过的批注。",
		},
	);
	useAgentStore.getState().recordActivity("patch", "批注已解决", "编辑完成后已关闭对应批注。");
};

const getErrorMessage = (err: unknown) => {
	if (err instanceof Error) return err.message;
	return "文档智能体运行失败。";
};
