import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import http from "@/shared/lib/http";
import { WorkflowManager } from "./WorkflowManager";
import type {
	WorkflowDocument,
	CreateWorkflowRequest,
	UpdateWorkflowRequest,
} from "../../api/workflow";
import { emptyWorkflowGraphV4 } from "../../lib/workflow-schema-v4";

vi.mock("@/shared/lib/http", () => ({
	default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock("./WorkflowCanvasEditor", () => ({
	WorkflowCanvasEditor: ({ workflow }: { workflow: WorkflowDocument }) => (
		<div>画布：{workflow.name}</div>
	),
}));
vi.mock("@/hooks/useToast", () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));
const section = {
	documentId: "doc-a",
	blockId: "shot",
	headingText: "同名分镜",
	headingLevel: 2,
	headingOccurrence: 0,
	markdown: "",
	plainText: "",
	prompt: "",
};
let records: WorkflowDocument[];
function doc(id: string, name: string, documentId = "doc-a"): WorkflowDocument {
	return {
		id,
		name,
		projectId: "project",
		documentId,
		shotName: "shot",
		description: "",
		graphData: emptyWorkflowGraphV4(),
		schemaVersion: 4,
		createdAt: "",
		updatedAt: "",
	};
}
const manager = (documentId = "doc-a") => (
	<WorkflowManager
		projectId="project"
		documentId={documentId}
		shotName="shot"
		section={{ ...section, documentId }}
	/>
);
function mount() {
	return render(
		<SWRConfig
			value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}
		>
			{manager()}
		</SWRConfig>,
	);
}
beforeEach(() => {
	records = [];
	vi.mocked(http.get).mockImplementation(async (url, config) => {
		if (url === "/workflow-templates") return { data: { templates: [] } } as never;
		if (url === "/workflows")
			return {
				data: {
					workflows: records.filter((item) => item.documentId === config?.params.documentId),
				},
			} as never;
		const item = records.find((item) => url === `/workflows/${item.id}`);
		if (!item) throw { message: "详情不可用" };
		return { data: item } as never;
	});
	vi.mocked(http.post).mockImplementation(async (_url, body) => {
		const req = body as CreateWorkflowRequest;
		const item = {
			...doc(`wf-${records.length + 1}`, req.name, req.documentId),
			description: req.description ?? "",
		};
		records.push(item);
		return { data: item } as never;
	});
	vi.mocked(http.put).mockImplementation(async (url, body) => {
		records = records.map((item) =>
			url === `/workflows/${item.id}` ? { ...item, ...(body as UpdateWorkflowRequest) } : item,
		);
		return {} as never;
	});
	vi.mocked(http.delete).mockImplementation(async (url) => {
		records = records.filter((item) => url !== `/workflows/${item.id}`);
		return {} as never;
	});
});
afterEach(() => {
	cleanup();
	vi.resetAllMocks();
});

async function create(name: string) {
	fireEvent.click(screen.getByRole("button", { name: "新建工作流" }));
	fireEvent.change(screen.getByLabelText("工作流名称"), { target: { value: name } });
	fireEvent.change(screen.getByLabelText("描述（可选）"), { target: { value: "独立方案" } });
	fireEvent.click(screen.getByRole("button", { name: "创建" }));
	await screen.findByText(`画布：${name}`);
}
function openMenu(name: string) {
	fireEvent.pointerDown(screen.getByRole("button", { name: `工作流操作：${name}` }), {
		button: 0,
		ctrlKey: false,
	});
}

describe("shot workflow management", () => {
	it("creates independent workflows, switches, renames, deletes and reopens saved data", async () => {
		const view = mount();
		await screen.findByText("当前分镜还没有工作流");
		await create("方案A");
		await create("方案B");
		expect(http.post).toHaveBeenLastCalledWith(
			"/workflows",
			expect.objectContaining({
				projectId: "project",
				documentId: "doc-a",
				shotName: "shot",
				name: "方案B",
				description: "独立方案",
			}),
		);
		fireEvent.click(screen.getByRole("button", { name: "方案A" }));
		await screen.findByText("画布：方案A");
		openMenu("方案A");
		fireEvent.click(await screen.findByRole("menuitem", { name: "重命名" }));
		fireEvent.change(screen.getByLabelText("工作流名称"), { target: { value: "精细方案" } });
		fireEvent.click(screen.getByRole("button", { name: "确认" }));
		await screen.findByText("画布：精细方案");
		openMenu("精细方案");
		fireEvent.click(await screen.findByRole("menuitem", { name: "删除工作流" }));
		fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "确认" }));
		await screen.findByText("画布：方案B");
		view.unmount();
		mount();
		await screen.findByText("画布：方案B");
		expect(records.map((item) => item.name)).toEqual(["方案B"]);
	});
	it("retains create input on failure and permits retry without duplicate submission", async () => {
		vi.mocked(http.post).mockRejectedValueOnce({ message: "离线" });
		mount();
		await screen.findByText("当前分镜还没有工作流");
		fireEvent.click(screen.getByRole("button", { name: "新建工作流" }));
		fireEvent.change(screen.getByLabelText("工作流名称"), { target: { value: "保留草稿" } });
		fireEvent.click(screen.getByRole("button", { name: "创建" }));
		await waitFor(() => expect(screen.getByRole("button", { name: "创建" })).toBeEnabled());
		expect(screen.getByLabelText("工作流名称")).toHaveValue("保留草稿");
		fireEvent.click(screen.getByRole("button", { name: "创建" }));
		await screen.findByText("画布：保留草稿");
		expect(records).toHaveLength(1);
	});
	it("resets selection when switching documents with the same shot name", async () => {
		records = [doc("a", "文档甲"), doc("b", "文档乙", "doc-b")];
		const wrapper = ({ children }: { children: React.ReactNode }) => (
			<SWRConfig value={{ provider: () => new Map(), shouldRetryOnError: false }}>
				{children}
			</SWRConfig>
		);
		const view = render(manager(), { wrapper });
		await screen.findByText("画布：文档甲");
		view.rerender(manager("doc-b"));
		await screen.findByText("画布：文档乙");
		expect(screen.queryByText("画布：文档甲")).not.toBeInTheDocument();
	});
	it("shows detail errors with retry while retaining workflow tabs", async () => {
		records = [doc("a", "失败方案")];
		vi.mocked(http.get).mockImplementation(async (url) => {
			if (url === "/workflows") return { data: { workflows: records } } as never;
			if (url === "/workflow-templates") return { data: { templates: [] } } as never;
			throw { message: "详情不可用" };
		});
		mount();
		await screen.findByText("加载工作流详情失败：详情不可用");
		expect(screen.getByRole("button", { name: "失败方案" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "重试" })).toBeEnabled();
	});
});
