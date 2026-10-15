import { Pause, Play, SkipBack } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Episode, TimelineClip } from "../lib/sample";
import { defaultClipEdit, formatFrameTime, frameTime } from "../lib/nle-editing";

export function sourceTimeForClip(clip: TimelineClip, timelineTime: number) {
	const edit = { ...defaultClipEdit, ...clip.edit };
	return (
		edit.sourceIn +
		Math.max(0, Math.min(timelineTime - clip.start, clip.end - clip.start)) * edit.speed
	);
}

interface Props {
	episode: Episode;
	seekTime?: number;
	onTimeChange?: (time: number) => void;
}

export function EpisodeNLEPlayer({ episode, seekTime = 0, onTimeChange }: Props) {
	const [time, setTime] = useState(seekTime);
	const [playing, setPlaying] = useState(false);
	const [error, setError] = useState("");
	const video = useRef<HTMLVideoElement>(null);
	const gain = useRef<GainNode | null>(null);
	const audioContext = useRef<AudioContext | null>(null);
	const graph = useRef<{
		element: HTMLVideoElement;
		context: AudioContext;
		node: GainNode;
		cleanup?: ReturnType<typeof setTimeout>;
	} | null>(null);
	const timeRef = useRef(time);
	const clip = episode.tracks
		.find((track) => track.type === "video")
		?.clips.find((item) => time >= item.start && time < item.end);
	const edit = { ...defaultClipEdit, ...clip?.edit };
	const updateTime = (value: number) => {
		const next = Math.max(0, Math.min(value, episode.duration));
		timeRef.current = next;
		setTime(next);
		onTimeChange?.(next);
	};
	const seek = (value: number) => {
		updateTime(frameTime(value));
		const nextClip = episode.tracks
			.find((track) => track.type === "video")
			?.clips.find((item) => value >= item.start && value < item.end);
		if (nextClip && nextClip.id === clip?.id && video.current)
			video.current.currentTime = sourceTimeForClip(nextClip, value);
	};
	useEffect(() => {
		updateTime(seekTime);
		setPlaying(false);
		if (clip && video.current) video.current.currentTime = sourceTimeForClip(clip, seekTime);
	}, [seekTime]);
	useEffect(() => {
		if (clip && video.current && video.current.readyState >= 1)
			video.current.currentTime = sourceTimeForClip(clip, timeRef.current);
	}, [clip?.id, edit.sourceIn, edit.speed]);
	useEffect(() => {
		setError("");
		const element = video.current;
		if (!element || !clip?.videoUrl) return;
		if (globalThis.AudioContext) {
			// StrictMode reconnects effects on the same media element.
			if (graph.current?.cleanup) clearTimeout(graph.current.cleanup);
			if (graph.current?.element !== element) {
				if (graph.current) void graph.current.context.close();
				const context = new AudioContext();
				const node = context.createGain();
				context.createMediaElementSource(element).connect(node);
				node.connect(context.destination);
				graph.current = { element, context, node };
			}
			const { context, node } = graph.current;
			gain.current = node;
			audioContext.current = context;
			return () => {
				gain.current = null;
				audioContext.current = null;
				if (graph.current) graph.current.cleanup = setTimeout(() => void context.close(), 0);
			};
		}
	}, [clip?.id, clip?.videoUrl]);
	useEffect(() => {
		const element = video.current;
		if (playing && clip && !clip.videoUrl) {
			setError("当前片段缺少媒体");
			setPlaying(false);
		}
		if (!element) return;
		element.playbackRate = edit.speed;
		if (gain.current) gain.current.gain.value = edit.volume;
		else element.volume = Math.min(1, edit.volume);
		if (playing) {
			void audioContext.current?.resume();
			void element.play().catch(() => {
				setError("媒体播放失败，请检查素材或重试");
				setPlaying(false);
			});
		} else element.pause();
	}, [playing, clip?.id, clip?.videoUrl, edit.speed, edit.volume]);
	useEffect(() => {
		if (!playing) return;
		let handle = 0;
		let previous = performance.now();
		const tick = (now: number) => {
			const delta = Math.min((now - previous) / 1000, 0.1);
			previous = now;
			const element = video.current;
			let next = timeRef.current;
			if (clip?.videoUrl && element && element.readyState >= 2)
				next = Math.max(
					clip.start,
					Math.min(clip.end, clip.start + (element.currentTime - edit.sourceIn) / edit.speed),
				);
			else if (!clip) next += delta;
			if (next >= episode.duration - 1e-6) {
				updateTime(episode.duration);
				setPlaying(false);
				return;
			}
			updateTime(next);
			handle = requestAnimationFrame(tick);
		};
		handle = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(handle);
	}, [playing, clip?.id, clip?.videoUrl, edit.sourceIn, edit.speed, episode.duration]);
	return (
		<div className="nle-player">
			<div
				className="nle-player-stage"
				style={{ aspectRatio: episode.aspectRatio.replace(":", "/") }}
			>
				{clip?.videoUrl ? (
					<div
						className="nle-player-visual"
						style={{
							transform: `translate(${edit.x * 50}%,${-edit.y * 50}%) rotate(${edit.rotation}deg) scale(${edit.scale})`,
							opacity: edit.opacity,
						}}
					>
						<video
							key={`${clip.id}:${clip.videoUrl}`}
							ref={video}
							src={clip.videoUrl}
							poster={clip.posterUrl}
							preload="auto"
							playsInline
							aria-label="时间轴视频"
							onLoadedMetadata={(event) => {
								event.currentTarget.currentTime = sourceTimeForClip(clip, timeRef.current);
								event.currentTarget.playbackRate = edit.speed;
								if (playing) void event.currentTarget.play().catch(() => setPlaying(false));
							}}
							onEnded={() => {
								updateTime(clip.end);
								if (clip.end >= episode.duration) setPlaying(false);
							}}
							onError={() => {
								setError("媒体无法读取或解码");
								setPlaying(false);
							}}
						/>
					</div>
				) : (
					<span className="text-xs text-muted-foreground">
						{clip ? "当前片段暂无可预览媒体" : "无画面"}
					</span>
				)}
			</div>
			{error && (
				<p role="alert" className="p-2 text-xs text-error-foreground">
					{error}
				</p>
			)}
			<div className="nle-player-controls">
				<button
					type="button"
					className="nle-icon"
					aria-label="回到开头"
					title="回到开头"
					onClick={() => seek(0)}
				>
					<SkipBack size={16} />
				</button>
				<button
					type="button"
					className="nle-icon"
					aria-label={playing ? "暂停时间轴" : "播放时间轴"}
					title={playing ? "暂停" : "播放"}
					onClick={() => {
						if (clip && !clip.videoUrl) {
							setError("当前片段缺少媒体");
							return;
						}
						if (time >= episode.duration) seek(0);
						setPlaying(!playing);
					}}
				>
					{playing ? <Pause size={18} /> : <Play size={18} />}
				</button>
				<span className="font-mono text-xs">
					{formatFrameTime(time)} / {formatFrameTime(episode.duration)}
				</span>
			</div>
			<input
				type="range"
				className="w-full"
				aria-label="时间轴播放位置"
				min="0"
				max={episode.duration}
				step={1 / 30}
				value={time}
				onChange={(event) => seek(event.target.valueAsNumber)}
			/>
		</div>
	);
}
