import { describe, expect, it } from "vitest";
import { addNLEClip, removeNLEClip, replaceNLEClip } from "./nle-editing";
import type { Episode, TimelineClip } from "./sample";

describe("caption/audio history operations", () => {
	it("keeps original episode immutable, adds missing tracks, preserves audio URLs and timing", () => {
		const original: Episode = {
			id: "e",
			title: "e",
			duration: 4,
			aspectRatio: "16:9",
			sections: [],
			tracks: [],
		};
		const caption: TimelineClip = {
			id: "c",
			title: "文字",
			content: "你好",
			start: 0.5,
			end: 1.7,
			status: "ready",
		};
		const audio: TimelineClip = {
			id: "a",
			title: "声",
			content: "",
			start: 0,
			end: 5,
			status: "ready",
			audioUrl: "/actual.wav",
		};
		const first = addNLEClip(original, "caption", caption);
		const next = addNLEClip(first, "voiceover", audio);
		expect(original.tracks).toEqual([]);
		expect(next.duration).toBe(5);
		const edited = replaceNLEClip(next, "a", { start: 1, end: 3.5 });
		expect(edited.tracks[1].clips[0]).toMatchObject({
			audioUrl: "/actual.wav",
			start: 1,
			end: 3.5,
		});
		expect(edited.tracks[0].clips[0]).toEqual(caption);
		expect(removeNLEClip(edited, "a").duration).toBe(1.7);
		expect(next.tracks[1].clips[0].end).toBe(5);
		const placeholder = {
			...original,
			tracks: [
				{
					id: "music",
					type: "music" as const,
					label: "音乐",
					clips: [
						{ ...audio, id: "placeholder", audioUrl: undefined, status: "draft" as const, end: 30 },
					],
				},
			],
		};
		expect(addNLEClip(placeholder, "music", audio).duration).toBe(5);
	});
});
