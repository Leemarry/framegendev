import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { projectSettingsGeneralTab } from "@/lib/stores/settings";
import { SettingsSidebarPanel } from "./ProjectNavigatorPanels";

describe("SettingsSidebarPanel", () => {
	afterEach(() => {
		cleanup();
	});

	it("selects the shortcuts settings tab", () => {
		const onSelectTab = vi.fn();

		render(
			<SettingsSidebarPanel
				activeTab="appearance"
				isProjectSettings={false}
				onBack={vi.fn()}
				onSelectTab={onSelectTab}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "快捷键" }));

		expect(onSelectTab).toHaveBeenCalledWith("shortcuts");
	});

	it("routes API key and Codex access through the merged model access page", () => {
		const onSelectTab = vi.fn();

		render(
			<SettingsSidebarPanel
				activeAgentBackendId="codex"
				activeTab="appearance"
				isProjectSettings={false}
				onBack={vi.fn()}
				onSelectTab={onSelectTab}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "模型接入" }));
		expect(onSelectTab).toHaveBeenCalledWith("model-access");
		expect(screen.queryByRole("button", { name: "API 密钥" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Codex 接入" })).toBeNull();
	});

	it("shows Codex skills for every agent backend and selects its own tab", () => {
		const onSelectTab = vi.fn();

		const { rerender } = render(
			<SettingsSidebarPanel
				activeAgentBackendId="codex"
				activeTab="appearance"
				isProjectSettings={false}
				onBack={vi.fn()}
				onSelectTab={onSelectTab}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Codex 技能" }));
		expect(onSelectTab).toHaveBeenLastCalledWith("codex-skills");

		rerender(
			<SettingsSidebarPanel
				activeAgentBackendId="opencode"
				activeTab="appearance"
				isProjectSettings={false}
				onBack={vi.fn()}
				onSelectTab={onSelectTab}
			/>,
		);
		expect(screen.getByRole("button", { name: "Codex 技能" })).toBeInTheDocument();
	});

	it("lists Codex skills before agent instructions at the end of generation config", () => {
		render(
			<SettingsSidebarPanel
				activeAgentBackendId="codex"
				activeTab="appearance"
				isProjectSettings={false}
				onBack={vi.fn()}
				onSelectTab={vi.fn()}
			/>,
		);
		const group = screen.getByText("生成配置").closest("section");
		expect(
			within(group as HTMLElement)
				.getAllByRole("button")
				.map((button) => button.textContent)
				.slice(-2),
		).toEqual(["Codex 技能", "智能体指令"]);
	});

	it("shows the app updates settings entry", () => {
		const onSelectTab = vi.fn();

		render(
			<SettingsSidebarPanel
				activeTab="appearance"
				isProjectSettings={false}
				onBack={vi.fn()}
				onSelectTab={onSelectTab}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "应用更新" }));
		expect(onSelectTab).toHaveBeenCalledWith("updates");
	});

	it("shows app updates at the bottom of the workspace settings group", () => {
		render(
			<SettingsSidebarPanel
				activeTab="appearance"
				isProjectSettings={false}
				onBack={vi.fn()}
				onSelectTab={vi.fn()}
			/>,
		);

		const workspaceGroup = screen.getByText("工作区").closest("section");
		expect(workspaceGroup).not.toBeNull();
		expect(
			within(workspaceGroup as HTMLElement)
				.getAllByRole("button")
				.map((button) => button.textContent),
		).toEqual(["账户", "用量分析", "基础设置", "浏览器设置", "存储管理", "快捷键", "应用更新"]);
	});

	it("navigates every generation service and preserves its selected state", () => {
		const onSelectTab = vi.fn();
		render(
			<SettingsSidebarPanel
				activeTab="comfyui-cloud"
				isProjectSettings={false}
				onBack={vi.fn()}
				onSelectTab={onSelectTab}
			/>,
		);
		for (const [label, tab] of [
			["本地 ComfyUI", "comfyui-local"],
			["云端 ComfyUI", "comfyui-cloud"],
			["MG 动画", "mg-animation"],
			["安装设置", "installation"],
			["Agent 扩展", "extensions"],
			["飞书 Agent", "feishu-agent"],
			["Drami 动效", "drami-motion"],
		]) {
			fireEvent.click(screen.getByRole("button", { name: label }));
			expect(onSelectTab).toHaveBeenLastCalledWith(tab);
		}
		expect(screen.getByRole("button", { name: "云端 ComfyUI" })).toHaveAttribute(
			"aria-current",
			"page",
		);
	});

	it("hides the Codex access settings entry for non-Codex agents", () => {
		render(
			<SettingsSidebarPanel
				activeAgentBackendId="opencode"
				activeTab="appearance"
				isProjectSettings={false}
				onBack={vi.fn()}
				onSelectTab={vi.fn()}
			/>,
		);

		expect(screen.queryByRole("button", { name: "Codex 接入" })).toBeNull();
	});

	it("hides the Jianying draft settings entry while it is disabled", () => {
		render(
			<SettingsSidebarPanel
				activeTab="appearance"
				isProjectSettings={false}
				onBack={vi.fn()}
				onSelectTab={vi.fn()}
			/>,
		);

		expect(screen.queryByRole("button", { name: "剪映草稿" })).toBeNull();
	});

	it("keeps project settings separate and selects the four project sections", () => {
		const onSelectTab = vi.fn();

		render(
			<SettingsSidebarPanel
				activeTab={projectSettingsGeneralTab}
				isProjectSettings
				onBack={vi.fn()}
				onSelectTab={onSelectTab}
			/>,
		);

		expect(screen.getByText("项目设置")).toBeTruthy();
		expect(screen.getByRole("button", { name: "项目管理" })).toHaveAttribute(
			"aria-current",
			"page",
		);
		expect(screen.queryByRole("button", { name: "基础设置" })).toBeNull();
		expect(screen.queryByRole("button", { name: "API 密钥" })).toBeNull();
		for (const [label, tab] of [
			["技能包", "project-skills"],
			["飞书群", "project-feishu"],
			["项目文件", "project-files"],
			["项目管理", projectSettingsGeneralTab],
		]) {
			fireEvent.click(screen.getByRole("button", { name: label }));
			expect(onSelectTab).toHaveBeenLastCalledWith(tab);
		}
	});
});
