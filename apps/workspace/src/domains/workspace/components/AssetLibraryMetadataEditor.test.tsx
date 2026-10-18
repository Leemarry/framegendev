import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AssetLibraryMetadataEditor } from "./AssetLibraryMetadataEditor";

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe("AssetLibraryMetadataEditor", () => {
	it("debounces and autosaves normalized metadata changes", async () => {
		vi.useFakeTimers();
		const onSave = vi.fn().mockResolvedValue(undefined);
		render(
			<AssetLibraryMetadataEditor tags={["原标签"]} note="原备注" rating={4} onSave={onSave} />,
		);
		fireEvent.change(screen.getByLabelText("标签"), { target: { value: " 主角，夜景,主角 " } });
		fireEvent.change(screen.getByLabelText("备注"), { target: { value: "中文\n备注 " } });
		fireEvent.change(screen.getByLabelText("评分"), { target: { value: "5" } });
		expect(screen.getByRole("status")).toHaveTextContent("有未保存的修改");
		await act(async () => {
			vi.advanceTimersByTime(799);
		});
		expect(onSave).not.toHaveBeenCalled();
		await act(async () => {
			vi.advanceTimersByTime(1);
			await Promise.resolve();
		});
		expect(onSave).toHaveBeenCalledWith({ tags: ["主角", "夜景"], note: "中文\n备注 ", rating: 5 });
		expect(screen.getByRole("status")).toHaveTextContent("已保存");
	});

	it("shows saving and retries failed autosaves", async () => {
		vi.useFakeTimers();
		let resolveSave!: () => void;
		const onSave = vi
			.fn()
			.mockImplementationOnce(
				() =>
					new Promise<void>((resolve) => {
						resolveSave = resolve;
					}),
			)
			.mockRejectedValueOnce(new Error("保存失败"))
			.mockResolvedValueOnce(undefined);
		render(<AssetLibraryMetadataEditor tags={[]} note="" rating={0} onSave={onSave} />);
		fireEvent.change(screen.getByLabelText("备注"), { target: { value: "草稿" } });
		await act(async () => {
			vi.advanceTimersByTime(800);
		});
		expect(screen.getByRole("status")).toHaveTextContent("正在保存素材");
		await act(async () => {
			resolveSave();
			await Promise.resolve();
		});
		expect(screen.getByRole("status")).toHaveTextContent("已保存");
		fireEvent.change(screen.getByLabelText("备注"), { target: { value: "失败草稿" } });
		await act(async () => {
			vi.advanceTimersByTime(800);
			await Promise.resolve();
		});
		expect(screen.getByRole("alert")).toHaveTextContent("保存失败");
		fireEvent.click(screen.getByRole("button", { name: "重试保存" }));
		await act(async () => {
			vi.advanceTimersByTime(800);
			await Promise.resolve();
		});
		expect(screen.getByRole("status")).toHaveTextContent("已保存");
		expect(onSave).toHaveBeenCalledTimes(3);
	});

	it("removes a tag and validates limits without calling onSave", async () => {
		vi.useFakeTimers();
		const onSave = vi.fn();
		render(
			<AssetLibraryMetadataEditor tags={["主角", "夜景"]} note="" rating={0} onSave={onSave} />,
		);
		fireEvent.click(screen.getByRole("button", { name: "移除标签 主角" }));
		expect(screen.queryByText("主角", { selector: "span" })).not.toBeInTheDocument();
		fireEvent.change(screen.getByLabelText("备注"), { target: { value: "x".repeat(4001) } });
		await act(async () => {
			vi.advanceTimersByTime(800);
		});
		expect(screen.getByRole("alert")).toHaveTextContent("备注最多4000个字符");
		expect(onSave).not.toHaveBeenCalled();
	});
});
