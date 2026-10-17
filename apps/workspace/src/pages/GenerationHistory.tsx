import type React from "react";
import { useEffect } from "react";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import useSWR from "swr";
import {
	defaultGenerationConversationScopeId,
	generationConversationsQueryKey,
	getGenerationConversations,
	projectGenerationConversation,
} from "@/domains/generation/api/generation";
import { GenerationWorkspace } from "@/domains/generation/components/GenerationWorkspace";
import type { StudioTab } from "@/domains/workspace/components/ProjectNavigatorTypes";
import { getRouteProjectId, historyPath } from "@/domains/workspace/lib/workbench-route";
import { useWorkModeStore } from "@/lib/stores/work-mode";

const kindLabels: Record<StudioTab, string> = {
	audio: "音频",
	image: "图片",
	text: "文本",
	video: "视频",
};

/**
 * GenerationHistoryHome mirrors the official home screen: project scoped visits go
 * straight to the video history, everything else continues to the newest conversation.
 */
export const GenerationHistoryHome: React.FC = () => {
	const location = useLocation();
	const projectId = getRouteProjectId(location.search);

	if (projectId) {
		return <Navigate to={historyPath("video", { projectId })} replace />;
	}

	return <GenerationHistoryLatest />;
};

export const GenerationHistoryImage: React.FC = () => <GenerationHistoryKindPage kind="image" />;

export const GenerationHistoryVideo: React.FC = () => <GenerationHistoryKindPage kind="video" />;

export const GenerationHistoryText: React.FC = () => <GenerationHistoryKindPage kind="text" />;

export const GenerationHistoryAudio: React.FC = () => <GenerationHistoryKindPage kind="audio" />;

const GenerationHistoryLatest: React.FC = () => {
	useWorkMode("studio");
	const navigate = useNavigate();
	const video = useHistoryConversations("video");
	const image = useHistoryConversations("image");
	const text = useHistoryConversations("text");
	const audio = useHistoryConversations("audio");

	const states = [
		{ kind: "video" as const, ...video },
		{ kind: "image" as const, ...image },
		{ kind: "text" as const, ...text },
		{ kind: "audio" as const, ...audio },
	];
	const isLoading = states.some((state) => state.isLoading);
	// The official home picks the newest conversation in kind order, not by date.
	const latest = states
		.flatMap((state) => {
			const conversation = state.data?.conversations[0];
			return conversation ? [{ conversation, kind: state.kind }] : [];
		})
		.at(0);

	useEffect(() => {
		if (isLoading || !latest) return;

		navigate(historyPath(latest.kind, { conversationId: latest.conversation.id }), {
			replace: true,
		});
	}, [isLoading, latest, navigate]);

	if (isLoading || latest) return <HistoryPagePlaceholder />;

	return <HistoryEmptyState />;
};

const GenerationHistoryKindPage: React.FC<{ kind: StudioTab }> = ({ kind }) => {
	const location = useLocation();
	const projectId = getRouteProjectId(location.search);

	if (projectId) {
		return <ProjectGenerationHistory kind={kind} projectId={projectId} />;
	}

	return <StudioGenerationHistory kind={kind} />;
};

const StudioGenerationHistory: React.FC<{ kind: StudioTab }> = ({ kind }) => {
	useWorkMode("studio");
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const conversationId = searchParams.get("conversation");
	const { data, isLoading } = useHistoryConversations(kind);
	const latestConversationId = data?.conversations[0]?.id ?? "";
	const activeConversation = data?.conversations.find(
		(conversation) => conversation.id === conversationId,
	);

	useEffect(() => {
		if (conversationId || !latestConversationId) return;

		navigate(historyPath(kind, { conversationId: latestConversationId }), { replace: true });
	}, [conversationId, kind, latestConversationId, navigate]);

	if (!conversationId) {
		return isLoading ? <HistoryPagePlaceholder /> : <HistoryEmptyState kind={kind} />;
	}

	return (
		<div className="flex h-full min-h-0 flex-col overflow-hidden bg-ide-editor text-ide-editor-foreground">
			<GenerationWorkspace
				conversationId={conversationId}
				conversationScopeId={activeConversation?.scopeId ?? defaultGenerationConversationScopeId}
				conversationTitle={activeConversation?.title}
				historyScopeId={defaultGenerationConversationScopeId}
				initialKind={kind}
				lockKind
				projectHistory={false}
				requireConversation
				uploadIdPrefix={`history-${kind}-generation`}
			/>
		</div>
	);
};

const ProjectGenerationHistory: React.FC<{ kind: StudioTab; projectId: string }> = ({
	kind,
	projectId,
}) => {
	useWorkMode("agent");
	const conversation = projectGenerationConversation(projectId, kind);

	if (!conversation) return <HistoryEmptyState kind={kind} />;

	return (
		<div className="flex h-full min-h-0 flex-col overflow-hidden bg-ide-editor text-ide-editor-foreground">
			<GenerationWorkspace
				conversationId={conversation.conversationId}
				conversationScopeId={conversation.conversationScopeId}
				conversationTitle={conversation.conversationTitle}
				historyScopeId={conversation.historyScopeId}
				initialKind={kind}
				lockKind
				mediaAssetProjectId={projectId}
				projectId={projectId}
				requireConversation
				uploadIdPrefix={`project-${projectId}-${kind}-generation`}
			/>
		</div>
	);
};

const HistoryPagePlaceholder: React.FC = () => (
	<div className="flex h-full min-h-0 flex-col overflow-hidden bg-ide-editor text-ide-editor-foreground" />
);

const HistoryEmptyState: React.FC<{ kind?: StudioTab }> = ({ kind }) => {
	const label = kind ? kindLabels[kind] : "";

	return (
		<div className="flex h-full min-h-0 flex-col overflow-hidden bg-ide-editor text-ide-editor-foreground">
			<div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center">
				<div className="max-w-sm" data-testid="generation-history-empty">
					<h1 className="text-sm font-medium text-foreground">
						{kind ? `暂无${label}生成记录` : "暂无生成记录"}
					</h1>
					<p className="mt-2 text-xs leading-5 text-muted-foreground">
						{kind
							? `完成一次${label}生成后，记录会显示在这里。`
							: "完成一次生成后，记录会按类型显示在左侧。"}
					</p>
				</div>
			</div>
		</div>
	);
};

const useHistoryConversations = (kind: StudioTab) =>
	useSWR(
		generationConversationsQueryKey(kind, defaultGenerationConversationScopeId, {
			allScopes: true,
		}),
		() =>
			getGenerationConversations(kind, defaultGenerationConversationScopeId, { allScopes: true }),
	);

const useWorkMode = (mode: "agent" | "studio") => {
	const setWorkMode = useWorkModeStore((state) => state.setMode);

	useEffect(() => {
		setWorkMode(mode);
	}, [mode, setWorkMode]);
};
