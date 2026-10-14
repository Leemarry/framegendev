import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AssetLibraryMetadataEditor } from "./AssetLibraryMetadataEditor";

afterEach(cleanup);

describe("AssetLibraryMetadataEditor", () => {
	it("saves normalized tags and clears all fields explicitly", async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		render(
			<AssetLibraryMetadataEditor tags={["原标签"]} note="原备注" rating={4} onSave={onSave} />,
		);
		fireEvent.click(screen.getByRole("button", { name: "编辑元数据" }));
		fireEvent.change(screen.getByLabelText("标签"), { target: { value: " 主角，夜景,主角 " } });
		fireEvent.change(screen.getByLabelText("备注"), { target: { value: "中文\n备注 " } });
		fireEvent.change(screen.getByLabelText("评分"), { target: { value: "5" } });
		fireEvent.click(screen.getByRole("button", { name: "保存元数据" }));
		await waitFor(() =>
			expect(onSave).toHaveBeenCalledWith({
				tags: ["主角", "夜景"],
				note: "中文\n备注 ",
				rating: 5,
			}),
		);
		await screen.findByRole("button", { name: "编辑元数据" });
		fireEvent.click(screen.getByRole("button", { name: "编辑元数据" }));
		fireEvent.change(screen.getByLabelText("标签"), { target: { value: "" } });
		fireEvent.change(screen.getByLabelText("备注"), { target: { value: "" } });
		fireEvent.change(screen.getByLabelText("评分"), { target: { value: "0" } });
		fireEvent.click(screen.getByRole("button", { name: "保存元数据" }));
		await waitFor(() => expect(onSave).toHaveBeenLastCalledWith({ tags: [], note: "", rating: 0 }));
	});
	it("cancels without writing and retains a failed draft for retry", async () => {
		const onSave = vi.fn().mockRejectedValue(new Error("保存失败"));
		render(<AssetLibraryMetadataEditor tags={[]} note="原备注" rating={0} onSave={onSave} />);
		fireEvent.click(screen.getByRole("button", { name: "编辑元数据" }));
		fireEvent.change(screen.getByLabelText("备注"), { target: { value: "取消草稿" } });
		fireEvent.click(screen.getByRole("button", { name: "取消编辑元数据" }));
		expect(onSave).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "编辑元数据" }));
		expect(screen.getByLabelText("备注")).toHaveValue("原备注");
		fireEvent.change(screen.getByLabelText("备注"), { target: { value: "失败草稿" } });
		fireEvent.click(screen.getByRole("button", { name: "保存元数据" }));
		expect(await screen.findByRole("alert")).toHaveTextContent("保存失败");
		expect(screen.getByLabelText("备注")).toHaveValue("失败草稿");
		onSave.mockResolvedValue(undefined);
		fireEvent.click(screen.getByRole("button", { name: "保存元数据" }));
		await screen.findByRole("button", { name: "编辑元数据" });
		expect(onSave).toHaveBeenCalledTimes(2);
	});
});
