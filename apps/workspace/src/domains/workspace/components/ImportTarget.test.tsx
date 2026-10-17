import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getWorkspaceDocumentResources } from "../api/workspace";
import { ImportTarget, type ImportTargetProps } from "./ImportTarget";

vi.mock("../api/workspace", () => ({
	getWorkspaceDocumentResources: vi.fn(),
	workspaceDocumentResourcesKey: (projectId?: string | null) =>
		`/projects/${projectId ?? ""}/workspace/resources`,
}));

const renderTarget = (props: Partial<ImportTargetProps> = {}) => {
	const onChange = vi.fn();
	const onValidity = vi.fn();
	const view = render(
		<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
			<ImportTarget projectId="project-a" onChange={onChange} onValidity={onValidity} {...props} />
		</SWRConfig>,
	);
	return { ...view, onChange, onValidity };
};

describe("ImportTarget", () => {
	beforeEach(() => {
		vi.mocked(getWorkspaceDocumentResources).mockResolvedValue({
			projectId: "project-a",
			resources: [
				{
					blockId: "block-1",
					canGenerate: true,
					documentId: "document-a",
					documentTitle: "剧本",
					generatedImageCount: 0,
					headingLevel: 2,
					headingOccurrence: 1,
					id: "resource-1",
					markdown: "## 开场",
					sectionId: "section-1",
					sourceCategory: "reference",
					title: "开场",
					type: "storyboard",
				},
				{
					blockId: "block-2",
					canGenerate: true,
					documentId: "",
					documentTitle: "剧本",
					generatedImageCount: 0,
					headingLevel: 2,
					headingOccurrence: 2,
					id: "resource-2",
					markdown: "## 无章节",
					sectionId: "",
					sourceCategory: "reference",
					title: "无章节",
					type: "storyboard",
				},
			],
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
		cleanup();
	});

	it("lists the bindable document sections and reports the chosen one", async () => {
		const { onChange } = renderTarget();

		expect(screen.getByText("关联文档 / 分镜（可选）")).toBeInTheDocument();
		expect(
			screen.getByText("图片和视频会加入该章节的创作素材列表，保留已有的选用结果。"),
		).toBeInTheDocument();

		await waitFor(() =>
			expect(screen.getByRole("option", { name: "剧本 · 开场" })).toBeInTheDocument(),
		);
		// Resources without a section cannot be bound, so only one option is offered.
		expect(screen.queryByRole("option", { name: "剧本 · 无章节" })).not.toBeInTheDocument();

		const select = screen.getByLabelText("关联文档 / 分镜（可选）");
		fireEvent.change(select, { target: { value: JSON.stringify(["document-a", "section-1"]) } });
		expect(onChange).toHaveBeenCalledWith({ documentId: "document-a", sectionId: "section-1" });

		fireEvent.change(select, { target: { value: "" } });
		expect(onChange).toHaveBeenLastCalledWith(undefined);
	});

	it("marks a stale binding invalid and keeps the previous choice visible", async () => {
		const { onValidity } = renderTarget({
			value: { documentId: "document-a", sectionId: "section-gone" },
		});

		await waitFor(() => expect(onValidity).toHaveBeenLastCalledWith(false));
		expect(
			screen.getByRole("option", { name: "上次关联已不可用，请重新选择" }),
		).toBeInTheDocument();

		cleanup();
		const valid = renderTarget({ value: { documentId: "document-a", sectionId: "section-1" } });
		await waitFor(() => expect(valid.onValidity).toHaveBeenLastCalledWith(true));
	});

	it("renders nothing without a project and surfaces a load failure", async () => {
		const empty = renderTarget({ projectId: undefined });
		expect(empty.container).toBeEmptyDOMElement();
		expect(empty.onValidity).toHaveBeenLastCalledWith(true);
		cleanup();

		vi.mocked(getWorkspaceDocumentResources).mockRejectedValueOnce(new Error("boom"));
		renderTarget();
		expect(
			await screen.findByText("读取关联目标失败，可以选择“仅保存到素材库”后继续。"),
		).toBeInTheDocument();
	});
});
