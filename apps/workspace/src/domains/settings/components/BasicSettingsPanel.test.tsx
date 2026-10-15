import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getProjects } from "@/domains/projects/api/projects";
import { openNativePath } from "@/shared/desktop/actions";
import { isDesktopRuntime } from "@/shared/desktop/runtime";
import { useThemeStore } from "@/shared/stores/theme";
import { BasicSettingsPanel } from "./BasicSettingsPanel";

vi.mock("@/domains/projects/api/projects", () => ({
	projectsKey: "/projects",
	getProjects: vi.fn(),
}));
vi.mock("@/shared/desktop/actions", () => ({ openNativePath: vi.fn() }));
vi.mock("@/shared/desktop/runtime", () => ({ isDesktopRuntime: vi.fn() }));

const workspace = { workspaceDir: "E:/isolated/workspace", databasePath: "", projects: [] };
const mount = () =>
	render(
		<SWRConfig value={{ provider: () => new Map(), shouldRetryOnError: false }}>
			<BasicSettingsPanel />
		</SWRConfig>,
	);

describe("BasicSettingsPanel", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.mocked(getProjects).mockResolvedValue(workspace);
		vi.mocked(isDesktopRuntime).mockReturnValue(true);
		vi.mocked(openNativePath).mockResolvedValue(undefined);
		useThemeStore.setState({ mode: "system" });
	});
	afterEach(cleanup);

	it("restores the selected theme after the panel is reopened", () => {
		const first = mount();
		fireEvent.click(screen.getByRole("radio", { name: "深色" }));
		expect(useThemeStore.getState().mode).toBe("dark");
		first.unmount();
		mount();
		expect(screen.getByRole("radio", { name: "深色" })).toBeChecked();
		expect(screen.getByRole("radio", { name: "跟随系统" })).not.toBeChecked();
	});

	it("opens the configured folder and recovers after a native failure", async () => {
		vi.mocked(openNativePath).mockRejectedValueOnce(new Error("目录暂时不可用"));
		mount();
		await screen.findByText(workspace.workspaceDir);
		fireEvent.click(screen.getByRole("button", { name: "打开" }));
		expect(await screen.findByRole("alert")).toHaveTextContent("目录暂时不可用");
		fireEvent.click(screen.getByRole("button", { name: "打开" }));
		await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
		expect(openNativePath).toHaveBeenCalledTimes(2);
		expect(openNativePath).toHaveBeenLastCalledWith(workspace.workspaceDir);
	});

	it("retries a failed workspace read without inventing a path", async () => {
		vi.mocked(getProjects).mockRejectedValueOnce(new Error("连接失败"));
		mount();
		expect(await screen.findByRole("alert")).toHaveTextContent("连接失败");
		expect(screen.getByRole("button", { name: "打开" })).toBeDisabled();
		fireEvent.click(screen.getByRole("button", { name: "重试" }));
		await screen.findByText(workspace.workspaceDir);
		await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
		expect(screen.getByRole("button", { name: "打开" })).toBeEnabled();
	});

	it("keeps unavailable native and pending preferences disabled in browsers", async () => {
		vi.mocked(isDesktopRuntime).mockReturnValue(false);
		mount();
		await screen.findByText(workspace.workspaceDir);
		expect(screen.getByRole("button", { name: "打开" })).toBeDisabled();
		expect(screen.getByRole("combobox", { name: "语言" })).toBeDisabled();
		for (const control of screen.getAllByRole("switch")) {
			expect(control).toBeDisabled();
			expect(control).not.toBeChecked();
		}
		expect(openNativePath).not.toHaveBeenCalled();
	});
});
