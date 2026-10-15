import type { Episode, TimelineClip, TimelineClipEdit } from "./sample";

export const NLE_FPS = 30;
export const frameTime = (seconds: number) => Math.round(seconds * NLE_FPS) / NLE_FPS;
export const defaultClipEdit: TimelineClipEdit = {
	sourceIn: 0,
	speed: 1,
	volume: 1,
	x: 0,
	y: 0,
	scale: 1,
	rotation: 0,
	opacity: 1,
};

export function validateClipEdit(clip: TimelineClip, sourceDuration?: number) {
	const edit = { ...defaultClipEdit, ...clip.edit };
	if (![clip.start, clip.end, ...Object.values(edit)].every(Number.isFinite))
		throw new Error("参数必须是有效数字");
	if (clip.start < 0 || clip.end - clip.start < 1 / NLE_FPS - 1e-6)
		throw new Error("片段时长至少为一帧，开始时间不能为负数");
	if (
		edit.sourceIn < 0 ||
		edit.speed < 0.25 ||
		edit.speed > 4 ||
		edit.volume < 0 ||
		edit.volume > 2 ||
		edit.scale < 0.1 ||
		edit.scale > 3 ||
		Math.abs(edit.x) > 1 ||
		Math.abs(edit.y) > 1 ||
		Math.abs(edit.rotation) > 180 ||
		edit.opacity < 0 ||
		edit.opacity > 1
	)
		throw new Error("片段参数超出有效范围");
	if (
		sourceDuration &&
		edit.sourceIn + (clip.end - clip.start) * edit.speed > sourceDuration + 1 / NLE_FPS
	)
		throw new Error("取用范围超出素材时长");
	return edit;
}

export function replaceNLEClip(
	episode: Episode,
	id: string,
	patch: Partial<TimelineClip>,
	sourceDuration?: number,
): Episode {
	let found = false;
	const tracks = episode.tracks.map((track) => {
		const previous = track.clips.find((clip) => clip.id === id);
		if (!previous) return track;
		found = true;
		const next = { ...previous, ...patch };
		next.start = frameTime(next.start);
		next.end = frameTime(next.end);
		validateClipEdit(next, sourceDuration);
		const delta = next.end - previous.end;
		return {
			...track,
			clips: track.clips.map((clip) =>
				clip.id === id
					? next
					: track.type === "video" && clip.start >= previous.end
						? { ...clip, start: frameTime(clip.start + delta), end: frameTime(clip.end + delta) }
						: clip,
			),
		};
	});
	if (!found) throw new Error("片段不存在");
	return { ...episode, editVersion: 1, tracks, duration: timelineDuration(tracks) };
}

export function timelineDuration(tracks: Episode["tracks"]) {
	return Math.max(
		1 / NLE_FPS,
		...tracks
			.filter(
				(track) =>
					track.type === "video" ||
					track.type === "caption" ||
					track.clips.some((clip) => clip.videoUrl),
			)
			.flatMap((track) => track.clips.map((clip) => clip.end)),
	);
}

export function formatFrameTime(seconds: number) {
	const frames = Math.max(0, Math.round(seconds * NLE_FPS));
	return [
		Math.floor(frames / (3600 * NLE_FPS)),
		Math.floor(frames / (60 * NLE_FPS)) % 60,
		Math.floor(frames / NLE_FPS) % 60,
		frames % NLE_FPS,
	]
		.map((value) => String(value).padStart(2, "0"))
		.join(":");
}
