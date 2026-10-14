import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectSettings } from "./ProjectSettings";

const state = vi.hoisted(() => ({ packsError: false, hasProject: true }));
vi.mock("swr", () => ({
	default: (key: string | null) =>
		key === "/packs"
			? {
					data: state.packsError
						? undefined
						: [
								{
									id: "pack",
									name: "真实本地包",
									source: "imported",
									enabled: true,
									skillCount: 9,
									promptCount: 3,
								},
							],
					error: state.packsError ? new Error("offline") : undefined,
					mutate: vi.fn(),
				}
			: {
					data: {
						projects: state.hasProject
							? [{ id: "p", name: "测试项目", projectDir: "/isolated/projects/p" }]
							: [],
					},
				},
	useSWRConfig: () => ({ mutate: vi.fn() }),
}));

const show = (tab = "project-skills") =>
	render(
		<MemoryRouter initialEntries={[`/settings?projectId=p&tab=${tab}`]}>
			<ProjectSettings />
		</MemoryRouter>,
	);

describe("ProjectSettings navigation surfaces", () => {
	beforeEach(() => {
		state.packsError = false;
		state.hasProject = true;
	});
	afterEach(() => cleanup());
	it("reads shared pack state and does not offer a fake project switch", () => {
		show();
		expect(screen.getByRole("heading", { name: "项目设置 · 测试项目" })).toBeTruthy();
		expect(screen.getByText("真实本地包")).toBeTruthy();
		expect(screen.getByText("全局已启用")).toBeTruthy();
		expect(screen.queryByRole("switch")).toBeNull();
		expect(screen.getByText(/项目单独启停待接入/)).toBeTruthy();
	});
	it("shows pack load failure with a retry instead of an empty success", () => {
		state.packsError = true;
		show();
		expect(screen.getByText("技能包加载失败")).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "重试" }));
		expect(screen.queryByText("暂无技能包")).toBeNull();
	});
	it("shows the actual isolated path and disables native opening in a browser", () => {
		show("project-files");
		expect(screen.getByText("/isolated/projects/p")).toBeTruthy();
		expect(screen.getByRole("button", { name: "打开项目文件夹" })).toBeDisabled();
	});
	it("keeps Feishu pending without a connect action", () => {
		show("project-feishu");
		expect(screen.getByText("待接入")).toBeTruthy();
		expect(screen.queryByRole("button")).toBeNull();
	});
	it("does not attach global packs to an unknown project", () => {
		state.hasProject = false;
		show();
		expect(screen.getByText("项目不存在或已被删除。")).toBeTruthy();
		expect(screen.queryByText("真实本地包")).toBeNull();
	});
});
