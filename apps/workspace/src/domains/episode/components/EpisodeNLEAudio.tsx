import { useEffect, useRef } from "react";
import type { TimelineClip } from "../lib/sample";
import { defaultClipEdit, sourceTimeForClip } from "../lib/nle-editing";
import { useNLEMediaGain } from "./useNLEMediaGain";

export function EpisodeNLEAudio({
	clip,
	time,
	playing,
	onError,
}: {
	clip: TimelineClip;
	time: number;
	playing: boolean;
	onError: () => void;
}) {
	const media = useRef<HTMLAudioElement>(null);
	const edit = { ...defaultClipEdit, ...clip.edit };
	const active = time >= clip.start && time < clip.end;
	useNLEMediaGain(media, clip.audioUrl, edit.volume, playing && active);
	useEffect(() => {
		const element = media.current;
		if (!element) return;
		element.playbackRate = edit.speed;
		const target = sourceTimeForClip(clip, time);
		if (
			active &&
			element.readyState >= 1 &&
			(!playing || Math.abs(element.currentTime - target) > 1 / 30)
		)
			element.currentTime = target;
		if (active && playing && element.paused) void element.play().catch(onError);
		if (!active || !playing) element.pause();
	}, [time, playing, clip, active, edit.speed]);
	return (
		<audio
			ref={media}
			src={clip.audioUrl}
			preload="auto"
			aria-label={`时间轴音频：${clip.title}`}
			onError={onError}
			onLoadedMetadata={(event) => {
				event.currentTarget.currentTime = sourceTimeForClip(clip, time);
			}}
		/>
	);
}
