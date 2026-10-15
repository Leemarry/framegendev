import * as Dialog from "@radix-ui/react-dialog";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import {
	Clapperboard,
	Film,
	Music2,
	Search,
	X,
	Undo2,
	Redo2,
	Save,
	Plus,
	Download,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import type { Episode, TimelineClip } from "@/domains/episode/lib/sample";
import { formatTimelineTime } from "@/domains/episode/lib/sample";
import type { MediaAsset } from "@/domains/workspace/api/media";
import { EpisodeNLEInspector } from "./EpisodeNLEInspector";
import { EpisodeNLEPlayer } from "./EpisodeNLEPlayer";
import { EpisodeNLEExportDialog } from "./EpisodeNLEExportDialog";
import { EpisodeNLECaptionInspector } from "./EpisodeNLECaptionInspector";
import { EpisodeNLEWaveform } from "./EpisodeNLEWaveform";
import type {
	ExportWorkspaceEpisodeJianyingDraftRequest,
	ExportWorkspaceEpisodeJianyingDraftResponse,
} from "@/domains/workspace/api/workspace";
import {
	defaultClipEdit,
	frameTime,
	replaceNLEClip,
	formatFrameTime,
	addNLEClip,
	removeNLEClip,
} from "../lib/nle-editing";
import "./episode-nle.css";

interface EpisodeNLEWorkbenchProps {
	episode: Episode;
	assets?: MediaAsset[];
	assetsError?: boolean;
	selectedClipId: string;
	onSelectClip: (id: string) => void;
	onClose: () => void;
	onRestoreFocus?: () => void;
	onSave?: (episode: Episode) => Promise<void>;
	onExport?: (
		request: ExportWorkspaceEpisodeJianyingDraftRequest,
	) => Promise<ExportWorkspaceEpisodeJianyingDraftResponse>;
	draftsRoot?: string;
}

const bins = ["分镜", "素材", "音频", "字幕"] as const;
const panels = ["画面", "音频", "变速"] as const;

export function EpisodeNLEWorkbench({
	episode: initialEpisode,
	assets,
	assetsError,
	selectedClipId,
	onSelectClip,
	onClose,
	onRestoreFocus,
	onSave,
	onExport,
	draftsRoot = "",
}: EpisodeNLEWorkbenchProps) {
	const [history, setHistory] = useState<{ past: Episode[]; present: Episode; future: Episode[] }>({
		past: [],
		present: initialEpisode,
		future: [],
	});
	const episode = history.present;
	const [selectedId, setSelectedId] = useState(selectedClipId);
	const [playhead, setPlayhead] = useState(0);
	const [savedSnapshot, setSavedSnapshot] = useState(JSON.stringify(initialEpisode));
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState("");
	const [discardOpen, setDiscardOpen] = useState(false);
	const [exportOpen, setExportOpen] = useState(false);
	const dirty = JSON.stringify(episode) !== savedSnapshot;
	const change = (next: Episode) => {
		setHistory((current) => ({
			past: [...current.past.slice(-99), current.present],
			present: next,
			future: [],
		}));
		setSaveError("");
	};
	const requestClose = () => {
		if (saving) return;
		if (dirty) setDiscardOpen(true);
		else onClose();
	};
	const save = async () => {
		if (!onSave || saving) return;
		setSaving(true);
		try {
			await onSave(episode);
			setSavedSnapshot(JSON.stringify(episode));
			setSaveError("");
		} catch (error) {
			setSaveError(
				typeof error === "object" && error && "message" in error
					? String(error.message)
					: "保存失败，请重试",
			);
		} finally {
			setSaving(false);
		}
	};
	const [bin, setBin] = useState<(typeof bins)[number]>("分镜");
	const [panel, setPanel] = useState<(typeof panels)[number]>("画面");
	const [query, setQuery] = useState("");
	const [inspectedAsset, setInspectedAsset] = useState<MediaAsset | null>(null);
	const [audioTrack, setAudioTrack] = useState<"voiceover" | "music">("voiceover");
	const [audioDurations, setAudioDurations] = useState<Record<string, number>>({});
	const inspectedDuration =
		inspectedAsset?.durationSeconds ??
		(inspectedAsset ? audioDurations[inspectedAsset.url] : undefined);
	const selected = episode.tracks
		.flatMap((track) => track.clips)
		.find((clip) => clip.id === selectedId);
	const selectedTrack = episode.tracks.find((track) =>
		track.clips.some((clip) => clip.id === selectedId),
	);
	const select = (id: string) => {
		setInspectedAsset(null);
		setSelectedId(id);
		onSelectClip(id);
	};
	const matchingClips = episode.tracks
		.filter((track) => (bin === "字幕" ? track.type === "caption" : track.type === "video"))
		.flatMap((track) => track.clips)
		.filter((clip) => `${clip.title} ${clip.content}`.toLowerCase().includes(query.toLowerCase()));
	const matchingAssets = assets?.filter(
		(asset) =>
			(bin === "音频"
				? asset.kind === "audio"
				: asset.kind === "image" || asset.kind === "video") &&
			asset.filename.toLowerCase().includes(query.toLowerCase()),
	);
	const source = inspectedAsset?.url ?? selected?.videoUrl;
	const poster = inspectedAsset?.posterUrl ?? selected?.posterUrl ?? selected?.thumbnailUrl;
	const previewKind = inspectedAsset?.kind ?? (selectedTrack?.type === "video" ? "video" : "text");
	const previewTitle = inspectedAsset?.filename ?? selected?.title;

	return (
		<Dialog.Root
			open
			onOpenChange={(open) => {
				if (!open) requestClose();
			}}
		>
			<Dialog.Portal>
				<Dialog.Overlay className="nle-overlay" />
				<Dialog.Content
					className="nle-workbench"
					aria-describedby={undefined}
					onCloseAutoFocus={(event) => {
						event.preventDefault();
						onRestoreFocus?.();
					}}
					onPointerDownOutside={(event) => event.preventDefault()}
				>
					<header className="nle-header">
						<Dialog.Title className="flex items-center gap-2 font-semibold">
							<Clapperboard size={20} />
							剪辑工作台
						</Dialog.Title>
						<span className="nle-title">{episode.title}</span>
						<select
							aria-label="画幅"
							value={episode.aspectRatio}
							disabled={saving}
							onChange={(event) =>
								change({ ...episode, editVersion: 1, aspectRatio: event.target.value })
							}
						>
							<option>16:9</option>
							<option>9:16</option>
							<option>1:1</option>
						</select>
						<span className="font-mono text-xs">
							{formatFrameTime(playhead)} / {formatFrameTime(episode.duration)}
						</span>
						<button
							className="nle-icon"
							type="button"
							aria-label="撤销"
							title="撤销"
							disabled={saving || history.past.length === 0}
							onClick={() =>
								setHistory((current) => ({
									past: current.past.slice(0, -1),
									present: current.past.at(-1) ?? current.present,
									future: [current.present, ...current.future],
								}))
							}
						>
							<Undo2 size={17} />
						</button>
						<button
							className="nle-icon"
							type="button"
							aria-label="重做"
							title="重做"
							disabled={saving || history.future.length === 0}
							onClick={() =>
								setHistory((current) => ({
									past: [...current.past, current.present],
									present: current.future[0] ?? current.present,
									future: current.future.slice(1),
								}))
							}
						>
							<Redo2 size={17} />
						</button>
						<button
							className="nle-command ml-auto"
							type="button"
							disabled={!dirty || saving || !onSave}
							onClick={() => void save()}
						>
							<Save size={15} />
							{saving ? "保存中" : "保存草稿"}
						</button>
						<span className="text-xs text-muted-foreground" role="status">
							{dirty ? "未保存" : "已保存"}
						</span>
						<button
							className="nle-command"
							type="button"
							disabled={dirty || saving || !onExport}
							title={dirty ? "请先保存草稿" : "导出剪映草稿"}
							onClick={() => setExportOpen(true)}
						>
							<Download size={15} />
							导出
						</button>
						<button
							className="nle-icon"
							type="button"
							disabled={saving}
							onClick={requestClose}
							aria-label="关闭剪辑工作台"
							title="关闭"
						>
							<X size={18} />
						</button>
					</header>
					{saveError && (
						<p className="px-4 py-2 text-xs text-error-foreground" role="alert">
							{saveError}
						</p>
					)}
					<div className="nle-main">
						<aside className="nle-bin" aria-label="剪辑素材区">
							<div className="nle-tabs" role="tablist" aria-label="素材分类">
								{bins.map((item) => (
									<button
										key={item}
										type="button"
										role="tab"
										aria-selected={bin === item}
										onClick={() => {
											setBin(item);
											setQuery("");
										}}
									>
										{item}
									</button>
								))}
							</div>
							<label className="nle-search">
								<Search size={16} />
								<input
									aria-label="搜索剪辑素材"
									placeholder="搜索素材"
									value={query}
									onChange={(event) => setQuery(event.target.value)}
								/>
							</label>
							{bin === "字幕" && (
								<button
									type="button"
									className="nle-command mx-3 mb-2"
									disabled={saving}
									onClick={() => {
										const start = frameTime(
											Math.max(0, Math.min(selected?.start ?? 0, episode.duration - 1 / 30)),
										);
										const clip: TimelineClip = {
											id: `caption-${crypto.randomUUID()}`,
											title: "新字幕",
											content: "新字幕",
											start,
											end: frameTime(Math.min(episode.duration, start + 2)),
											status: "ready",
										};
										change(addNLEClip(episode, "caption", clip));
										select(clip.id);
									}}
								>
									<Plus size={15} />
									添加字幕
								</button>
							)}
							<div className="nle-bin-items">
								{bin === "分镜" || bin === "字幕" ? (
									<>
										<p className="col-span-full text-xs text-muted-foreground">
											{episode.title}（{matchingClips.length}）
										</p>
										{matchingClips.map((clip) => (
											<button
												className="nle-media"
												aria-pressed={!inspectedAsset && selectedId === clip.id}
												key={clip.id}
												type="button"
												onClick={() => select(clip.id)}
											>
												{bin === "分镜" ? (
													<ClipThumbnail clip={clip} />
												) : (
													<span className="nle-caption-text">{clip.content}</span>
												)}
												<span className="nle-media-title">{clip.title}</span>
												<span className="nle-duration">{(clip.end - clip.start).toFixed(2)}s</span>
											</button>
										))}
										{matchingClips.length === 0 && <p className="nle-empty">没有匹配的片段</p>}
									</>
								) : (
									<>
										{assetsError ? (
											<p role="alert" className="nle-empty text-error-foreground">
												素材读取失败，请关闭后重试
											</p>
										) : !assets ? (
											<p className="nle-empty">正在读取素材…</p>
										) : (
											<>
												{matchingAssets?.map((asset) => (
													<button
														className="nle-media"
														aria-pressed={inspectedAsset?.id === asset.id}
														key={asset.id}
														type="button"
														onClick={() => setInspectedAsset(asset)}
													>
														{asset.kind === "audio" ? (
															<Music2 className="m-auto" />
														) : asset.posterUrl || asset.kind === "image" ? (
															<img src={asset.posterUrl || asset.url} alt="" />
														) : (
															<Film className="m-auto" />
														)}
														<span className="nle-media-title">{asset.filename}</span>
													</button>
												))}
												{matchingAssets?.length === 0 && (
													<p className="nle-empty">暂无{bin === "音频" ? "音频" : "素材"}</p>
												)}
											</>
										)}
									</>
								)}
							</div>
						</aside>
						<section className="nle-preview" aria-label="剪辑预览">
							{!inspectedAsset ? (
								<EpisodeNLEPlayer
									episode={episode}
									seekTime={selected?.start ?? 0}
									onTimeChange={setPlayhead}
								/>
							) : (
								<>
									<div
										className="nle-preview-stage"
										style={{ aspectRatio: episode.aspectRatio.replace(":", "/") }}
									>
										{source && previewKind === "video" ? (
											<video
												key={source}
												src={source}
												poster={poster}
												controls
												preload="metadata"
												aria-label={previewTitle}
											/>
										) : source && previewKind === "image" ? (
											<img src={source} alt={previewTitle} />
										) : source && previewKind === "audio" ? (
											<audio
												key={source}
												src={source}
												controls
												aria-label={previewTitle}
												onLoadedMetadata={(event) => {
													const duration = event.currentTarget.duration;
													if (Number.isFinite(duration) && duration > 0)
														setAudioDurations((current) => ({ ...current, [source]: duration }));
												}}
											/>
										) : poster ? (
											<img src={poster} alt={previewTitle} />
										) : (
											<p className="text-sm text-muted-foreground">
												{selectedTrack?.type === "caption"
													? selected?.content
													: "当前片段暂无可预览媒体"}
											</p>
										)}
									</div>
								</>
							)}
							<p className="px-3 py-2 text-xs text-muted-foreground">
								{previewTitle ?? "未选择片段"}
							</p>
							<div className="mt-auto border-t border-border px-3 py-3 text-xs text-muted-foreground">
								Drami 剪辑助手【待开发】
							</div>
						</section>
						<aside className="nle-inspector" aria-label="片段检查器">
							<div className="nle-tabs" role="tablist" aria-label="片段参数">
								{panels.map((item) => (
									<button
										key={item}
										type="button"
										role="tab"
										aria-selected={panel === item}
										onClick={() => setPanel(item)}
									>
										{item}
									</button>
								))}
							</div>
							<div className="nle-inspector-body">
								<h2 className="mb-4 text-sm font-medium">{previewTitle ?? "未选择片段"}</h2>
								{inspectedAsset ? (
									<dl>
										<dt>文件</dt>
										<dd>{inspectedAsset.filename}</dd>
										<dt>类型</dt>
										<dd>{inspectedAsset.mimeType}</dd>
										<dt>时长</dt>
										<dd>{inspectedDuration ?? "未知"}</dd>
									</dl>
								) : selected ? (
									<fieldset disabled={saving}>
										{selectedTrack?.type === "caption" ? (
											<EpisodeNLECaptionInspector
												key={JSON.stringify(selected)}
												clip={selected}
												onApply={(clip) => change(replaceNLEClip(episode, clip.id, clip))}
											/>
										) : (
											<EpisodeNLEInspector
												key={JSON.stringify(selected)}
												clip={selected}
												panel={panel}
												audio={
													selectedTrack?.type === "voiceover" || selectedTrack?.type === "music"
												}
												sourceDuration={
													assets?.find(
														(asset) => asset.url === (selected.audioUrl ?? selected.videoUrl),
													)?.durationSeconds ?? audioDurations[selected.audioUrl ?? ""]
												}
												onApply={(clip) =>
													change(
														replaceNLEClip(
															episode,
															clip.id,
															clip,
															assets?.find(
																(asset) => asset.url === (clip.audioUrl ?? clip.videoUrl),
															)?.durationSeconds,
														),
													)
												}
											/>
										)}
										{selectedTrack?.type !== "video" && (
											<button
												type="button"
												className="nle-command mt-3"
												aria-label="删除片段"
												title="删除片段"
												onClick={() => {
													change(removeNLEClip(episode, selected.id));
													select("");
												}}
											>
												<Trash2 size={15} />
											</button>
										)}
									</fieldset>
								) : (
									<p className="text-xs text-muted-foreground">未选择片段</p>
								)}
							</div>
						</aside>
					</div>
					<section className="nle-timeline" aria-label="剪辑时间轴">
						<div className="nle-track">
							<span>时间</span>
							<div className="nle-ruler">
								{Array.from({ length: 7 }, (_, index) => (
									<span key={index}>{formatTimelineTime((episode.duration * index) / 6)}</span>
								))}
							</div>
						</div>
						{episode.tracks.map((track) => (
							<div className="nle-track" key={track.id}>
								<span>{track.label}</span>
								<div className="nle-track-clips">
									{track.clips.map((clip) => (
										<button
											type="button"
											key={clip.id}
											aria-label={`${track.label}：${clip.title}`}
											aria-pressed={!inspectedAsset && selectedId === clip.id}
											title={`${clip.title} ${(clip.end - clip.start).toFixed(2)}s`}
											onClick={() => select(clip.id)}
											style={{
												left: `${Math.min(99.5, (clip.start / Math.max(episode.duration, 1 / 30)) * 100)}%`,
												width: `${Math.max(((Math.min(clip.end, episode.duration) - clip.start) / Math.max(episode.duration, 1 / 30)) * 100, 0.5)}%`,
											}}
										>
											{track.type === "video" && <ClipThumbnail clip={clip} />}
											{clip.audioUrl && <EpisodeNLEWaveform clip={clip} />}
											<span>
												{track.type === "caption" ? clip.content : clip.title}
												{track.type !== "video" &&
												track.type !== "caption" &&
												!clip.audioUrl &&
												!clip.videoUrl
													? "【待生成】"
													: ""}
											</span>
										</button>
									))}
									<div
										className="nle-playhead"
										style={{ left: `${Math.min(100, (playhead / episode.duration) * 100)}%` }}
									/>
								</div>
							</div>
						))}
					</section>
					{exportOpen && onExport && (
						<EpisodeNLEExportDialog
							initialRoot={draftsRoot}
							title={episode.title}
							onExport={onExport}
							onClose={() => setExportOpen(false)}
						/>
					)}
					{inspectedAsset?.kind === "audio" && (
						<div className="flex flex-wrap items-center justify-end gap-2 border-t border-border p-2">
							<select
								aria-label="音频目标轨道"
								value={audioTrack}
								onChange={(event) =>
									setAudioTrack(event.target.value === "music" ? "music" : "voiceover")
								}
							>
								<option value="voiceover">旁白</option>
								<option value="music">音乐</option>
							</select>
							<button
								type="button"
								className="nle-command"
								disabled={
									saving || inspectedAsset.storageStatus === "missing" || !inspectedDuration
								}
								onClick={() => {
									const start = selected?.start ?? 0;
									const clip: TimelineClip = {
										id: `audio-${crypto.randomUUID()}`,
										title: inspectedAsset.filename,
										content: "",
										start,
										end: frameTime(start + (inspectedDuration ?? 0)),
										status: "ready",
										audioUrl: inspectedAsset.url,
										edit: { ...defaultClipEdit },
									};
									change(addNLEClip(episode, audioTrack, clip));
									select(clip.id);
								}}
							>
								<Plus size={15} />
								添加到音轨
							</button>
						</div>
					)}
					{inspectedAsset?.kind === "video" && selected && selectedTrack?.type === "video" && (
						<button
							type="button"
							className="nle-command"
							disabled={saving || inspectedAsset.storageStatus === "missing"}
							onClick={() => {
								const duration = frameTime(
									inspectedAsset.durationSeconds ?? selected.end - selected.start,
								);
								change(
									replaceNLEClip(
										episode,
										selected.id,
										{
											videoUrl: inspectedAsset.url,
											posterUrl: inspectedAsset.posterUrl,
											status: "ready",
											end: selected.start + duration,
											edit: { ...defaultClipEdit },
										},
										inspectedAsset.durationSeconds,
									),
								);
								setInspectedAsset(null);
							}}
						>
							<Plus size={15} />
							替换选中分镜素材
						</button>
					)}
					<AlertDialog.Root open={discardOpen} onOpenChange={setDiscardOpen}>
						<AlertDialog.Portal>
							<AlertDialog.Overlay className="nle-confirm-overlay" />
							<AlertDialog.Content className="nle-confirm">
								<AlertDialog.Title>放弃未保存的剪辑？</AlertDialog.Title>
								<AlertDialog.Description className="my-3 text-xs text-muted-foreground">
									尚未保存的参数将被丢弃。
								</AlertDialog.Description>
								<div className="flex justify-end gap-3">
									<AlertDialog.Cancel className="nle-command">继续编辑</AlertDialog.Cancel>
									<AlertDialog.Action className="nle-command" onClick={onClose}>
										放弃更改
									</AlertDialog.Action>
								</div>
							</AlertDialog.Content>
						</AlertDialog.Portal>
					</AlertDialog.Root>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

function ClipThumbnail({ clip }: { clip: TimelineClip }) {
	const url = clip.posterUrl || clip.thumbnailUrl;
	return url ? (
		<img src={url} alt="" />
	) : (
		<Film className="m-auto text-muted-foreground" size={24} />
	);
}
