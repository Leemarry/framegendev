import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MediaAsset } from "@/domains/workspace/api/media";
import { AssetLibraryBulkPanel } from "./AssetLibraryBulkPanel";

afterEach(cleanup);

const asset = (overrides: Partial<MediaAsset> = {}): MediaAsset => ({
	id: "asset-1",
	kind: "image",
	filename: "素材.png",
	mimeType: "image/png",
	sizeBytes: 100,
	url: "/api/v1/media-assets/asset-1/content",
	tags: ["夜景"],
	createdAt: "2026-01-01T00:00:00Z",
	updatedAt: "2026-01-01T00:00:00Z",
	...overrides,
});

const handlers = () => ({
	onApplyTags: vi.fn(),
	onRestore: vi.fn(),
	onToggleFavorite: vi.fn(),
	onTrash: vi.fn(),
});

describe("AssetLibraryBulkPanel", () => {
	it("summarizes the selection and applies a tag diff to every asset", () => {
		const spies = handlers();
		render(
			<AssetLibraryBulkPanel
				assets={[asset({ id: "a" }), asset({ id: "b", sizeBytes: 100 })]}
				busy={false}
				trashMode={false}
				{...spies}
			/>,
		);

		expect(screen.getByText("已选择 2 项")).toBeInTheDocument();
		expect(screen.getByText("200 B")).toBeInTheDocument();
		expect(
			screen.getByText("以下操作应用于全部选中素材。其他不同的属性保持各自的值。"),
		).toBeInTheDocument();
		expect(screen.getByLabelText("共同标签")).toHaveValue("夜景");

		const apply = screen.getByRole("button", { name: "应用到全部" });
		expect(apply).toBeDisabled();

		fireEvent.change(screen.getByLabelText("共同标签"), { target: { value: "夜景, 人物" } });
		fireEvent.click(screen.getByRole("button", { name: "应用到全部" }));

		expect(spies.onApplyTags).toHaveBeenCalledWith(["人物"], []);
	});

	it("reports removed tags as well when the draft drops a shared tag", () => {
		const spies = handlers();
		render(<AssetLibraryBulkPanel assets={[asset()]} busy={false} trashMode={false} {...spies} />);

		fireEvent.change(screen.getByLabelText("共同标签"), { target: { value: "人物" } });
		fireEvent.click(screen.getByRole("button", { name: "应用到全部" }));

		expect(spies.onApplyTags).toHaveBeenCalledWith(["人物"], ["夜景"]);
	});

	it("switches the destructive action to restore inside the trash", () => {
		const spies = handlers();
		render(<AssetLibraryBulkPanel assets={[asset()]} busy={false} trashMode {...spies} />);

		expect(screen.queryByRole("button", { name: "移入回收站" })).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "恢复" }));
		expect(spies.onRestore).toHaveBeenCalledTimes(1);

		fireEvent.click(screen.getByRole("button", { name: "切换收藏" }));
		expect(spies.onToggleFavorite).toHaveBeenCalledTimes(1);
	});

	it("disables every action while a bulk request is running", () => {
		const spies = handlers();
		render(<AssetLibraryBulkPanel assets={[asset()]} busy trashMode={false} {...spies} />);

		expect(screen.getByLabelText("共同标签")).toBeDisabled();
		for (const name of ["应用到全部", "切换收藏", "移入回收站"]) {
			expect(screen.getByRole("button", { name })).toBeDisabled();
		}
	});

	it("only offers the comparison action when exactly two images are selected", () => {
		const onCompare = vi.fn();
		const { unmount } = render(
			<AssetLibraryBulkPanel
				assets={[asset({ id: "a" }), asset({ id: "b" })]}
				busy={false}
				trashMode={false}
				onCompare={onCompare}
				{...handlers()}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "比较两张图片" }));
		expect(onCompare).toHaveBeenCalledTimes(1);
		unmount();

		render(
			<AssetLibraryBulkPanel assets={[asset()]} busy={false} trashMode={false} {...handlers()} />,
		);
		expect(screen.queryByRole("button", { name: "比较两张图片" })).not.toBeInTheDocument();
	});
});
