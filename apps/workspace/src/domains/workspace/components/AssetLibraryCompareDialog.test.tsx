import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MediaAsset } from "@/domains/workspace/api/media";
import { AssetLibraryCompareDialog } from "./AssetLibraryCompareDialog";

afterEach(cleanup);

const asset = (id: string, filename: string): MediaAsset => ({
	id,
	kind: "image",
	filename,
	mimeType: "image/png",
	sizeBytes: 2048,
	url: `/api/v1/media-assets/${id}/content`,
	createdAt: "2026-01-01T00:00:00Z",
	updatedAt: "2026-01-01T00:00:00Z",
});

describe("AssetLibraryCompareDialog", () => {
	it("shows both images side by side with their file names", () => {
		render(
			<AssetLibraryCompareDialog
				assets={[asset("a", "正面.png"), asset("b", "侧面.png")]}
				onClose={vi.fn()}
			/>,
		);

		expect(screen.getByRole("heading", { name: "比较两张图片" })).toBeInTheDocument();
		expect(screen.getByRole("img", { name: "正面.png" })).toBeInTheDocument();
		expect(screen.getByRole("img", { name: "侧面.png" })).toBeInTheDocument();
		expect(screen.getByText("正面.png")).toBeInTheDocument();
		expect(screen.getByText("侧面.png")).toBeInTheDocument();
	});

	it("switches between the fitted and the natural image size", () => {
		render(
			<AssetLibraryCompareDialog
				assets={[asset("a", "正面.png"), asset("b", "侧面.png")]}
				onClose={vi.fn()}
			/>,
		);

		const zoom = screen.getByRole("button", { name: "原始尺寸" });
		fireEvent.click(zoom);

		expect(screen.getByRole("button", { name: "适应窗口" })).toBeInTheDocument();
	});

	it("closes through the close button", () => {
		const onClose = vi.fn();
		render(
			<AssetLibraryCompareDialog
				assets={[asset("a", "正面.png"), asset("b", "侧面.png")]}
				onClose={onClose}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "关闭" }));

		expect(onClose).toHaveBeenCalledTimes(1);
	});
});
