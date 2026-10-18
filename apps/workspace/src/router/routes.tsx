import type React from "react";
import { lazy, Suspense } from "react";
import { Navigate, type RouteObject, useLocation, useRoutes } from "react-router-dom";
import { WorkspaceContentFallback } from "@/domains/workspace/components/WorkspaceContentFallback";
import { Home } from "@/pages/Home";
import { useWorkModeStore } from "@/lib/stores/work-mode";

const Projects = lazy(() =>
	import("@/pages/Projects").then((module) => ({ default: module.Projects })),
);
const GlobalAgent = lazy(() =>
	import("@/pages/GlobalAgent").then((module) => ({ default: module.GlobalAgent })),
);
const AssetLibrary = lazy(() =>
	import("@/pages/AssetLibrary").then((module) => ({ default: module.AssetLibrary })),
);
const Settings = lazy(() =>
	import("@/pages/Settings").then((module) => ({ default: module.Settings })),
);
const ProjectSettings = lazy(() =>
	import("@/pages/ProjectSettings").then((module) => ({ default: module.ProjectSettings })),
);
const PromptPackEditor = lazy(() =>
	import("@/pages/PromptPackEditor").then((module) => ({ default: module.PromptPackEditor })),
);
const StudioHome = lazy(() =>
	import("@/pages/Studio").then((module) => ({ default: module.StudioHome })),
);
const StudioImage = lazy(() =>
	import("@/pages/Studio").then((module) => ({ default: module.StudioImage })),
);
const StudioVideo = lazy(() =>
	import("@/pages/Studio").then((module) => ({ default: module.StudioVideo })),
);
const StudioText = lazy(() =>
	import("@/pages/Studio").then((module) => ({ default: module.StudioText })),
);
const StudioAudio = lazy(() =>
	import("@/pages/Studio").then((module) => ({ default: module.StudioAudio })),
);
const StudioNovelUnderstand = lazy(() =>
	import("@/pages/Studio").then((module) => ({ default: module.StudioNovelUnderstand })),
);
const StudioVideoUnderstand = lazy(() =>
	import("@/pages/Studio").then((module) => ({ default: module.StudioVideoUnderstand })),
);
const StudioAudioTranscribe = lazy(() =>
	import("@/pages/Studio").then((module) => ({ default: module.StudioAudioTranscribe })),
);
const GenerationHistoryHome = lazy(() =>
	import("@/pages/GenerationHistory").then((module) => ({ default: module.GenerationHistoryHome })),
);
const GenerationHistoryImage = lazy(() =>
	import("@/pages/GenerationHistory").then((module) => ({
		default: module.GenerationHistoryImage,
	})),
);
const GenerationHistoryVideo = lazy(() =>
	import("@/pages/GenerationHistory").then((module) => ({
		default: module.GenerationHistoryVideo,
	})),
);
const GenerationHistoryText = lazy(() =>
	import("@/pages/GenerationHistory").then((module) => ({ default: module.GenerationHistoryText })),
);
const GenerationHistoryAudio = lazy(() =>
	import("@/pages/GenerationHistory").then((module) => ({
		default: module.GenerationHistoryAudio,
	})),
);

function RootShell() {
	const mode = useWorkModeStore((state) => state.mode);

	if (mode === "studio") return <StudioHome />;
	return <Projects />;
}

function LegacyWorkspaceRouteRedirect() {
	const location = useLocation();
	const pathname =
		location.pathname === "/agent"
			? "/agent"
			: location.pathname.replace(/^\/studio(?=\/|$)/, "/toolbox");

	return <Navigate to={`${pathname}${location.search}${location.hash}`} replace />;
}

/** LegacyAssetLibraryRedirect keeps old `/assets` links working after the official `/library` rename. */
export function LegacyAssetLibraryRedirect() {
	const location = useLocation();

	return <Navigate to={`/library${location.search}${location.hash}`} replace />;
}

/** SettingsRoute sends legacy `/settings?projectId=…` links to the dedicated project settings page. */
export function SettingsRoute({ fallback }: { fallback: React.ReactNode }) {
	const location = useLocation();
	const projectId = new URLSearchParams(location.search).get("projectId")?.trim();

	if (projectId) {
		return <Navigate to={`/project-settings${location.search}${location.hash}`} replace />;
	}

	return <>{fallback}</>;
}

const routes: RouteObject[] = [
	{ path: "/", element: <RootShell /> },
	{ path: "/projects", element: <Home /> },
	{ path: "/library", element: <AssetLibrary /> },
	{ path: "/assets", element: <LegacyAssetLibraryRedirect /> },
	{ path: "/toolbox", element: <StudioHome /> },
	{ path: "/toolbox/image", element: <StudioImage /> },
	{ path: "/toolbox/video", element: <StudioVideo /> },
	{ path: "/toolbox/text", element: <StudioText /> },
	{ path: "/toolbox/audio", element: <StudioAudio /> },
	{ path: "/toolbox/novel-understand", element: <StudioNovelUnderstand /> },
	{ path: "/toolbox/video-understand", element: <StudioVideoUnderstand /> },
	{ path: "/toolbox/audio-transcribe", element: <StudioAudioTranscribe /> },
	{ path: "/history", element: <GenerationHistoryHome /> },
	{ path: "/history/image", element: <GenerationHistoryImage /> },
	{ path: "/history/video", element: <GenerationHistoryVideo /> },
	{ path: "/history/text", element: <GenerationHistoryText /> },
	{ path: "/history/audio", element: <GenerationHistoryAudio /> },
	{ path: "/agent", element: <GlobalAgent /> },
	{ path: "/agent/archived", element: <GlobalAgent archived /> },
	{ path: "/studio/*", element: <LegacyWorkspaceRouteRedirect /> },
	{ path: "/settings", element: <SettingsRoute fallback={<Settings />} /> },
	{ path: "/project-settings", element: <ProjectSettings /> },
	{ path: "/prompt-pack-editor", element: <PromptPackEditor /> },
	{ path: "*", element: <div>404 - 页面未找到</div> },
];

export const AppRoutes: React.FC = () => {
	const element = useRoutes(routes);
	return <Suspense fallback={<WorkspaceContentFallback />}>{element}</Suspense>;
};
