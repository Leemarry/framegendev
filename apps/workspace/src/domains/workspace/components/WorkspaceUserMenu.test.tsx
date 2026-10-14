import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { openExternalUrl } from "@/shared/desktop/actions";
import { useThemeStore } from "@/shared/stores/theme";
import { WorkspaceUserMenu } from "./WorkspaceUserMenu";

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));
vi.mock("@/shared/desktop/actions", () => ({ openExternalUrl: vi.fn() }));
vi.mock("@/hooks/useToast", () => ({ useToast: () => ({ error: toastError }) }));
vi.mock("@/shared/components/ui/sonner", () => ({ Toaster: () => null }));

const openMenu = () => {
	fireEvent.pointerDown(screen.getByRole("button", { name: "本地用户菜单" }), {
		button: 0,
		ctrlKey: false,
		pointerType: "mouse",
	});
};

describe("WorkspaceUserMenu", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		useThemeStore.getState().setMode("light");
	});
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
		localStorage.clear();
	});
	const mount = () => {
		const onOpenSettings = vi.fn();
		const onOpenSkills = vi.fn();
		const result = render(
			<ThemeProvider>
				<WorkspaceUserMenu onOpenSettings={onOpenSettings} onOpenSkills={onOpenSkills} />
			</ThemeProvider>,
		);
		openMenu();
		return { ...result, onOpenSettings, onOpenSkills };
	};

	it("shows truthful local identity and disables unavailable services", () => {
		const { onOpenSettings, onOpenSkills } = mount();
		expect(screen.getByText("本地工作区")).toBeInTheDocument();
		for (const name of ["积分 待接入", "系统公告 待接入"]) {
			const item = screen.getByRole("menuitem", { name });
			expect(item).toHaveAttribute("aria-disabled", "true");
			fireEvent.click(item);
		}
		expect(onOpenSettings).not.toHaveBeenCalled();
		expect(onOpenSkills).not.toHaveBeenCalled();
		expect(openExternalUrl).not.toHaveBeenCalled();
		expect(screen.queryByText("免费用户")).toBeNull();
	});

	it("changes the actual theme, keeps the menu open and restores persisted mode", async () => {
		const view = mount();
		fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "深色模式" }));
		expect(useThemeStore.getState().mode).toBe("dark");
		expect(document.documentElement).toHaveAttribute("data-theme", "dark");
		expect(screen.getByRole("menuitemcheckbox")).toHaveAttribute("aria-checked", "true");
		const saved = localStorage.getItem("app.theme.v1");
		expect(JSON.parse(saved ?? "{}").state.mode).toBe("dark");
		view.unmount();
		act(() => useThemeStore.setState({ mode: "light" }));
		localStorage.setItem("app.theme.v1", saved ?? "");
		await act(() => useThemeStore.persist.rehydrate());
		mount();
		expect(screen.getByRole("menuitemcheckbox")).toHaveAttribute("aria-checked", "true");
		expect(document.documentElement).toHaveAttribute("data-theme", "dark");
		fireEvent.click(screen.getByRole("menuitemcheckbox"));
		expect(useThemeStore.getState().mode).toBe("light");
	});

	it("tracks system theme changes while the menu is open and cleans subscriptions", () => {
		let matches = false;
		const listeners = new Set<(event: { matches: boolean }) => void>();
		vi.stubGlobal("matchMedia", () => ({
			get matches() {
				return matches;
			},
			addEventListener: (_event: string, listener: (event: { matches: boolean }) => void) =>
				listeners.add(listener),
			removeEventListener: (_event: string, listener: (event: { matches: boolean }) => void) =>
				listeners.delete(listener),
		}));
		useThemeStore.getState().setMode("system");
		const view = mount();
		expect(screen.getByRole("menuitemcheckbox")).toHaveAttribute("aria-checked", "false");
		act(() => {
			matches = true;
			listeners.forEach((listener) => listener({ matches }));
		});
		expect(screen.getByRole("menuitemcheckbox")).toHaveAttribute("aria-checked", "true");
		expect(document.documentElement).toHaveAttribute("data-theme", "dark");
		view.unmount();
		expect(listeners.size).toBe(0);
	});

	it.each(["技能包管理", "软件设置"])("opens the existing %s destination and closes", (name) => {
		const { onOpenSettings, onOpenSkills } = mount();
		fireEvent.click(screen.getByRole("menuitem", { name }));
		expect(name === "软件设置" ? onOpenSettings : onOpenSkills).toHaveBeenCalledOnce();
		expect(screen.queryByRole("menu")).toBeNull();
	});

	it("reports only Chinese as supported in the language submenu", async () => {
		mount();
		const language = screen.getByRole("menuitem", { name: "语言 简体中文" });
		fireEvent.keyDown(language, { key: "ArrowRight" });
		await screen.findByRole("menuitemradio", { name: "简体中文" });
		expect(screen.getByRole("menuitemradio")).toHaveAttribute("aria-checked", "true");
		expect(screen.getByRole("menuitem", { name: "跟随系统 待接入" })).toHaveAttribute(
			"aria-disabled",
			"true",
		);
		expect(screen.getByRole("menuitem", { name: "English 待接入" })).toHaveAttribute(
			"aria-disabled",
			"true",
		);
	});

	it.each([
		["帮助", "https://github.com/mediago-dev/mediago-drama"],
		["反馈", "https://github.com/mediago-dev/mediago-drama/issues"],
	])("opens %s through the existing desktop helper", (name, url) => {
		mount();
		fireEvent.click(screen.getByRole("menuitem", { name }));
		expect(openExternalUrl).toHaveBeenCalledWith(url);
	});

	it("keeps compact language choices inside the menu and can return", () => {
		vi.stubGlobal("matchMedia", (query: string) => ({
			matches: query === "(max-width: 700px)",
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		}));
		mount();
		fireEvent.click(screen.getByRole("menuitem", { name: "语言 简体中文" }));
		expect(screen.getAllByRole("menu")).toHaveLength(1);
		expect(screen.getByRole("menuitemradio")).toHaveAttribute("aria-checked", "true");
		expect(screen.getByRole("menuitem", { name: "返回用户菜单" })).toHaveFocus();
		fireEvent.click(screen.getByRole("menuitem", { name: "返回用户菜单" }));
		expect(screen.getByRole("menuitem", { name: "软件设置" })).toBeInTheDocument();
	});

	it("shows an error when the link helper rejects", async () => {
		vi.mocked(openExternalUrl).mockRejectedValueOnce(new Error("blocked"));
		mount();
		fireEvent.click(screen.getByRole("menuitem", { name: "帮助" }));
		await waitFor(() =>
			expect(toastError).toHaveBeenCalledWith("无法打开链接", expect.any(Object)),
		);
	});
});
