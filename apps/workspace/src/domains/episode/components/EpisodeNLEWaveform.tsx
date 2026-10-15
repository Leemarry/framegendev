import { useEffect, useRef, useState } from "react";
import type { TimelineClip } from "../lib/sample";
import { defaultClipEdit } from "../lib/nle-editing";
import { audioPeaks } from "../lib/audio-peaks";

export function EpisodeNLEWaveform({ clip }: { clip: TimelineClip }) {
	const canvas = useRef<HTMLCanvasElement>(null);
	const [state, setState] = useState("正在解码波形");
	const [peaks, setPeaks] = useState<number[]>([]);
	const edit = { ...defaultClipEdit, ...clip.edit };
	useEffect(() => {
		if (!clip.audioUrl) return;
		const url = clip.audioUrl;
		const abort = new AbortController();
		const context = new AudioContext();
		setState("正在解码波形");
		setPeaks([]);
		void (async () => {
			try {
				const response = await fetch(url, { signal: abort.signal });
				if (!response.ok) throw new Error("音频读取失败");
				const limit = 64 * 1024 * 1024;
				if (Number(response.headers.get("content-length")) > limit)
					throw new Error("音频超过64MB波形解码限制");
				const bytes = await response.arrayBuffer();
				if (bytes.byteLength > limit) throw new Error("音频超过64MB波形解码限制");
				const buffer = await context.decodeAudioData(bytes);
				if (abort.signal.aborted) return;
				setPeaks(
					audioPeaks(
						Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i)),
						buffer.sampleRate,
						edit.sourceIn,
						(clip.end - clip.start) * edit.speed,
					),
				);
				setState("");
			} catch (err) {
				if (!abort.signal.aborted) setState(err instanceof Error ? err.message : "波形解码失败");
			} finally {
				if (context.state !== "closed") void context.close();
			}
		})();
		return () => {
			abort.abort();
			if (context.state !== "closed") void context.close();
		};
	}, [clip.audioUrl, clip.start, clip.end, edit.sourceIn, edit.speed]);
	useEffect(() => {
		const node = canvas.current;
		const draw = node?.getContext("2d");
		if (!node || !draw) return;
		draw.clearRect(0, 0, node.width, node.height);
		draw.fillStyle = getComputedStyle(node).color;
		peaks.forEach((value, i) =>
			draw.fillRect(i * 2, 16 - Math.max(1, value * 15), 1, Math.max(1, value * 30)),
		);
	}, [peaks]);
	return (
		<span className="nle-waveform" data-waveform-state={state ? "pending-or-error" : "decoded"}>
			{state ? (
				<span role="status">{state}</span>
			) : (
				<canvas ref={canvas} width={320} height={32} aria-label="真实音频波形" />
			)}
		</span>
	);
}
