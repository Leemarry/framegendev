import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkflowCanvasEditor } from "./WorkflowCanvasEditor";
import type { WorkflowDocument } from "../../api/workflow";
import { emptyWorkflowGraphV4 } from "../../lib/workflow-schema-v4";

vi.mock("@xyflow/react", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@xyflow/react")>();
	return {
		...actual,
		ReactFlowProvider: ({ children }: { children: React.ReactNode }) => children,
		ReactFlow: (props: React.ComponentProps<typeof actual.ReactFlow>) => (
			<div>
				<button
					onClick={() =>
						props.onNodesChange?.([
							{ id: "source", type: "position", position: { x: 100, y: 200 } },
						])
					}
				>
					移动节点
				</button>
				<button
					onClick={() => props.onNodesChange?.([{ id: "source", type: "select", selected: true }])}
				>
					选中节点
				</button>
				<button
					onClick={() =>
						props.onConnect?.({
							source: "source",
							sourceHandle: "out",
							target: "target",
							targetHandle: "in",
						})
					}
				>
					连接
				</button>
				<button onClick={() => props.onNodesChange?.([{ id: "source", type: "remove" }])}>
					删除节点
				</button>
			</div>
		),
	};
});
const workflow: WorkflowDocument = {
	id: "workflow-a",
	projectId: "project",
	documentId: "doc",
	shotName: "shot",
	name: "方案A",
	description: "",
	schemaVersion: 4,
	createdAt: "",
	updatedAt: "",
	graphData: {
		...emptyWorkflowGraphV4(),
		viewport: { x: 9, y: 10, zoom: 0.8 },
		nodes: [
			{
				id: "source",
				type: "textNode",
				position: { x: 0, y: 0 },
				data: {
					label: "文本",
					handles: [{ id: "out", type: "source", dataType: "TEXT" }],
					config: { prompt: "保留提示词" },
					outputs: { out: { dataType: "TEXT", value: "结果" } },
				},
			},
			{
				id: "target",
				type: "videoGeneration",
				position: { x: 300, y: 0 },
				data: { label: "视频", handles: [{ id: "in", type: "target", dataType: "TEXT" }] },
			},
		],
	},
};
afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.clearAllMocks();
});

describe("workflow graph persistence", () => {
	it("restores a removed node and its connection with undo, then reapplies with redo", async () => {
		vi.useFakeTimers();
		const save = vi.fn().mockResolvedValue(undefined);
		render(<WorkflowCanvasEditor workflow={workflow} onUpdate={save} />);
		fireEvent.click(screen.getByText("连接"));
		fireEvent.click(screen.getByText("删除节点"));
		fireEvent.click(screen.getByRole("button", { name: "撤销" }));
		await act(() => vi.advanceTimersByTimeAsync(500));
		expect(save.mock.lastCall?.[0].nodes).toHaveLength(2);
		expect(save.mock.lastCall?.[0].edges).toHaveLength(1);
		fireEvent.click(screen.getByRole("button", { name: "重做" }));
		await act(() => vi.advanceTimersByTimeAsync(500));
		expect(save.mock.lastCall?.[0].nodes).toHaveLength(1);
		expect(save.mock.lastCall?.[0].edges).toHaveLength(0);
	});
	it("debounces real edits, preserves all v4 fields, and flushes on close", async () => {
		vi.useFakeTimers();
		const save = vi.fn().mockResolvedValue(undefined);
		const view = render(<WorkflowCanvasEditor workflow={workflow} onUpdate={save} />);
		fireEvent.click(screen.getByText("选中节点"));
		await act(() => vi.advanceTimersByTimeAsync(500));
		expect(save).not.toHaveBeenCalled();
		fireEvent.click(screen.getByText("移动节点"));
		await act(() => vi.advanceTimersByTimeAsync(499));
		expect(save).not.toHaveBeenCalled();
		await act(() => vi.advanceTimersByTimeAsync(1));
		expect(save).toHaveBeenCalledWith({
			...workflow.graphData,
			nodes: [
				{ ...workflow.graphData.nodes[0], position: { x: 100, y: 200 } },
				workflow.graphData.nodes[1],
			],
		});
		expect(screen.getByText("已保存")).toBeInTheDocument();
		fireEvent.click(screen.getByText("连接"));
		view.unmount();
		await act(async () => {});
		expect(save).toHaveBeenCalledTimes(2);
		expect(save.mock.calls[1][0].edges).toEqual([
			expect.objectContaining({
				source: "source",
				sourceHandle: "out",
				target: "target",
				targetHandle: "in",
			}),
		]);
	});
	it("keeps a failed graph for retry and removes dangling edges with deleted nodes", async () => {
		vi.useFakeTimers();
		const save = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
		render(<WorkflowCanvasEditor workflow={workflow} onUpdate={save} />);
		fireEvent.click(screen.getByText("连接"));
		await act(() => vi.advanceTimersByTimeAsync(500));
		expect(screen.getByText("保存失败")).toBeInTheDocument();
		await act(async () => fireEvent.click(screen.getByText("重试保存")));
		expect(screen.getByText("已保存")).toBeInTheDocument();
		fireEvent.click(screen.getByText("删除节点"));
		await act(() => vi.advanceTimersByTimeAsync(500));
		expect(save.mock.lastCall?.[0]).toMatchObject({ edges: [], nodes: [{ id: "target" }] });
	});
	it("serializes slow saves so the latest edit wins", async () => {
		vi.useFakeTimers();
		let finish: () => void = () => {};
		const save = vi
			.fn()
			.mockImplementationOnce(
				() =>
					new Promise<void>((resolve) => {
						finish = resolve;
					}),
			)
			.mockResolvedValue(undefined);
		render(<WorkflowCanvasEditor workflow={workflow} onUpdate={save} />);
		fireEvent.click(screen.getByText("移动节点"));
		await act(() => vi.advanceTimersByTimeAsync(500));
		fireEvent.click(screen.getByText("连接"));
		await act(() => vi.advanceTimersByTimeAsync(500));
		expect(save).toHaveBeenCalledTimes(1);
		await act(async () => finish());
		expect(save).toHaveBeenCalledTimes(2);
		expect(save.mock.lastCall?.[0].edges).toHaveLength(1);
		expect(screen.getByText("已保存")).toBeInTheDocument();
	});
});
