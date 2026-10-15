import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Projects } from "./Projects";
import httpClient from "@/shared/lib/http";
import type { WorkspaceProject } from "@/domains/projects/api/projects";
import { useProjectStore } from "@/domains/projects/stores";
import { ConfirmDialog } from "@/shared/components/callable/ConfirmDialog";
import { ProjectRenameDialog } from "@/domains/projects/components/ProjectRenameDialog";
import { AgentProjectCreateDialog } from "@/domains/workspace/components/AgentProjectCreateDialog";
import type { ApiResponse } from "@/types/api";
import { openDesktopProjectWindow } from "@/shared/desktop/actions";
import { isDesktopRuntime } from "@/shared/desktop/runtime";

const windowMocks = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock("@/shared/desktop/actions", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/shared/desktop/actions")>()),
	openDesktopProjectWindow: vi.fn(),
}));
vi.mock("@/shared/desktop/runtime", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/shared/desktop/runtime")>()),
	isDesktopRuntime: vi.fn(),
}));

vi.mock("@/shared/lib/http", () => ({
	default: {
		delete: vi.fn(),
		get: vi.fn(),
		patch: vi.fn(),
		post: vi.fn(),
	},
}));

vi.mock("@/hooks/useToast", () => ({
	useToast: () => ({
		error: windowMocks.error,
		info: vi.fn(),
		success: vi.fn(),
	}),
}));

const trashedProject: WorkspaceProject = {
	createdAt: "2026-06-17T16:00:00Z",
	description: "",
	documentCount: 0,
	id: "project-333",
	name: "333",
	originalProjectDir: "/Users/example/project-333",
	projectDir: "/Users/example/project-333",
	relativeDir: "project-333",
	status: "trashed",
	trashedAt: "2026-06-17T16:05:00Z",
	updatedAt: "2026-06-17T16:05:00Z",
};

const activeProject: WorkspaceProject = {
	createdAt: "2026-06-18T16:00:00Z",
	description: "",
	documentCount: 2,
	id: "project-111",
	name: "短剧项目",
	projectDir: "/Users/example/project-111",
	relativeDir: "project-111",
	status: "active",
	updatedAt: "2026-06-18T16:05:00Z",
};

describe("Projects", () => {
	let isProjectDeleted = false;
	let activeProjectStatus: WorkspaceProject["status"] = "active";
	let activeProjectName = activeProject.name;

	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
		vi.mocked(isDesktopRuntime).mockReturnValue(false);
		vi.mocked(openDesktopProjectWindow).mockReset().mockResolvedValue(undefined);
		useProjectStore.getState().setActiveProjectId(null);
		isProjectDeleted = false;
		activeProjectStatus = "active";
		activeProjectName = activeProject.name;
		vi.mocked(httpClient.get).mockImplementation(async (_url, config) => {
			const status = config?.params?.status ?? "active";
			const projects = projectsForStatus(
				status,
				activeProjectStatus,
				isProjectDeleted,
				activeProjectName,
			);
			return apiResponse({ databasePath: "", projects, workspaceDir: "" });
		});
		vi.mocked(httpClient.post).mockImplementation(async (url) => {
			if (url === "/projects/project-111/archive") {
				activeProjectStatus = "archived";
				return apiResponse(projectWithStatus("archived", activeProjectName));
			}
			if (url === "/projects/project-111/restore") {
				activeProjectStatus = "active";
				return apiResponse(projectWithStatus("active", activeProjectName));
			}
			return apiResponse({});
		});
		vi.mocked(httpClient.patch).mockImplementation(async (url, payload) => {
			if (url === "/projects/project-111") {
				activeProjectName = (payload as { name: string }).name;
				return apiResponse(projectWithStatus(activeProjectStatus, activeProjectName));
			}
			return apiResponse({});
		});
		vi.mocked(httpClient.delete).mockImplementation(async (url) => {
			if (url === "/projects/project-111") {
				activeProjectStatus = "trashed";
				return apiResponse(projectWithStatus("trashed", activeProjectName));
			}
			if (url === "/projects/project-333/permanent") {
				isProjectDeleted = true;
				return apiResponse(trashedProject);
			}
			return apiResponse({});
		});
	});

	afterEach(() => {
		cleanup();
		localStorage.clear();
		useProjectStore.getState().setActiveProjectId(null);
	});

	it("opens an active project when clicking the row body", async () => {
		render(
			<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
				<MemoryRouter>
					<Projects />
					<LocationProbe />
				</MemoryRouter>
			</SWRConfig>,
		);

		const row = await screen.findByRole("button", { name: "短剧项目" });
		fireEvent.click(row);

		await waitFor(() => {
			expect(screen.getByTestId("location").textContent).toBe("/projects?projectId=project-111");
		});
		expect(useProjectStore.getState().activeProjectId).toBe("project-111");
	});

	it("archives an active project from the row context menu", async () => {
		render(
			<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
				<MemoryRouter>
					<Projects />
					<ConfirmDialog />
				</MemoryRouter>
			</SWRConfig>,
		);

		expect(await screen.findByText("短剧项目")).toBeInTheDocument();

		fireEvent.contextMenu(screen.getByText("短剧项目"), { clientX: 48, clientY: 48 });
		fireEvent.click(await screen.findByRole("menuitem", { name: "归档" }));

		await waitFor(() =>
			expect(httpClient.post).toHaveBeenCalledWith("/projects/project-111/archive"),
		);
		await waitFor(() => expect(screen.queryByText("短剧项目")).not.toBeInTheDocument());
		expect(screen.getByRole("button", { name: "创建新项目" })).toBeInTheDocument();
	});

	it("renames an active project from the row context menu", async () => {
		render(
			<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
				<MemoryRouter>
					<Projects />
					<ProjectRenameDialog />
				</MemoryRouter>
			</SWRConfig>,
		);

		expect(await screen.findByText("短剧项目")).toBeInTheDocument();

		fireEvent.contextMenu(screen.getByText("短剧项目"), { clientX: 48, clientY: 48 });
		fireEvent.click(await screen.findByRole("menuitem", { name: "重命名" }));

		const dialog = await screen.findByRole("alertdialog", { name: "重命名项目" });
		fireEvent.change(within(dialog).getByRole("textbox", { name: "项目名称" }), {
			target: { value: "短剧项目改名" },
		});
		fireEvent.click(within(dialog).getByRole("button", { name: "重命名" }));

		await waitFor(() =>
			expect(httpClient.patch).toHaveBeenCalledWith("/projects/project-111", {
				name: "短剧项目改名",
			}),
		);
		expect(await screen.findByText("短剧项目改名")).toBeInTheDocument();
	});

	it("moves an active project to trash from the row context menu", async () => {
		render(
			<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
				<MemoryRouter>
					<Projects />
					<ConfirmDialog />
				</MemoryRouter>
			</SWRConfig>,
		);

		expect(await screen.findByText("短剧项目")).toBeInTheDocument();

		fireEvent.contextMenu(screen.getByText("短剧项目"), { clientX: 48, clientY: 48 });
		fireEvent.click(await screen.findByRole("menuitem", { name: "移到垃圾箱" }));

		const dialog = await screen.findByRole("alertdialog", { name: "移到垃圾箱？" });
		fireEvent.click(within(dialog).getByRole("button", { name: "移到垃圾箱" }));

		await waitFor(() => expect(httpClient.delete).toHaveBeenCalledWith("/projects/project-111"));
		await waitFor(() => expect(screen.queryByText("短剧项目")).not.toBeInTheDocument());
		expect(screen.getByRole("button", { name: "创建新项目" })).toBeInTheDocument();
	});

	it("cancels creation without sending a project request", async () => {
		renderManagement();
		fireEvent.click(await screen.findByRole("button", { name: "创建新项目" }));
		const dialog = await screen.findByRole("alertdialog", { name: "创建新项目" });
		fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "取消测试" } });
		fireEvent.click(within(dialog).getByRole("button", { name: "取消" }));
		await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
		expect(httpClient.post).not.toHaveBeenCalled();
	});

	it("creates a Chinese project and opens the actual returned project", async () => {
		vi.mocked(httpClient.post).mockResolvedValueOnce(
			apiResponse({ ...activeProject, id: "created-id", name: "中文新项目" }),
		);
		renderManagement();
		fireEvent.click(await screen.findByRole("button", { name: "创建新项目" }));
		const dialog = await screen.findByRole("alertdialog", { name: "创建新项目" });
		fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: " 中文新项目 " } });
		fireEvent.click(within(dialog).getByRole("button", { name: "创建" }));
		await waitFor(() =>
			expect(httpClient.post).toHaveBeenCalledWith("/projects", { name: "中文新项目" }),
		);
		await waitFor(() =>
			expect(screen.getByTestId("location")).toHaveTextContent("/projects?projectId=created-id"),
		);
	});

	it("keeps creation available after a rejected request without opening a project", async () => {
		vi.mocked(httpClient.post).mockRejectedValueOnce(new Error("Local service unavailable"));
		renderManagement();
		fireEvent.click(await screen.findByRole("button", { name: "创建新项目" }));
		const dialog = await screen.findByRole("alertdialog", { name: "创建新项目" });
		fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "失败测试" } });
		fireEvent.click(within(dialog).getByRole("button", { name: "创建" }));
		await waitFor(() =>
			expect(httpClient.post).toHaveBeenCalledWith("/projects", { name: "失败测试" }),
		);
		await waitFor(() => expect(screen.getByRole("button", { name: "创建新项目" })).toBeEnabled());
		expect(useProjectStore.getState().activeProjectId).toBeNull();
		expect(screen.getByTestId("location").textContent).toBe("/");
	});

	it("opens the kebab without navigating and archives through its menu", async () => {
		renderManagement();
		const trigger = await screen.findByRole("button", { name: "项目操作：短剧项目" });
		fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: "mouse" });
		expect(await screen.findByRole("menuitem", { name: "归档" })).toBeInTheDocument();
		expect(screen.getByTestId("location")).toHaveTextContent("/");
		expect(useProjectStore.getState().activeProjectId).toBeNull();
		fireEvent.click(screen.getByRole("menuitem", { name: "归档" }));
		await waitFor(() =>
			expect(httpClient.post).toHaveBeenCalledWith("/projects/project-111/archive"),
		);
	});

	it("disables project new windows in browsers", async () => {
		renderManagement();
		fireEvent.pointerDown(await screen.findByRole("button", { name: "项目操作：短剧项目" }), {
			button: 0,
			ctrlKey: false,
			pointerType: "mouse",
		});
		expect(
			await screen.findByRole("menuitem", { name: "在新窗口中打开（仅桌面端）" }),
		).toHaveAttribute("data-disabled");
		expect(openDesktopProjectWindow).not.toHaveBeenCalled();
	});
	it("opens a native project window without changing source selection or route and retries errors", async () => {
		vi.mocked(isDesktopRuntime).mockReturnValue(true);
		vi.mocked(openDesktopProjectWindow).mockRejectedValueOnce(new Error("窗口暂不可用"));
		renderManagement();
		const trigger = await screen.findByRole("button", { name: "项目操作：短剧项目" });
		fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: "mouse" });
		fireEvent.click(await screen.findByRole("menuitem", { name: "在新窗口中打开" }));
		await waitFor(() =>
			expect(windowMocks.error).toHaveBeenCalledWith("打开项目新窗口失败", {
				description: "窗口暂不可用",
			}),
		);
		await waitFor(() => expect(trigger).toBeEnabled());
		fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: "mouse" });
		fireEvent.click(await screen.findByRole("menuitem", { name: "在新窗口中打开" }));
		await waitFor(() => expect(openDesktopProjectWindow).toHaveBeenCalledTimes(2));
		expect(openDesktopProjectWindow).toHaveBeenLastCalledWith("project-111");
		expect(screen.getByTestId("location")).toHaveTextContent("/");
		expect(useProjectStore.getState().activeProjectId).toBeNull();
	});
	it("rechecks active project existence before opening a window", async () => {
		vi.mocked(isDesktopRuntime).mockReturnValue(true);
		renderManagement();
		const trigger = await screen.findByRole("button", { name: "项目操作：短剧项目" });
		activeProjectStatus = "archived";
		fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: "mouse" });
		fireEvent.click(await screen.findByRole("menuitem", { name: "在新窗口中打开" }));
		await waitFor(() =>
			expect(windowMocks.error).toHaveBeenCalledWith("打开项目新窗口失败", {
				description: expect.stringContaining("项目已归档"),
			}),
		);
		expect(openDesktopProjectWindow).not.toHaveBeenCalled();
	});

	it("refreshes the trash list after permanently deleting a project", async () => {
		render(
			<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
				<MemoryRouter>
					<Projects />
					<ConfirmDialog />
				</MemoryRouter>
			</SWRConfig>,
		);

		fireEvent.click(screen.getByRole("button", { name: "垃圾箱" }));

		expect(await screen.findByText("333")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "永久删除" }));
		const dialog = await screen.findByRole("alertdialog");
		fireEvent.click(within(dialog).getByRole("button", { name: "永久删除" }));

		await waitFor(() =>
			expect(httpClient.delete).toHaveBeenCalledWith("/projects/project-333/permanent"),
		);
		await waitFor(() => expect(screen.queryByText("333")).not.toBeInTheDocument());
		expect(screen.getByText("垃圾箱为空")).toBeInTheDocument();
	});
});

const projectsForStatus = (
	status: string,
	activeProjectStatus: WorkspaceProject["status"],
	isProjectDeleted: boolean,
	activeProjectName: string,
) => {
	const projects: WorkspaceProject[] = [];
	if (activeProjectStatus === status) {
		projects.push(projectWithStatus(activeProjectStatus, activeProjectName));
	}
	if (status === "trashed" && !isProjectDeleted) projects.push(trashedProject);
	return projects;
};

const projectWithStatus = (
	status: WorkspaceProject["status"],
	name = activeProject.name,
): WorkspaceProject => ({
	...activeProject,
	name,
	status,
	archivedAt: status === "archived" ? "2026-06-18T16:10:00Z" : undefined,
	originalProjectDir: status === "trashed" ? activeProject.projectDir : undefined,
	projectDir:
		status === "trashed"
			? "/Users/example/.mediago-drama/trash/projects/project-111"
			: activeProject.projectDir,
	trashProjectDir:
		status === "trashed" ? "/Users/example/.mediago-drama/trash/projects/project-111" : undefined,
	trashedAt: status === "trashed" ? "2026-06-18T16:10:00Z" : undefined,
	updatedAt: status === "active" ? activeProject.updatedAt : "2026-06-18T16:10:00Z",
});

const apiResponse = <T,>(data: T): ApiResponse<T> => ({
	code: 0,
	data,
	message: "ok",
	success: true,
});

const LocationProbe = () => {
	const location = useLocation();
	return <span data-testid="location">{`${location.pathname}${location.search}`}</span>;
};

const renderManagement = () =>
	render(
		<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
			<MemoryRouter>
				<Projects />
				<AgentProjectCreateDialog />
				<ConfirmDialog />
				<LocationProbe />
			</MemoryRouter>
		</SWRConfig>,
	);
