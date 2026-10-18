import type React from "react";
import { useLocation } from "react-router-dom";
import useSWR from "swr";
import { getProjects, projectsKey } from "@/domains/projects/api/projects";
import { AgentStateSync } from "@/domains/agent/components/AgentStateSync";
import { AgentCompletionNotificationSync } from "@/domains/agent/components/AgentCompletionNotificationSync";
import { ProjectAgentDock } from "@/domains/agent/components/ProjectAgentDock";
import { AgentPermissionNotificationSync } from "@/domains/agent/components/AgentPermissionNotificationSync";
import { DocumentStateSync } from "@/domains/documents/components/DocumentStateSync";
import { DocumentConflictNotice } from "@/domains/documents/components/DocumentConflictNotice";
import { DocumentHeaderActions } from "@/domains/documents/components/DocumentHeaderActions";
import { AppLayout } from "@/domains/workspace/components/AppLayout";
import { ProjectNavigator } from "@/domains/workspace/components/ProjectNavigator";
import { resolveAppRouteDescriptor } from "@/domains/workspace/lib/app-route-descriptor";
import {
	getRouteAgentSessionId,
	getRouteProjectId,
	isAgentDocumentRoute,
	isSettingsRoute,
} from "@/domains/workspace/lib/workbench-route";
import { useAgentLayoutStore } from "@/lib/stores/agent-layout";
import { useWorkModeStore } from "@/lib/stores/work-mode";
import { useSettingsNavigationStore } from "@/lib/stores/settings";
import { AppRoutes } from "@/router/routes";
import { AnalyticsRouteSync } from "@/shared/analytics";

export const App: React.FC = () => {
	const location = useLocation();
	const workMode = useWorkModeStore((state) => state.mode);
	const routeProjectId = getRouteProjectId(location.search);
	const routeAgentSessionId = getRouteAgentSessionId(location.search);
	const isProjectRoute = location.pathname === "/projects" && Boolean(routeProjectId);
	const isGlobalAgentRoute =
		location.pathname === "/agent" || location.pathname === "/agent/archived";
	const isEpisodeRoute = isAgentDocumentRoute(location.pathname, location.search);
	const routeIsSettings = isSettingsRoute(location.pathname);
	const projectWorkspace = Boolean(routeProjectId) && (isProjectRoute || routeIsSettings);
	const globalSettings = routeIsSettings && !projectWorkspace;
	const globalSettingsTab = useSettingsNavigationStore((state) => state.activeTab);
	const { data: projectsData } = useSWR(projectWorkspace ? projectsKey : null, getProjects);
	const projectTitle =
		projectsData?.projects.find((project) => project.id === routeProjectId)?.name ?? "加载项目";
	const showProjectWorkspaceFrame = isProjectRoute && !routeIsSettings;
	const agentLayoutTab = useAgentLayoutStore((state) => state.tab);
	const routeDescriptor = resolveAppRouteDescriptor(location.pathname, location.search, {
		projectId: routeProjectId,
		workMode,
	});
	const isAgentSurfaceActive = showProjectWorkspaceFrame && agentLayoutTab === "agent";
	const headerActions =
		showProjectWorkspaceFrame && routeProjectId ? (
			<DocumentHeaderActions projectId={routeProjectId} />
		) : null;
	if (
		location.pathname === "/prompt-pack-editor" ||
		location.pathname === "/library" ||
		location.pathname === "/assets"
	) {
		return (
			<>
				<AnalyticsRouteSync />
				<AppRoutes />
			</>
		);
	}

	return (
		<>
			<AnalyticsRouteSync />
			<AgentStateSync
				agentSurfaceActive={isGlobalAgentRoute || isAgentSurfaceActive}
				archivedScope={location.pathname === "/agent/archived"}
				globalScope={isGlobalAgentRoute}
				projectId={routeProjectId}
				routeSessionId={routeAgentSessionId}
			/>
			<AgentPermissionNotificationSync
				isAgentSurfaceActive={isAgentSurfaceActive}
				projectId={routeProjectId}
			/>
			<AgentCompletionNotificationSync
				isAgentSurfaceActive={isAgentSurfaceActive}
				projectId={routeProjectId}
			/>
			<DocumentStateSync projectId={routeProjectId} />

			<AppLayout
				headerActions={headerActions}
				headerTitle={projectWorkspace ? projectTitle : routeDescriptor.title}
				showHeader={
					!isEpisodeRoute &&
					(!routeIsSettings || projectWorkspace) &&
					routeDescriptor.sidebarScreen !== "projects"
				}
				projectManagement={routeDescriptor.sidebarScreen === "projects"}
				projectWorkspace={projectWorkspace}
				globalSettings={globalSettings}
				globalAgent={isGlobalAgentRoute}
				navigationKey={
					location.pathname + location.search + (globalSettings ? `:${globalSettingsTab}` : "")
				}
				sidebar={<ProjectNavigator activeProjectId={routeProjectId} />}
				sidebarHidden={routeDescriptor.sidebarHidden}
			>
				<div className="flex h-full min-h-0 flex-col">
					<DocumentConflictNotice key={routeProjectId} />
					<div className="min-h-0 flex-1">
						{showProjectWorkspaceFrame ? (
							<div className="relative h-full min-h-0 w-full overflow-hidden bg-ide-editor text-ide-editor-foreground">
								<AppRoutes />
								<ProjectAgentDock key={routeProjectId} />
							</div>
						) : (
							<AppRoutes />
						)}
					</div>
				</div>
			</AppLayout>
		</>
	);
};
