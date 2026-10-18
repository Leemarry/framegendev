import { History, Loader2, Maximize2, Minimize2, Plus } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useSWR from "swr";
import { useSWRConfig } from "swr";
import {
	agentChatKey,
	agentSessionsKey,
	createAgentSession,
	getAgentChatState,
	listArchivedAgentSessions,
	listAgentSessions,
	type AgentChatStatePayload,
	type AgentSessionSummary,
} from "@/domains/agent/api/agent";
import { DramiMascot } from "./DramiMascot";
import { AgentChat } from "@/domains/agent/components/AgentChat";
import { Button } from "@/shared/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { useToast } from "@/hooks/useToast";
import {
	selectAgentComposerSeed,
	selectAgentIsRunning,
	selectAgentActiveConversation,
	selectAgentSessionId,
	useAgentStore,
} from "@/domains/agent/stores";
import { setPersistedAgentSessionId } from "@/domains/agent/stores/persistence";
import { useProjectStore } from "@/domains/projects/stores";
import {
	agentProjectPath,
	agentProjectRouteState,
	getRouteProjectId,
	isAgentRoute,
} from "@/domains/workspace/lib/workbench-route";
import { cn } from "@/shared/lib/utils";

export const AgentPanel: React.FC<{
	width?: number;
	globalScope?: boolean;
	readOnly?: boolean;
	expanded?: boolean;
	onExpandedChange?: (expanded: boolean) => void;
	onHeaderPointerDown?: React.PointerEventHandler<HTMLElement>;
	onHeaderKeyDown?: React.KeyboardEventHandler<HTMLElement>;
}> = ({
	width,
	globalScope = false,
	readOnly = false,
	expanded = true,
	onExpandedChange,
	onHeaderPointerDown,
	onHeaderKeyDown,
}) => {
	const isRunning = useAgentStore(selectAgentIsRunning);
	const activeConversation = useAgentStore(selectAgentActiveConversation);
	const isChatHydrating = useAgentStore((state) => state.isChatHydrating);
	const activeSessionId = useAgentStore(selectAgentSessionId);
	const composerSeed = useAgentStore(selectAgentComposerSeed);
	const storedProjectId = useProjectStore((state) => state.activeProjectId);
	const location = useLocation();
	const navigate = useNavigate();
	const routeProjectId = getRouteProjectId(location.search);
	const projectId = globalScope ? null : (routeProjectId ?? storedProjectId);
	const { data: sessions = [], error: sessionsError } = useSWR(
		!readOnly && (globalScope || projectId) ? agentSessionsKey(projectId) : null,
		() => listAgentSessions(projectId),
		{ refreshInterval: 3000 },
	);
	// Count sessions, not the child agents or tool calls within one task.
	const runningTasks = new Map(
		(sessionsError ? [] : sessions)
			.filter((session) => session.running)
			.map((session) => [session.sessionId, session]),
	);
	if (!readOnly && !isChatHydrating) {
		if (isRunning) {
			const key = activeSessionId || "pending";
			runningTasks.set(key, {
				sessionId: key,
				running: true,
				title:
					runningTasks.get(key)?.title ||
					activeConversation?.prompt ||
					activeConversation?.name ||
					"当前任务",
				lastStatus: activeConversation?.status,
			});
		}
	}
	const runningTaskCount = readOnly ? 0 : runningTasks.size;
	const currentRouteProjectIdRef = useRef(routeProjectId);
	const toast = useToast();
	const { mutate } = useSWRConfig();
	const [isHistoryOpen, setIsHistoryOpen] = useState(false);
	const [isCreatingSession, setIsCreatingSession] = useState(false);
	const historyMenuRef = useRef<HTMLDivElement>(null);
	currentRouteProjectIdRef.current = routeProjectId;

	const isCurrentAgentProject = useCallback(
		(requestedProjectId: string | null) => {
			if (globalScope) return requestedProjectId === null;
			const currentRouteProjectId = currentRouteProjectIdRef.current;
			if (currentRouteProjectId) return currentRouteProjectId === requestedProjectId;
			return useProjectStore.getState().activeProjectId === requestedProjectId;
		},
		[globalScope],
	);

	const syncAgentSessionUrl = useCallback(
		(sessionId: string, options: { cleanAgentRoute?: boolean; replace?: boolean } = {}) => {
			const trimmedSessionId = sessionId.trim();
			if (!trimmedSessionId || !isAgentRoute(location.pathname)) return;

			if (options.cleanAgentRoute && !onExpandedChange) {
				const nextUrl = globalScope
					? `/agent?agentSessionId=${encodeURIComponent(trimmedSessionId)}`
					: projectId
						? agentProjectPath(projectId, { agentSessionId: trimmedSessionId })
						: location.pathname;
				if (nextUrl === `${location.pathname}${location.search}`) return;
				navigate(nextUrl, {
					replace: options.replace ?? false,
					state: agentProjectRouteState("agent"),
				});
				return;
			}

			const params = new URLSearchParams(location.search);
			if (!onExpandedChange && (params.has("documentId") || params.has("assetId"))) return;
			if (projectId) params.set("projectId", projectId);
			params.set("agentSessionId", trimmedSessionId);
			const nextUrl = `${location.pathname}?${params.toString()}`;
			if (nextUrl === `${location.pathname}${location.search}`) return;

			navigate(nextUrl, {
				replace: options.replace ?? true,
				state: location.state,
			});
		},
		[
			globalScope,
			location.pathname,
			location.search,
			location.state,
			navigate,
			projectId,
			onExpandedChange,
		],
	);

	useEffect(() => {
		if (composerSeed) {
			setIsHistoryOpen(false);
			onExpandedChange?.(true);
		}
	}, [composerSeed, onExpandedChange]);

	useEffect(() => {
		if (!isHistoryOpen) return;

		const handlePointerDown = (event: PointerEvent) => {
			const target = event.target;
			if (target instanceof Node && historyMenuRef.current?.contains(target)) return;
			setIsHistoryOpen(false);
		};
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setIsHistoryOpen(false);
		};

		document.addEventListener("pointerdown", handlePointerDown);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("pointerdown", handlePointerDown);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isHistoryOpen]);

	const handleCreateSession = async () => {
		if (readOnly || isRunning || isCreatingSession) return;
		onExpandedChange?.(true);

		const requestedProjectId = projectId;
		setIsCreatingSession(true);
		try {
			const session = await createAgentSession(requestedProjectId, true);
			if (!isCurrentAgentProject(requestedProjectId)) return;
			const state: AgentChatStatePayload = {
				projectId: requestedProjectId ?? undefined,
				sessionId: session.sessionId,
				messages: [],
				activity: [],
				running: false,
			};
			useAgentStore.getState().hydrateAgentChatState([], [], {
				sessionId: session.sessionId,
				lastEventId: null,
				running: false,
			});
			if (requestedProjectId) setPersistedAgentSessionId(requestedProjectId, session.sessionId);
			syncAgentSessionUrl(session.sessionId, { cleanAgentRoute: true, replace: false });
			setIsHistoryOpen(false);
			void mutate(agentChatKey(requestedProjectId, session.sessionId), state, {
				revalidate: false,
			});
			void mutate(agentSessionsKey(requestedProjectId));
		} catch (err) {
			if (isCurrentAgentProject(requestedProjectId)) {
				toast.error("新建会话失败", { description: getErrorMessage(err) });
			}
		} finally {
			setIsCreatingSession(false);
		}
	};

	return (
		<aside
			className="agent-panel-shell flex h-full min-h-0 w-full flex-col text-ide-panel-foreground"
			style={width ? { width } : undefined}
		>
			<TooltipProvider delayDuration={200}>
				<Tooltip>
					<TooltipTrigger asChild>
						<header
							className="drami-panel-header flex shrink-0 items-center gap-2 px-3 text-sm font-medium text-foreground"
							style={{ height: expanded ? 40 : 48 }}
							onPointerDown={onHeaderPointerDown}
						>
							{!expanded ? (
								<button
									type="button"
									aria-label="打开 Drami"
									className="flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									onClick={() => onExpandedChange?.(true)}
								>
									<DramiMascot className="-ml-1 -mt-3 size-16" working={runningTaskCount > 0} />
									<span>Drami</span>
								</button>
							) : (
								<>
									<DramiMascot className="size-6" working={runningTaskCount > 0} />
									<span
										className="min-w-0 flex-1 truncate"
										role={onHeaderPointerDown ? "button" : undefined}
										tabIndex={onHeaderPointerDown ? 0 : undefined}
										aria-label={onHeaderPointerDown ? "移动 Drami 窗口" : undefined}
										onKeyDown={onHeaderKeyDown}
									>
										Drami
									</span>
								</>
							)}
							{runningTaskCount > 0 ? (
								<span
									role="status"
									className="shrink-0 whitespace-nowrap text-xs text-muted-foreground"
								>
									{runningTaskCount} 个执行中
								</span>
							) : null}
							{!readOnly ? (
								<Button
									variant="ghost"
									size="icon"
									className="size-7 shrink-0 text-muted-foreground"
									onClick={handleCreateSession}
									disabled={isRunning || isCreatingSession}
									aria-label="新建会话"
									title="新建会话"
								>
									{isCreatingSession ? (
										<Loader2 className="size-4 animate-spin" />
									) : (
										<Plus className="size-4" />
									)}
								</Button>
							) : null}
							<div ref={historyMenuRef} className="relative">
								<Button
									variant="ghost"
									size="icon"
									className="size-7 text-muted-foreground"
									onClick={() => {
										onExpandedChange?.(true);
										setIsHistoryOpen((open) => !open);
									}}
									aria-expanded={isHistoryOpen}
									aria-haspopup="menu"
									aria-label="历史会话"
									title="会话历史"
								>
									<History className="size-4" />
								</Button>
								{isHistoryOpen ? (
									<AgentSessionHistoryMenu
										activeSessionId={activeSessionId}
										archivedScope={readOnly}
										globalScope={globalScope}
										isCurrentProject={isCurrentAgentProject}
										onSessionSelected={(sessionId) =>
											syncAgentSessionUrl(sessionId, { cleanAgentRoute: true, replace: false })
										}
										projectId={projectId}
										onClose={() => setIsHistoryOpen(false)}
									/>
								) : null}
							</div>
							{onExpandedChange ? (
								<Button
									variant="ghost"
									size="icon"
									className="size-7 shrink-0 text-muted-foreground"
									aria-label={expanded ? "收起 Drami" : "展开 Drami"}
									title={expanded ? "收起 Drami" : "展开 Drami"}
									onClick={() => onExpandedChange(!expanded)}
								>
									{expanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
								</Button>
							) : null}
						</header>
					</TooltipTrigger>
					{runningTaskCount > 0 ? (
						<TooltipContent
							side="top"
							sideOffset={14}
							className="w-72 max-w-[calc(100vw-2rem)] rounded-xl p-2"
						>
							{Array.from(runningTasks.values()).map((task) => (
								<div
									key={task.sessionId}
									className="flex items-center gap-4 rounded-md bg-ide-list-active px-3 py-2"
								>
									<span className="min-w-0 flex-1 truncate">
										{task.title || task.lastMessage || "Agent 任务"}
									</span>
									<span className="shrink-0 text-warning-foreground">
										{task.lastStatus === "waiting" ? "等待中" : "运行中"}
									</span>
								</div>
							))}
						</TooltipContent>
					) : null}
				</Tooltip>
			</TooltipProvider>
			<div className="relative min-h-0 flex-1 overflow-hidden" hidden={!expanded} inert={!expanded}>
				<AgentChat projectId={projectId} globalScope={globalScope} readOnly={readOnly} />
			</div>
		</aside>
	);
};

const AgentSessionHistoryMenu: React.FC<{
	activeSessionId: string | null;
	archivedScope?: boolean;
	globalScope?: boolean;
	isCurrentProject: (projectId: string | null) => boolean;
	onSessionSelected?: (sessionId: string) => void;
	projectId: string | null;
	onClose: () => void;
}> = ({
	activeSessionId,
	archivedScope = false,
	globalScope = false,
	isCurrentProject,
	onSessionSelected,
	projectId,
	onClose,
}) => {
	const toast = useToast();
	const { mutate } = useSWRConfig();
	const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);
	const {
		data: sessions = [],
		error,
		isLoading,
	} = useSWR(
		globalScope || projectId
			? archivedScope
				? "/agent/sessions/archived"
				: agentSessionsKey(projectId)
			: null,
		() => (archivedScope ? listArchivedAgentSessions() : listAgentSessions(projectId)),
	);

	useEffect(() => {
		setLoadingSessionId(null);
	}, [projectId]);

	const selectSession = async (session: AgentSessionSummary) => {
		if ((!globalScope && !projectId) || loadingSessionId) return;

		const requestedProjectId = globalScope ? null : projectId;
		const requestedSessionId = session.sessionId;
		setLoadingSessionId(session.sessionId);
		try {
			const state = await getAgentChatState(requestedProjectId, requestedSessionId);
			const resolvedSessionId = state.sessionId?.trim() || requestedSessionId;
			if (
				!isCurrentProject(requestedProjectId) ||
				(state.projectId && state.projectId !== requestedProjectId) ||
				(state.sessionId && resolvedSessionId !== requestedSessionId)
			) {
				return;
			}

			useAgentStore.getState().hydrateAgentChatState(state.messages, state.activity, {
				sessionId: resolvedSessionId,
				rootRunId: state.rootRunId,
				conversations: state.conversations,
				lastEventId: state.lastEventId,
				running: state.running,
				pendingPermissions: state.pendingPermissions,
			});
			if (requestedProjectId) setPersistedAgentSessionId(requestedProjectId, resolvedSessionId);
			onSessionSelected?.(resolvedSessionId);
			void mutate(agentChatKey(requestedProjectId, resolvedSessionId), state, {
				revalidate: false,
			});
			onClose();
		} catch (err) {
			if (isCurrentProject(requestedProjectId)) {
				toast.error("加载历史会话失败", { description: getErrorMessage(err) });
			}
		} finally {
			setLoadingSessionId(null);
		}
	};

	if (!projectId && !globalScope) {
		return (
			<div
				className="agent-history-menu absolute right-0 top-full z-50 mt-1 w-72 rounded-sm border border-border bg-popover p-3 text-sm text-muted-foreground shadow-lg"
				role="menu"
			>
				打开项目后可以查看历史会话。
			</div>
		);
	}

	return (
		<section
			className="agent-history-menu absolute right-0 top-full z-50 mt-1 flex max-h-[min(28rem,calc(100vh-8rem))] w-[min(24rem,calc(100vw-2rem))] min-w-72 flex-col overflow-hidden rounded-sm border border-border bg-popover text-popover-foreground shadow-lg"
			role="menu"
		>
			<div className="border-b border-border px-3 py-2">
				<h2 className="text-sm font-semibold text-foreground">历史会话</h2>
				<p className="mt-0.5 text-xs text-muted-foreground">点击任一会话恢复当时的对话上下文。</p>
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
				{isLoading ? (
					<div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
						<Loader2 className="size-4 animate-spin" />
						正在加载历史会话
					</div>
				) : error ? (
					<div className="border border-error-border bg-error-surface px-2 py-2 text-sm text-error-foreground">
						历史会话加载失败。
					</div>
				) : sessions.length === 0 ? (
					<div className="px-2 py-3 text-sm text-muted-foreground">还没有历史会话。</div>
				) : (
					<div className="space-y-1">
						{sessions.map((session) => {
							const isActive = session.sessionId === activeSessionId;
							const isLoadingSession = loadingSessionId === session.sessionId;
							const title = session.title?.trim() || shortSessionID(session.sessionId);
							return (
								<button
									key={session.sessionId}
									type="button"
									role="menuitem"
									onClick={() => selectSession(session)}
									disabled={Boolean(loadingSessionId)}
									className={cn(
										"agent-history-item flex w-full items-start gap-2 rounded-sm border border-transparent px-2 py-2 text-left transition-colors hover:border-border hover:bg-ide-list-hover disabled:pointer-events-none disabled:opacity-60",
										isActive && "agent-history-item-active border-info-border bg-info-surface",
									)}
								>
									<div className="agent-history-icon mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm border border-border bg-ide-toolbar">
										{isLoadingSession ? (
											<Loader2 className="size-3.5 animate-spin" />
										) : (
											<History className="size-3.5" />
										)}
									</div>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											<span
												className="truncate text-sm font-medium text-foreground"
												title={session.sessionId}
											>
												{title}
											</span>
											<span
												className={cn(
													"agent-history-status shrink-0 rounded-sm border px-1.5 py-0.5 text-2xs",
													sessionStatusClassName(session),
												)}
											>
												{sessionStatusLabel(session)}
											</span>
											{isActive ? (
												<span className="shrink-0 text-2xs text-info-foreground">当前</span>
											) : null}
										</div>
										<p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
											{session.lastMessage || "尚未运行"}
										</p>
										<div className="mt-1 flex items-center gap-2 text-caption text-muted-foreground">
											<span>{formatSessionTimestamp(session.updatedAt)}</span>
										</div>
									</div>
								</button>
							);
						})}
					</div>
				)}
			</div>
		</section>
	);
};

const shortSessionID = (sessionId: string) => {
	if (sessionId.length <= 16) return sessionId;
	return `${sessionId.slice(0, 12)}…`;
};

const sessionStatusLabel = (session: AgentSessionSummary) => {
	if (session.running) return "运行中";
	switch (session.lastStatus) {
		case "completed":
			return "完成";
		case "failed":
			return "失败";
		case "cancelled":
			return "已取消";
		case "interrupted":
			return "已中断";
		case "paused":
			return "已暂停";
		case "waiting":
			return "等待";
		case "running":
			return "运行中";
		default:
			return "空会话";
	}
};

const sessionStatusClassName = (session: AgentSessionSummary) => {
	if (session.running || session.lastStatus === "running" || session.lastStatus === "waiting") {
		return "border-warning-border bg-warning-surface text-warning-foreground";
	}
	if (session.lastStatus === "completed") {
		return "border-success-border bg-success-surface text-success-foreground";
	}
	if (
		session.lastStatus === "failed" ||
		session.lastStatus === "interrupted" ||
		session.lastStatus === "paused"
	) {
		return "border-error-border bg-error-surface text-error-foreground";
	}
	return "border-border bg-ide-toolbar text-muted-foreground";
};

const formatSessionTimestamp = (value?: string) => {
	if (!value) return "未运行";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return new Intl.DateTimeFormat("zh-CN", {
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
};

const getErrorMessage = (err: unknown) => {
	if (err instanceof Error && err.message) return err.message;
	return "请稍后重试。";
};
