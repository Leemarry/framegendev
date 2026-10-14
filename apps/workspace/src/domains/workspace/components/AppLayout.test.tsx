import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createPortal } from "react-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useUIPreferencesStore } from "@/shared/stores/ui-preferences";
import { AppLayout } from "./AppLayout";

describe("AppLayout", () => {
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});
	it("opens narrow navigation, keeps portal Escape local, and closes after navigation", () => {
		vi.stubGlobal("matchMedia", () => ({
			matches: true,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		}));
		const sidebar = (
			<>
				<button type="button">文档入口</button>
				{createPortal(<button type="button">菜单选项</button>, document.body)}
			</>
		);
		const { container, rerender } = render(
			<AppLayout projectWorkspace navigationKey="document-a" headerTitle="项目" sidebar={sidebar}>
				<div>正文</div>
			</AppLayout>,
		);
		expect(container.querySelector("aside")).toHaveAttribute("inert");
		fireEvent.click(screen.getByRole("button", { name: "打开项目导航" }));
		expect(screen.getByRole("dialog", { name: "项目导航" })).toHaveAttribute("aria-modal", "true");
		fireEvent.keyDown(screen.getByRole("button", { name: "菜单选项" }), { key: "Escape" });
		expect(container.querySelector("aside")).not.toHaveAttribute("inert");
		rerender(
			<AppLayout projectWorkspace navigationKey="document-b" headerTitle="项目" sidebar={sidebar}>
				<div>正文B</div>
			</AppLayout>,
		);
		expect(container.querySelector("aside")).toHaveAttribute("inert");
		fireEvent.click(screen.getByRole("button", { name: "打开项目导航" }));
		fireEvent.keyDown(screen.getByRole("button", { name: "文档入口" }), { key: "Escape" });
		expect(container.querySelector("aside")).toHaveAttribute("inert");
		expect(screen.getByRole("button", { name: "打开项目导航" })).toHaveFocus();
	});
	it("uses the reference project width without overwriting saved sidebar preferences", () => {
		const savedWidth = useUIPreferencesStore.getState().workspaceSidebarWidth;
		const { container, unmount } = render(
			<AppLayout projectWorkspace headerTitle="测试项目" sidebar={<nav>导航</nav>}>
				<div>正文</div>
			</AppLayout>,
		);
		expect(container.querySelector("aside")?.style.width).toBe("325px");
		expect(container.querySelector('[role="separator"]')).toBeNull();
		expect(useUIPreferencesStore.getState().workspaceSidebarWidth).toBe(savedWidth);
		unmount();
		const normal = render(
			<AppLayout headerTitle="设置" sidebar={<nav>导航</nav>}>
				<div>设置正文</div>
			</AppLayout>,
		);
		expect(normal.container.querySelector("aside")?.style.width).toBe(`${savedWidth}px`);
	});
	it("renders draggable regions across the content header and macOS sidebar chrome", () => {
		const { container } = render(
			<AppLayout
				headerActions={<button type="button">操作</button>}
				headerTitle="智能体工作台"
				sidebar={<nav>项目导航</nav>}
			>
				<div>工作台内容</div>
			</AppLayout>,
		);

		const header = screen.getByRole("banner");
		expect(header).toHaveAttribute("data-desktop-drag-region");
		expect(container.querySelector(".desktop-window-drag-region")).toHaveAttribute(
			"data-desktop-drag-region",
		);
		expect(screen.getByRole("button", { name: "操作" }).parentElement).toHaveAttribute(
			"data-desktop-no-drag",
		);
	});
});
