import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { App } from "./App";

vi.mock("swr", () => ({ default: () => ({ data: { projects: [] } }) }));
vi.mock("@/domains/workspace/components/AppLayout", () => ({
	AppLayout: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/domains/workspace/components/ProjectNavigator", () => ({
	ProjectNavigator: () => null,
}));
vi.mock("@/domains/agent/components/AgentStateSync", () => ({ AgentStateSync: () => null }));
vi.mock("@/domains/agent/components/AgentCompletionNotificationSync", () => ({
	AgentCompletionNotificationSync: () => null,
}));
vi.mock("@/domains/agent/components/AgentPermissionNotificationSync", () => ({
	AgentPermissionNotificationSync: () => null,
}));
vi.mock("@/domains/documents/components/DocumentStateSync", () => ({
	DocumentStateSync: () => null,
}));
vi.mock("@/domains/documents/components/DocumentHeaderActions", () => ({
	DocumentHeaderActions: () => null,
}));
vi.mock("@/domains/agent/components/ProjectAgentDock", () => ({
	ProjectAgentDock: () => <aside aria-label="项目 Drami" />,
}));
vi.mock("@/router/routes", () => ({ AppRoutes: () => <article>当前页面内容</article> }));
vi.mock("@/shared/analytics", () => ({ AnalyticsRouteSync: () => null }));

afterEach(cleanup);

it.each([
	["/projects?projectId=p1", true],
	["/projects?projectId=p1&documentId=doc-script", true],
	["/projects?projectId=p1&resourceType=character", true],
	["/projects?projectId=p1&assetId=reference", true],
	["/", false],
	["/projects", false],
	["/agent", false],
	["/agent?projectId=p1", false],
	["/agent/archived", false],
	["/project-settings?projectId=p1", false],
	["/settings", false],
	["/library?projectId=p1", false],
	["/history/video?projectId=p1", false],
	["/toolbox/image", false],
])("limits the reusable dock to the project content pane: %s", (url, visible) => {
	render(
		<MemoryRouter initialEntries={[url]}>
			<App />
		</MemoryRouter>,
	);
	expect(Boolean(screen.queryByRole("complementary", { name: "项目 Drami" }))).toBe(visible);
	expect(screen.getByText("当前页面内容")).toBeTruthy();
});
