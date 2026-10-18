import { cleanup, render, screen, fireEvent, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DocumentSectionGeneratorProps } from "@/domains/documents/components/DocumentSectionGenerator";
import type { MarkdownSectionContext } from "@/domains/documents/components/MarkdownHybridEditor";
import type { MediaGenerationWorkspaceProps } from "@/domains/generation/components/MediaGenerationWorkspace";
import { VideoGenerationDialog } from "@/shared/components/generation-dialogs/VideoGenerationDialog";

const mocks = vi.hoisted(() => ({
	DocumentSectionGenerator: vi.fn(() => null),
	MediaGenerationWorkspace: vi.fn(() => null),
	WorkflowGenerationSurface: vi.fn(() => <div>工作流测试画布</div>),
	WorkflowManager: vi.fn(() => <div>服务端工作流画布</div>),
}));

vi.mock("@/domains/documents/components/DocumentSectionGenerator", () => ({
	DocumentSectionGenerator: mocks.DocumentSectionGenerator,
}));

vi.mock("@/domains/generation/components/MediaGenerationWorkspace", () => ({
	MediaGenerationWorkspace: mocks.MediaGenerationWorkspace,
}));

const section: MarkdownSectionContext = {
	blockId: "section-video",
	documentId: "doc-1",
	headingLevel: 2,
	headingOccurrence: 1,
	headingText: "第 01 组",
	markdown: "## 第 01 组\n\n动作。",
	plainText: "第 01 组\n\n动作。",
	prompt: "动作。",
};

vi.mock("@/domains/generation/components/WorkflowGenerationSurface", () => ({
	WorkflowGenerationSurface: mocks.WorkflowGenerationSurface,
}));

vi.mock("@/domains/generation/components/canvas/WorkflowManager", () => ({
	WorkflowManager: mocks.WorkflowManager,
}));

describe("VideoGenerationDialog", () => {
	it("keeps the target rail across modes and resets an open library when the shot changes", () => {
		const select = vi.fn();
		const targets = [
			{ id: "a", title: "分镜甲" },
			{ id: "b", title: "分镜乙" },
		];
		const props = {
			open: true,
			onOpenChange: vi.fn(),
			targets,
			onSelectTarget: select,
			activeTargetId: "a",
			section,
			workspaceProps: { historyScopeId: "a", initialPrompt: "甲提示词" },
		};
		const { rerender } = render(<VideoGenerationDialog {...props} />);
		expect(screen.getByRole("button", { name: "视频工作台" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "切换到素材：分镜甲" })).toHaveAttribute(
			"aria-current",
			"true",
		);
		fireEvent.click(screen.getByRole("button", { name: "切换到素材：分镜乙" }));
		expect(select).toHaveBeenCalledWith("b");
		const workspace = () =>
			(
				mocks.MediaGenerationWorkspace.mock.calls as unknown as Array<
					[MediaGenerationWorkspaceProps]
				>
			).at(-1)![0];
		act(() => workspace().onMaterialLibraryImportOpenChange?.(true));
		expect(workspace().materialLibraryImportOpen).toBe(true);
		rerender(
			<VideoGenerationDialog
				{...props}
				activeTargetId="b"
				section={{ ...section, blockId: "second" }}
				workspaceProps={{ historyScopeId: "b", initialPrompt: "乙提示词" }}
			/>,
		);
		expect(workspace()).toMatchObject({
			historyScopeId: "b",
			initialPrompt: "乙提示词",
			materialLibraryImportOpen: false,
		});
		fireEvent.click(screen.getByRole("switch", { name: "工作流" }));
		expect(screen.getByRole("button", { name: "切换到素材：分镜乙" })).toHaveAttribute(
			"aria-current",
			"true",
		);
		expect(screen.getByText("工作流测试画布")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("switch", { name: "工作流" }));
		expect(screen.getByRole("region", { name: "生成素材" })).toBeInTheDocument();
	});

	it("opens workflow from timeline request context without a separate section prop", () => {
		render(
			<VideoGenerationDialog
				open
				onOpenChange={vi.fn()}
				workspaceProps={{
					historyScopeId: "timeline",
					initialPrompt: "镜头推进",
					projectId: "project-timeline",
					notificationTarget: {
						kind: "document-section",
						projectId: "project-timeline",
						documentId: section.documentId,
						section,
					},
				}}
			/>,
		);
		fireEvent.click(screen.getByRole("switch", { name: "工作流" }));
		expect(screen.getByText("服务端工作流画布")).toBeInTheDocument();
		expect(mocks.WorkflowManager).toHaveBeenLastCalledWith(
			expect.objectContaining({
				projectId: "project-timeline",
				documentId: "doc-1",
				shotName: "section-video",
				section,
			}),
			undefined,
		);
	});
	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it("renders the shared video workspace for timeline generation", () => {
		render(
			<VideoGenerationDialog
				open
				title="生成视频素材"
				workspaceProps={{
					historyScopeId: "timeline-video",
					initialPrompt: "镜头推进",
				}}
				onOpenChange={vi.fn()}
			/>,
		);

		const workspaceCalls = mocks.MediaGenerationWorkspace.mock.calls as unknown as Array<
			[MediaGenerationWorkspaceProps]
		>;
		const workspaceProps = workspaceCalls.at(-1)?.[0];

		expect(workspaceProps).toMatchObject({
			historyScopeId: "timeline-video",
			initialPrompt: "镜头推进",
			kind: "video",
			showMaterialLibraryImportCard: true,
			viewMode: "history",
		});
		expect(mocks.DocumentSectionGenerator).not.toHaveBeenCalled();
	});

	it("renders document sections through the same video dialog component", () => {
		render(
			<VideoGenerationDialog
				open
				projectId="project-a"
				selectedAssetKeys={["video:/scene.mp4"]}
				section={section}
				onOpenChange={vi.fn()}
				onOpenReferenceGeneration={vi.fn()}
				onToggleAsset={vi.fn()}
			/>,
		);

		const generatorCalls = mocks.DocumentSectionGenerator.mock.calls as unknown as Array<
			[DocumentSectionGeneratorProps]
		>;
		const generatorProps = generatorCalls.at(-1)?.[0];

		expect(generatorProps).toMatchObject({
			kind: "video",
			projectId: "project-a",
			section,
			selectedAssetKeys: ["video:/scene.mp4"],
			viewMode: "history",
		});
		fireEvent.click(screen.getByRole("switch", { name: "工作流" }));
		expect(mocks.WorkflowManager).toHaveBeenLastCalledWith(
			expect.objectContaining({
				projectId: "project-a",
				documentId: section.documentId,
				shotName: section.blockId,
			}),
			undefined,
		);

		expect(generatorProps?.onToggleAsset).toBeTruthy();
		expect(mocks.MediaGenerationWorkspace).not.toHaveBeenCalled();
	});
});
