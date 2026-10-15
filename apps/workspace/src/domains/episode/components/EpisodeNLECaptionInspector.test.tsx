import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { EpisodeNLECaptionInspector } from "./EpisodeNLECaptionInspector";

it("edits Unicode text and frame-aligned bounds, retains invalid draft for correction", () => {
	const apply = vi.fn();
	render(
		<EpisodeNLECaptionInspector
			clip={{ id: "c", title: "c", content: "原文", start: 0, end: 2, status: "ready" }}
			onApply={apply}
		/>,
	);
	fireEvent.change(screen.getByLabelText("字幕文字"), { target: { value: "你好，世界" } });
	fireEvent.change(screen.getByLabelText("开始（秒）"), { target: { value: "2.5" } });
	fireEvent.click(screen.getByText("应用字幕"));
	expect(apply).not.toHaveBeenCalled();
	expect(screen.getByRole("alert")).toBeTruthy();
	fireEvent.change(screen.getByLabelText("结束（秒）"), { target: { value: "4.2" } });
	fireEvent.click(screen.getByText("应用字幕"));
	expect(apply).toHaveBeenCalledWith(
		expect.objectContaining({ content: "你好，世界", start: 2.5, end: 4.2 }),
	);
});
