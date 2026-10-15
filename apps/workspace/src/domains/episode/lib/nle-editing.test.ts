import { describe, expect, it } from "vitest";
import { sampleEpisode } from "./sample";
import {
	defaultClipEdit,
	formatFrameTime,
	frameTime,
	replaceNLEClip,
	validateClipEdit,
} from "./nle-editing";

describe("NLE edits", () => {
	it("rounds fractional timing to frames and ripples only following video clips", () => {
		const edited = replaceNLEClip(sampleEpisode, "clip-cold-open", { end: 1.7 });
		expect(edited.tracks[0].clips[0].end).toBe(1.7);
		expect(edited.tracks[0].clips[1].start).toBe(1.7);
		expect(edited.tracks[1]).toBe(sampleEpisode.tracks[1]);
		expect(sampleEpisode.tracks[0].clips[0].end).toBe(8);
		expect(formatFrameTime(frameTime(1.71))).toBe("00:00:01:21");
	});
	it("rejects invalid edits and ranges beyond real source, preserving zero volume/opacity", () => {
		const clip = {
			...sampleEpisode.tracks[0].clips[0],
			edit: { ...defaultClipEdit, volume: 0, opacity: 0 },
		};
		expect(validateClipEdit(clip, 8).volume).toBe(0);
		expect(() => validateClipEdit({ ...clip, edit: { ...clip.edit, speed: 2 } }, 8)).toThrow(
			"超出素材",
		);
		expect(() => validateClipEdit({ ...clip, end: Number.NaN })).toThrow("有效数字");
		expect(() => validateClipEdit({ ...clip, end: 0 })).toThrow("一帧");
	});
});
