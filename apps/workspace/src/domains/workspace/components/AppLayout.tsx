import type React from "react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Menu, X } from "lucide-react";
import {
	SidebarContentLayout,
	useWorkspaceSidebarWidth,
	workspaceSidebarWidth,
} from "@/domains/workspace/components/SidebarContentLayout";
import { useDesktopWindowDrag as useDesktopWindowDragHandler } from "@/domains/workspace/lib/desktop-window-drag";

interface AppLayoutProps {
	children: React.ReactNode;
	headerActions?: React.ReactNode;
	headerTitle: React.ReactNode;
	showHeader?: boolean;
	projectManagement?: boolean;
	projectWorkspace?: boolean;
	globalSettings?: boolean;
	navigationKey?: string;
	sidebar: React.ReactNode;
	sidebarHidden?: boolean;
}

/**
 * AppLayout is the product shell: left sidebar, right header, and content body.
 * Page-specific components should contribute sidebar screens and header actions,
 * but they should not recreate this two-column frame.
 */
export const AppLayout: React.FC<AppLayoutProps> = ({
	children,
	headerActions,
	headerTitle,
	showHeader = true,
	projectManagement = false,
	projectWorkspace = false,
	globalSettings = false,
	navigationKey = "",
	sidebar,
	sidebarHidden = false,
}) => {
	const [navigatorWidth, setNavigatorWidth] = useWorkspaceSidebarWidth();
	const narrow = useSyncExternalStore(subscribeNarrowViewport, isNarrowViewport, () => false);
	const [mobileNavigation, setMobileNavigation] = useState({ key: navigationKey, open: false });
	const hasNarrowNavigation = (projectWorkspace || globalSettings) && narrow;
	const navigationLabel = globalSettings ? "设置导航" : "项目导航";
	const mobileOpen =
		hasNarrowNavigation && mobileNavigation.key === navigationKey && mobileNavigation.open;
	const toggleRef = useRef<HTMLButtonElement>(null);
	const sidebarRef = useRef<HTMLDivElement>(null);
	const closeNavigation = () => {
		setMobileNavigation({ key: navigationKey, open: false });
		toggleRef.current?.focus();
	};
	useEffect(() => {
		if (!mobileOpen) return;
		sidebarRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
		return () => toggleRef.current?.focus();
	}, [mobileOpen]);
	const effectiveSidebarHidden = sidebarHidden || (hasNarrowNavigation && !mobileOpen);
	const navigationToggle = hasNarrowNavigation ? (
		<button
			ref={toggleRef}
			type="button"
			className="project-header-icon"
			aria-label={`打开${navigationLabel}`}
			aria-expanded={mobileOpen}
			onClick={() => setMobileNavigation({ key: navigationKey, open: true })}
		>
			<Menu />
		</button>
	) : null;

	return (
		<SidebarContentLayout
			className={`desktop-window-frame relative h-screen w-screen${projectManagement ? " project-management-shell" : ""}${projectWorkspace ? " project-workspace-shell" : ""}`}
			contentInset={!sidebarHidden}
			maxSidebarWidth={workspaceSidebarWidth.max}
			minSidebarWidth={workspaceSidebarWidth.min}
			resizeStep={workspaceSidebarWidth.resizeStep}
			showDesktopDragRegion
			sidebar={
				projectWorkspace || globalSettings ? (
					<div
						ref={sidebarRef}
						className="h-full"
						role={mobileOpen ? "dialog" : undefined}
						aria-modal={mobileOpen || undefined}
						aria-label={mobileOpen ? navigationLabel : undefined}
						onClick={(event) => {
							if (
								globalSettings &&
								mobileOpen &&
								event.target instanceof Element &&
								event.target.closest("[data-sidebar-navigation-item]")
							)
								closeNavigation();
						}}
						onKeyDown={(event) => {
							if (!mobileOpen || !event.currentTarget.contains(event.target as Node)) return;
							if (event.key === "Escape") {
								event.stopPropagation();
								closeNavigation();
							}
							if (event.key === "Tab") {
								const buttons = Array.from(
									event.currentTarget.querySelectorAll<HTMLElement>(
										'button:not(:disabled), input, [tabindex="0"]',
									),
								).filter(
									(element) => !element.closest("[inert]") && element.getClientRects().length > 0,
								);
								const first = buttons[0],
									last = buttons.at(-1);
								if (event.shiftKey && document.activeElement === first) {
									event.preventDefault();
									last?.focus();
								} else if (!event.shiftKey && document.activeElement === last) {
									event.preventDefault();
									first?.focus();
								}
							}
						}}
					>
						{mobileOpen ? (
							<button
								type="button"
								className="project-sidebar-close"
								aria-label={`关闭${navigationLabel}`}
								onClick={closeNavigation}
							>
								<X />
							</button>
						) : null}
						{sidebar}
					</div>
				) : (
					sidebar
				)
			}
			sidebarClassName={`text-ide-sidebar-foreground${globalSettings && narrow ? " absolute inset-y-0 left-0 z-30 max-w-[calc(100vw-48px)] border-r border-border bg-ide-sidebar shadow-lg" : ""}`}
			sidebarHidden={effectiveSidebarHidden}
			sidebarWidth={projectManagement || projectWorkspace ? 325 : navigatorWidth}
			onSidebarWidthChange={
				projectManagement || projectWorkspace || hasNarrowNavigation ? undefined : setNavigatorWidth
			}
		>
			<div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-ide-editor text-ide-editor-foreground">
				{showHeader || (globalSettings && narrow) ? (
					<AppHeader
						title={globalSettings ? "软件设置" : headerTitle}
						actions={headerActions}
						navigationToggle={navigationToggle}
					/>
				) : null}
				{mobileOpen ? (
					<button
						type="button"
						tabIndex={-1}
						aria-label={`关闭${navigationLabel}遮罩`}
						className="project-sidebar-backdrop"
						onClick={closeNavigation}
					/>
				) : null}
				<div className="min-h-0 flex-1 overflow-hidden" inert={globalSettings && mobileOpen}>
					{children}
				</div>
			</div>
		</SidebarContentLayout>
	);
};

interface AppHeaderProps {
	actions?: React.ReactNode;
	title: React.ReactNode;
	navigationToggle?: React.ReactNode;
}

/**
 * AppHeader is the draggable title bar for the right content area.
 * Interactive actions opt out of the drag region so they remain clickable.
 */
export const AppHeader: React.FC<AppHeaderProps> = ({ actions, title, navigationToggle }) => {
	const startWindowDrag = useDesktopWindowDragHandler();

	return (
		<header
			className="workspace-app-header flex h-11 shrink-0 items-center justify-between gap-3 border-b border-border bg-ide-toolbar/95 px-3 text-ide-toolbar-foreground"
			data-desktop-drag-region
			onPointerDown={startWindowDrag}
		>
			{navigationToggle ? <div data-desktop-no-drag>{navigationToggle}</div> : null}
			<div className="flex h-full min-w-0 flex-1 items-center">
				<h1 className="min-w-0 truncate text-sm font-medium text-foreground">{title}</h1>
			</div>
			{actions ? (
				<div className="flex shrink-0 items-center gap-2" data-desktop-no-drag>
					{actions}
				</div>
			) : null}
		</header>
	);
};

export { useDesktopWindowDrag } from "@/domains/workspace/lib/desktop-window-drag";

const isNarrowViewport = () => window.matchMedia?.("(max-width: 700px)").matches ?? false;
const subscribeNarrowViewport = (callback: () => void) => {
	const query = window.matchMedia?.("(max-width: 700px)");
	query?.addEventListener("change", callback);
	return () => query?.removeEventListener("change", callback);
};
