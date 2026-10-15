import { describe, expect, it, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { StrictMode } from "react";
import { EpisodeNLEPlayer, sourceTimeForClip } from "./EpisodeNLEPlayer";
import { defaultClipEdit } from "../lib/nle-editing";

describe("NLE source time", () => {
	it("reuses the audio graph during StrictMode effect reconnection", () => {
		const createSource = vi.fn(() => ({ connect: vi.fn() }));
		vi.stubGlobal(
			"AudioContext",
			class {
				createMediaElementSource = createSource;
				createGain = () => ({ connect: vi.fn(), gain: { value: 1 } });
				close = () => Promise.resolve();
			},
		);
		const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
		render(
			<StrictMode>
				<EpisodeNLEPlayer
					episode={{
						id: "a",
						title: "a",
						duration: 4,
						aspectRatio: "16:9",
						sections: [],
						tracks: [
							{
								id: "v",
								type: "video",
								label: "video",
								clips: [
									{
										id: "a",
										title: "a",
										start: 0,
										end: 4,
										content: "",
										status: "ready",
										videoUrl: "/test.mp4",
									},
								],
							},
						],
					}}
				/>
			</StrictMode>,
		);
		expect(createSource).toHaveBeenCalledTimes(1);
		cleanup();
		pause.mockRestore();
		vi.unstubAllGlobals();
	});
	it("maps fractional timeline time through trim and speed within one frame", () => {
		const clip = {
			id: "a",
			title: "a",
			start: 2.5,
			end: 4.2,
			content: "",
			status: "ready" as const,
			edit: { ...defaultClipEdit, sourceIn: 0.5, speed: 1.5 },
		};
		expect(sourceTimeForClip(clip, 2.5)).toBe(0.5);
		expect(sourceTimeForClip(clip, 3.5)).toBe(2);
		expect(sourceTimeForClip(clip, 8)).toBeCloseTo(3.05);
		expect(sourceTimeForClip(clip, 0)).toBe(0.5);
	});
});
