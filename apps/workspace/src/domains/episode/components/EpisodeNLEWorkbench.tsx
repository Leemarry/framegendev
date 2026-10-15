import * as Dialog from "@radix-ui/react-dialog";
import { Clapperboard, Film, Music2, Search, X } from "lucide-react";
import { useState } from "react";
import type { Episode, TimelineClip } from "@/domains/episode/lib/sample";
import { formatTimelineTime } from "@/domains/episode/lib/sample";
import type { MediaAsset } from "@/domains/workspace/api/media";
import "./episode-nle.css";

interface EpisodeNLEWorkbenchProps {
	episode: Episode;
	assets?: MediaAsset[];
	assetsError?: boolean;
	selectedClipId: string;
	onSelectClip: (id: string) => void;
	onClose: () => void;
	onRestoreFocus?: () => void;
}

const bins = ["分镜", "素材", "音频", "字幕"] as const;
const panels = ["画面", "音频", "变速"] as const;

export function EpisodeNLEWorkbench({
	episode,
	assets,
	assetsError,
	selectedClipId,
	onSelectClip,
	onClose,
	onRestoreFocus,
}: EpisodeNLEWorkbenchProps) {
	const [bin, setBin] = useState<(typeof bins)[number]>("分镜");
	const [panel, setPanel] = useState<(typeof panels)[number]>("画面");
	const [query, setQuery] = useState("");
	const [inspectedAsset, setInspectedAsset] = useState<MediaAsset | null>(null);
	const selected = episode.tracks
		.flatMap((track) => track.clips)
		.find((clip) => clip.id === selectedClipId);
	const selectedTrack = episode.tracks.find((track) =>
		track.clips.some((clip) => clip.id === selectedClipId),
	);
	const select = (id: string) => {
		setInspectedAsset(null);
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
				if (!open) onClose();
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
						<span className="text-muted-foreground">{episode.aspectRatio}</span>
						<span className="font-mono text-xs">
							{formatTimelineTime(selected?.start ?? 0)} / {formatTimelineTime(episode.duration)}
						</span>
						<Dialog.Close className="nle-icon ml-auto" aria-label="关闭剪辑工作台" title="关闭">
							<X size={18} />
						</Dialog.Close>
					</header>
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
							<div className="nle-bin-items">
								{bin === "分镜" || bin === "字幕" ? (
									<>
										<p className="col-span-full text-xs text-muted-foreground">
											{episode.title}（{matchingClips.length}）
										</p>
										{matchingClips.map((clip) => (
											<button
												className="nle-media"
												aria-pressed={!inspectedAsset && selectedClipId === clip.id}
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
									<audio key={source} src={source} controls aria-label={previewTitle} />
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
										<dd>{inspectedAsset.durationSeconds ?? "未知"}</dd>
									</dl>
								) : selected ? (
									<dl>
										<dt>轨道</dt>
										<dd>{selectedTrack?.label}</dd>
										<dt>开始</dt>
										<dd>{selected.start.toFixed(3)} s</dd>
										<dt>结束</dt>
										<dd>{selected.end.toFixed(3)} s</dd>
										<dt>时长</dt>
										<dd>{(selected.end - selected.start).toFixed(3)} s</dd>
										<dt>{panel === "画面" ? "内容" : panel === "音频" ? "音频" : "速度"}</dt>
										<dd>
											{panel === "画面"
												? selected.content || "—"
												: panel === "音频"
													? "原始音频"
													: "1.0×"}
										</dd>
									</dl>
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
											aria-pressed={!inspectedAsset && selectedClipId === clip.id}
											title={`${clip.title} ${(clip.end - clip.start).toFixed(2)}s`}
											onClick={() => select(clip.id)}
											style={{
												left: `${(clip.start / Math.max(episode.duration, 1)) * 100}%`,
												width: `${Math.max(((clip.end - clip.start) / Math.max(episode.duration, 1)) * 100, 0.5)}%`,
											}}
										>
											{track.type === "video" && <ClipThumbnail clip={clip} />}
											<span>{track.type === "caption" ? clip.content : clip.title}</span>
										</button>
									))}
								</div>
							</div>
						))}
					</section>
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
