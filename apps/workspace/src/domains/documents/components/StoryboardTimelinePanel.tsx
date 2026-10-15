import { Captions, Film, Image, Mic2, Music2, RefreshCw, X } from "lucide-react";
import type React from "react";
import { useEffect } from "react";
import useSWR from "swr";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
	formatTimelineTime,
	type Episode,
	type EpisodeSection,
	type TimelineClip,
	type TimelineTrackType,
} from "@/domains/episode/lib/sample";
import type { MarkdownDocument } from "@/domains/documents/stores";
import { listDocumentSections } from "@/domains/documents/lib/sections";
import {
	getWorkspaceResolvedEpisode,
	workspaceResolvedEpisodeKey,
} from "@/domains/workspace/api/workspace";
import { cn } from "@/shared/lib/utils";

interface StoryboardTimelinePanelProps {
	document: MarkdownDocument;
	projectId: string;
	onClose: () => void;
}

const previewTrackTypes = ["video", "voiceover", "caption"] as const;
const autoTrackTypes = ["music", "asset"] as const;

const trackMeta: Record<
	TimelineTrackType,
	{
		empty: string;
		icon: React.ComponentType<{ className?: string }>;
		label: string;
	}
> = {
	video: {
		icon: Film,
		label: "画面",
		empty: "未填写视觉描述",
	},
	voiceover: {
		icon: Mic2,
		label: "旁白",
		empty: "未填写旁白",
	},
	caption: {
		icon: Captions,
		label: "字幕",
		empty: "未填写对白字幕",
	},
	music: {
		icon: Music2,
		label: "背景音乐",
		empty: "自动铺底",
	},
	asset: {
		icon: Image,
		label: "素材",
		empty: "自动标记",
	},
};

export const StoryboardTimelinePanel: React.FC<StoryboardTimelinePanelProps> = ({
	document,
	projectId,
	onClose,
}) => {
	const unsafeDraft = Boolean(document.isDirty || document.saveConflict);
	const hasGroups = listDocumentSections(document).length > 0;
	const canLoadEpisode = Boolean(document.id && projectId && hasGroups && !unsafeDraft);
	const { data, error, isLoading, isValidating, mutate } = useSWR(
		canLoadEpisode ? workspaceResolvedEpisodeKey(document.id, projectId) : null,
		() => getWorkspaceResolvedEpisode(document.id, projectId),
	);
	useEffect(() => {
		if (canLoadEpisode) void mutate();
	}, [canLoadEpisode, document.id, document.updatedAt, projectId, mutate]);
	const identityMatches =
		data?.documentId === document.id &&
		data.projectId === projectId &&
		(!data.documentUpdatedAt || data.documentUpdatedAt === document.updatedAt);
	const loading = isLoading || isValidating || (!data && !error);
	const episode =
		hasGroups && !unsafeDraft && !loading && !error && identityMatches ? data.episode : null;

	return (
		<aside
			aria-label="分镜资源栏"
			className="flex max-h-[45%] min-h-32 w-full shrink-0 flex-col border-t border-border bg-ide-panel text-ide-panel-foreground md:h-full md:max-h-none md:w-80 md:border-l md:border-t-0"
		>
			<header className="flex h-11 shrink-0 items-center justify-between border-b border-border bg-ide-toolbar px-2 text-ide-toolbar-foreground">
				<div className="min-w-0">
					<h2 className="truncate text-sm font-semibold text-foreground">分镜资源</h2>
					<p className="truncate text-xs text-muted-foreground">
						{episode
							? `${episode.sections.length} 个组 · ${formatTimelineTime(episode.duration)}`
							: !hasGroups && !unsafeDraft
								? "0 个组"
								: "读取未完成"}
					</p>
				</div>
				<div className="flex shrink-0 items-center">
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="size-7 rounded-sm"
						aria-label="刷新分镜资源"
						title="刷新分镜资源"
						disabled={loading || unsafeDraft || !hasGroups}
						onClick={() => void mutate()}
					>
						<RefreshCw className="size-4" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="size-7 rounded-sm"
						aria-label="关闭资源栏"
						title="关闭资源栏"
						onClick={onClose}
					>
						<X />
					</Button>
				</div>
			</header>

			<div className="min-h-0 flex-1 overflow-y-auto p-2">
				<div className="mb-2 flex flex-wrap gap-1">
					{autoTrackTypes.map((type) => {
						const TrackIcon = trackMeta[type].icon;
						return (
							<Badge key={type} variant="outline" className="gap-1">
								<TrackIcon className="size-3" />
								{trackMeta[type].label}
							</Badge>
						);
					})}
				</div>
				{unsafeDraft ? (
					<p role="status" className="py-3 text-xs text-warning-foreground">
						请先保存正文并处理文档冲突。
					</p>
				) : !hasGroups ? (
					<p className="py-3 text-xs text-muted-foreground">还没有识别到二级标题分镜组。</p>
				) : loading ? (
					<p className="py-3 text-xs text-muted-foreground">正在读取分镜组...</p>
				) : error || !identityMatches ? (
					<div role="alert" className="space-y-2 py-3 text-xs text-error-foreground">
						<p>分镜资源读取失败，请重试。</p>
						<Button
							variant="outline"
							size="sm"
							aria-label="重试读取分镜资源"
							onClick={() => void mutate()}
						>
							<RefreshCw className="size-4" />
							重试
						</Button>
					</div>
				) : episode && episode.sections.length > 0 ? (
					<div className="space-y-2">
						{episode.sections.map((section, index) => (
							<StoryboardSectionSummary
								key={section.id}
								episodeSection={section}
								index={index}
								clipsByTrack={clipsForSection(episode, section)}
							/>
						))}
					</div>
				) : (
					<p className="py-3 text-xs text-muted-foreground">还没有识别到二级标题分镜组。</p>
				)}
			</div>
		</aside>
	);
};

interface StoryboardSectionSummaryProps {
	clipsByTrack: Partial<Record<(typeof previewTrackTypes)[number], TimelineClip>>;
	episodeSection: EpisodeSection;
	index: number;
}

const StoryboardSectionSummary: React.FC<StoryboardSectionSummaryProps> = ({
	clipsByTrack,
	episodeSection,
	index,
}) => (
	<article className="border border-border bg-ide-editor p-2">
		<div className="mb-2 flex items-start justify-between gap-2">
			<div className="min-w-0">
				<h3 className="truncate text-xs font-semibold text-foreground">
					{episodeSection.title || `第 ${String(index + 1).padStart(2, "0")} 组`}
				</h3>
				<p className="mt-0.5 text-caption text-muted-foreground">
					{formatTimelineTime(episodeSection.start)} - {formatTimelineTime(episodeSection.end)}
				</p>
			</div>
			<Badge variant="secondary" className="shrink-0 tabular-nums">
				{index + 1}
			</Badge>
		</div>
		<div className="space-y-1.5">
			{previewTrackTypes.map((type) => (
				<TrackSummary key={type} clip={clipsByTrack[type]} type={type} />
			))}
		</div>
	</article>
);

interface TrackSummaryProps {
	clip?: TimelineClip;
	type: (typeof previewTrackTypes)[number];
}

const TrackSummary: React.FC<TrackSummaryProps> = ({ clip, type }) => {
	const TrackIcon = trackMeta[type].icon;
	const content = clip?.content.trim() || trackMeta[type].empty;

	return (
		<div className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-2 text-xs">
			<div className="flex min-w-0 items-center gap-1 text-muted-foreground">
				<TrackIcon className="size-3.5 shrink-0" />
				<span className="truncate">{trackMeta[type].label}</span>
			</div>
			<p
				className={cn(
					"line-clamp-2 min-w-0 leading-5",
					clip ? "text-foreground" : "text-muted-foreground",
				)}
			>
				{content}
			</p>
		</div>
	);
};

const clipsForSection = (episode: Episode, section: EpisodeSection) =>
	Object.fromEntries(
		previewTrackTypes.map((type) => [
			type,
			episode.tracks
				.find((track) => track.type === type)
				?.clips.find((clip) => clip.start === section.start && clip.end === section.end),
		]),
	) as Partial<Record<(typeof previewTrackTypes)[number], TimelineClip>>;
