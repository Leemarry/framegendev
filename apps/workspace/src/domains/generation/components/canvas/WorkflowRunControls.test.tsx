import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { WorkflowRunControls } from "./WorkflowRunControls";
import {
	emptyWorkflowGraphV4,
	getDefaultHandles,
	type WorkflowGraph,
} from "../../lib/workflow-schema-v4";

afterEach(cleanup);
const initial: WorkflowGraph = {
	...emptyWorkflowGraphV4(),
	nodes: ["first", "second"].map((id) => ({
		id,
		type: "imageGeneration",
		position: { x: 0, y: 0 },
		data: {
			label: id,
			handles: getDefaultHandles("imageGeneration"),
			config: { modelId: "configured", prompt: "test" },
		},
	})),
	edges: [
		{
			id: "link",
			source: "first",
			sourceHandle: "image",
			target: "second",
			targetHandle: "in",
			dataType: "IMAGE",
		},
	],
};

it("submits each step once and waits for manual output confirmation before downstream submission", async () => {
	const submitted = vi.fn();
	function Harness() {
		const [graph, setGraph] = useState(initial);
		return (
			<WorkflowRunControls
				graph={graph}
				focus={() => undefined}
				onActiveChange={() => undefined}
				generate={async (id) => {
					submitted(id);
					setGraph((value) => ({
						...value,
						nodes: value.nodes.map((node) =>
							node.id === id
								? {
										...node,
										data: {
											...node.data,
											status: "succeeded",
											outputs: { image: { dataType: "IMAGE", value: `/${id}.png` } },
										},
									}
								: node,
						),
					}));
				}}
			/>
		);
	}
	render(<Harness />);
	fireEvent.click(screen.getByRole("button", { name: "逐步运行" }));
	await screen.findByRole("button", { name: "使用所选并继续" });
	expect(submitted.mock.calls).toEqual([["first"]]);
	fireEvent.click(screen.getByRole("button", { name: "使用所选并继续" }));
	await screen.findByRole("button", { name: "使用所选并完成" });
	expect(submitted.mock.calls).toEqual([["first"], ["second"]]);
	fireEvent.click(screen.getByRole("button", { name: "使用所选并完成" }));
	await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("所有步骤已确认完成"));
});
