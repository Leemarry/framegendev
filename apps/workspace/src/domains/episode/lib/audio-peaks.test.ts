import { describe, expect, it } from "vitest";
import { audioPeaks } from "./audio-peaks";

describe("real PCM peaks", () => {
	it("preserves actual silence, trimmed signal and both channels", () => {
		const left = new Float32Array([0, 0, 0.25, -0.5, 0, 0, 0, 0]);
		const right = new Float32Array([0, 0, 0, -0.9, 0, 0, 0, 0]);
		expect(audioPeaks([left, right], 4, 0, 2, 4)).toEqual([0, expect.closeTo(0.9), 0, 0]);
		expect(audioPeaks([left], 4, 0.5, 0.5, 1)).toEqual([0.5]);
		expect(audioPeaks([left], 4, 1, 1, 2)).toEqual([0, 0]);
	});
});
