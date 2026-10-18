import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import http from "@/shared/lib/http";
import { executeWorkflow, useWorkflowOutputs } from "./workflow";

vi.mock("@/shared/lib/http", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
afterEach(() => {
	cleanup();
	vi.resetAllMocks();
});

describe("workflow HTTP contracts", () => {
	it("uses the shared API base only once and returns the execution payload", async () => {
		const execution = { id: "execution-contract" };
		vi.mocked(http.post).mockResolvedValue({
			code: 0,
			success: true,
			message: "",
			data: { execution },
		});
		expect(await executeWorkflow("workflow-contract")).toEqual({ execution });
		expect(http.post).toHaveBeenCalledWith("/workflows/workflow-contract/execute", {});
	});
	it("reads node assets from the registered backend route", async () => {
		vi.mocked(http.get).mockResolvedValue({
			code: 0,
			success: true,
			message: "",
			data: { assets: [] },
		});
		const { result } = renderHook(() => useWorkflowOutputs("workflow-contract", "node-contract"));
		await waitFor(() => expect(result.current.data).toEqual({ assets: [] }));
		expect(http.get).toHaveBeenCalledWith(
			"/workflows/workflow-contract/nodes/node-contract/assets",
		);
	});
	it("propagates unavailable execution instead of reporting success", async () => {
		vi.mocked(http.post).mockRejectedValue({ code: 501, message: "工作流执行待接入" });
		await expect(executeWorkflow("workflow-contract")).rejects.toMatchObject({ code: 501 });
	});
});
