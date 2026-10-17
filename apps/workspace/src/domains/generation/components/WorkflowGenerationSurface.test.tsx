import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkflowGenerationSurface } from "./WorkflowGenerationSurface";
import {
	activeWorkflowDocument,
	createWorkflowDocument,
	parseWorkflowWorkspace,
} from "../lib/workflow-draft";

vi.mock("@xyflow/react", () => ({
	ReactFlowProvider: ({ children }: { children: React.ReactNode }) => children,
	ReactFlow: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	Background: () => null,
	Handle: () => null,
	Position: { Left: "left", Right: "right" },
	useReactFlow: () => ({
		fitView: vi.fn(),
		zoomIn: vi.fn(),
		zoomOut: vi.fn(),
		screenToFlowPosition: (value: unknown) => value,
	}),
}));
const section = {
	documentId: "doc",
	blockId: "shot",
	headingText: "第一分镜",
	headingLevel: 2,
	headingOccurrence: 0,
	markdown: "",
	plainText: "",
	prompt: "",
};
const key = "mediago.workflow.draft.v1:project:doc:shot";
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	localStorage.clear();
});

describe("local workflow editing", () => {
	it("saves typing immediately, survives close, and isolates resource scopes", () => {
		const first = render(<WorkflowGenerationSurface projectId="project" section={section} />);
		fireEvent.change(screen.getByLabelText("节点提示词"), { target: { value: "镜头缓慢推进" } });
		const saved = localStorage.getItem(key)!;
		expect(activeWorkflowDocument(parseWorkflowWorkspace(saved)).graph.nodes[0].config.prompt).toBe(
			"镜头缓慢推进",
		);
		first.unmount();
		const reopened = render(<WorkflowGenerationSurface projectId="project" section={section} />);
		expect(screen.getByLabelText("节点提示词")).toHaveValue("镜头缓慢推进");
		reopened.rerender(
			<WorkflowGenerationSurface projectId="project" section={{ ...section, blockId: "other" }} />,
		);
		expect(screen.getByLabelText("节点提示词")).toHaveValue("");
		expect(localStorage.getItem(key)).toBe(saved);
	});
	it("retains unsaved typing on storage failure and retries the complete draft", () => {
		render(<WorkflowGenerationSurface projectId="project" section={section} />);
		const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new Error("quota");
		});
		fireEvent.change(screen.getByLabelText("节点提示词"), { target: { value: "不能丢失的内容" } });
		expect(screen.getByRole("alert")).toHaveTextContent("本地保存失败");
		expect(screen.getByLabelText("节点提示词")).toHaveValue("不能丢失的内容");
		write.mockRestore();
		fireEvent.click(screen.getByRole("button", { name: "重试保存" }));
		expect(
			activeWorkflowDocument(parseWorkflowWorkspace(localStorage.getItem(key)!)).graph.nodes[0]
				.config.prompt,
		).toBe("不能丢失的内容");
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});
	it("preserves malformed drafts instead of silently overwriting them", () => {
		localStorage.setItem(key, '{"version":1,"documents":[]}');
		render(<WorkflowGenerationSurface projectId="project" section={section} />);
		expect(screen.getByRole("alert")).toHaveTextContent("原始数据已保留");
		expect(localStorage.getItem(key)).toBe('{"version":1,"documents":[]}');
	});
	it("creates an empty workflow without losing the edited previous graph", () => {
		render(<WorkflowGenerationSurface projectId="project" section={section} />);
		fireEvent.change(screen.getByLabelText("节点提示词"), { target: { value: "旧工作流内容" } });
		const current = parseWorkflowWorkspace(localStorage.getItem(key)!);
		const next = createWorkflowDocument(current, "手动创建工作流");
		expect(activeWorkflowDocument(next).name).toBe("手动创建工作流 2");
		expect(activeWorkflowDocument(next).graph.nodes).toEqual([]);
		expect(next.documents[0].graph.nodes[0].config.prompt).toBe("旧工作流内容");
		expect(parseWorkflowWorkspace(JSON.stringify(next))).toEqual(next);
	});
});
