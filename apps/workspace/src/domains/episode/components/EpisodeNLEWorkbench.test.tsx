import { cleanup, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sampleEpisode } from "@/domains/episode/lib/sample";
import { EpisodeNLEWorkbench } from "./EpisodeNLEWorkbench";

afterEach(cleanup);

describe("EpisodeNLEWorkbench", () => {
	it("keeps edits on save failure, supports undo redo and canceling discard", async () => {
		const onSave = vi
			.fn()
			.mockRejectedValueOnce({ message: "disk unavailable" })
			.mockResolvedValue(undefined);
		const onClose = vi.fn();
		render(
			<EpisodeNLEWorkbench
				episode={sampleEpisode}
				assets={[]}
				selectedClipId="clip-cold-open"
				onSelectClip={vi.fn()}
				onClose={onClose}
				onSave={onSave}
			/>,
		);
		fireEvent.change(screen.getByLabelText("时长（秒）"), { target: { value: "1.7" } });
		fireEvent.click(screen.getByRole("button", { name: "应用参数" }));
		fireEvent.click(screen.getByRole("button", { name: "撤销" }));
		expect((screen.getByLabelText("时长（秒）") as HTMLInputElement).value).toBe("8");
		fireEvent.click(screen.getByRole("button", { name: "重做" }));
		expect((screen.getByLabelText("时长（秒）") as HTMLInputElement).value).toBe("1.7");
		fireEvent.click(screen.getByRole("button", { name: "关闭剪辑工作台" }));
		fireEvent.click(screen.getByRole("button", { name: "继续编辑" }));
		expect(onClose).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "保存草稿" }));
		await waitFor(() =>
			expect(screen.getByRole("alert").textContent).toContain("disk unavailable"),
		);
		expect((screen.getByLabelText("时长（秒）") as HTMLInputElement).value).toBe("1.7");
		fireEvent.click(screen.getByRole("button", { name: "保存草稿" }));
		await waitFor(() => expect(screen.getByRole("status").textContent).toBe("已保存"));
		expect(onSave.mock.calls[1][0].editVersion).toBe(1);
		expect(sampleEpisode.tracks[0].clips[0].end).toBe(8);
	});
	it("shares selection from bins and timeline and searches actual clips", () => {
		const onSelectClip = vi.fn();
		render(
			<EpisodeNLEWorkbench
				episode={sampleEpisode}
				assets={[]}
				selectedClipId="clip-cold-open"
				onSelectClip={onSelectClip}
				onClose={vi.fn()}
			/>,
		);
		const bin = screen.getByLabelText("剪辑素材区");
		fireEvent.click(within(bin).getByRole("button", { name: /问题铺垫/ }));
		expect(onSelectClip).toHaveBeenLastCalledWith("clip-problem");
		fireEvent.click(screen.getByRole("button", { name: "字幕：剧本优先" }));
		expect(onSelectClip).toHaveBeenLastCalledWith("clip-caption-one");
		fireEvent.change(screen.getByLabelText("搜索剪辑素材"), {
			target: { value: "does-not-exist" },
		});
		expect(within(bin).queryByRole("button", { name: /冷开场/ })).toBeNull();
		expect(screen.getByText("没有匹配的片段")).toBeTruthy();
	});
	it("shows truthful empty/error states and closes without a persistence action", () => {
		const onClose = vi.fn();
		const props = {
			episode: sampleEpisode,
			selectedClipId: "clip-cold-open",
			onSelectClip: vi.fn(),
			onClose,
		};
		const { rerender } = render(<EpisodeNLEWorkbench {...props} assets={[]} />);
		fireEvent.click(within(screen.getByLabelText("素材分类")).getByRole("tab", { name: "音频" }));
		expect(screen.getByText("暂无音频")).toBeTruthy();
		rerender(<EpisodeNLEWorkbench {...props} assetsError />);
		expect(screen.getByRole("alert").textContent).toContain("素材读取失败");
		fireEvent.click(screen.getByRole("button", { name: "关闭剪辑工作台" }));
		expect(onClose).toHaveBeenCalledOnce();
		expect(props.onSelectClip).not.toHaveBeenCalled();
	});
});
