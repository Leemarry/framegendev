import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	GenerationHistoryHome,
	GenerationHistoryImage,
	GenerationHistoryText,
} from "@/pages/GenerationHistory";

const conversationsByKind = vi.hoisted(() => new Map<string, { id: string; scopeId: string }[]>());

vi.mock("@/domains/generation/api/generation", () => ({
	defaultGenerationConversationScopeId: "studio",
	agentGenerationConversationScopeId: "agent",
	generationConversationsQueryKey: (kind?: string) => ["conversations", kind ?? ""],
	getGenerationConversations: vi.fn(async (kind?: string) => ({
		conversations: conversationsByKind.get(kind ?? "") ?? [],
		sessions: [],
	})),
	projectGenerationConversation: vi.fn((projectId: string | null | undefined, kind: string) =>
		projectId
			? {
					conversationId: `${projectId}-${kind}`,
					conversationScopeId: "agent",
					conversationTitle: `项目 · ${kind}`,
					historyScopeId: `${projectId}-${kind}`,
				}
			: undefined,
	),
}));

vi.mock("@/domains/generation/components/GenerationWorkspace", () => ({
	GenerationWorkspace: (props: Record<string, unknown>) => (
		<output data-testid="workspace" data-conversation={String(props.conversationId)}>
			{String(props.initialKind)}
		</output>
	),
}));

vi.mock("@/lib/stores/work-mode", () => ({
	useWorkModeStore: (selector: (state: { setMode: () => void }) => unknown) =>
		selector({ setMode: () => undefined }),
}));

const LocationProbe = () => {
	const location = useLocation();
	return <output data-testid="location-probe">{`${location.pathname}${location.search}`}</output>;
};

const renderHistory = (entry: string) =>
	render(
		<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
			<MemoryRouter initialEntries={[entry]}>
				<Routes>
					<Route path="/history" element={<GenerationHistoryHome />} />
					<Route path="/history/image" element={<GenerationHistoryImage />} />
					<Route path="/history/video" element={<LocationProbe />} />
					<Route path="/history/text" element={<GenerationHistoryText />} />
				</Routes>
			</MemoryRouter>
		</SWRConfig>,
	);

describe("generation history pages", () => {
	beforeEach(() => {
		conversationsByKind.clear();
	});

	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it("sends project scoped home visits to the video history", async () => {
		renderHistory("/history?projectId=project-a");

		await waitFor(() =>
			expect(screen.getByTestId("location-probe")).toHaveTextContent(
				"/history/video?projectId=project-a",
			),
		);
	});

	it("opens the newest conversation in official kind order", async () => {
		conversationsByKind.set("image", [{ id: "image-1", scopeId: "studio" }]);
		conversationsByKind.set("video", [{ id: "video-1", scopeId: "studio" }]);

		renderHistory("/history");

		await waitFor(() =>
			expect(screen.getByTestId("location-probe")).toHaveTextContent(
				"/history/video?conversation=video-1",
			),
		);
	});

	it("shows the official empty copy when nothing was generated yet", async () => {
		renderHistory("/history");

		expect(await screen.findByTestId("generation-history-empty")).toHaveTextContent("暂无生成记录");
		expect(screen.getByTestId("generation-history-empty")).toHaveTextContent(
			"完成一次生成后，记录会按类型显示在左侧。",
		);
	});

	it("renders the workspace for the conversation named in the query", async () => {
		conversationsByKind.set("image", [{ id: "image-1", scopeId: "studio" }]);

		renderHistory("/history/image?conversation=image-1");

		const workspace = await screen.findByTestId("workspace");
		expect(workspace).toHaveAttribute("data-conversation", "image-1");
		expect(workspace).toHaveTextContent("image");
	});

	it("keeps the project conversation for project scoped kind pages", async () => {
		renderHistory("/history/text?projectId=project-a");

		const workspace = await screen.findByTestId("workspace");
		expect(workspace).toHaveAttribute("data-conversation", "project-a-text");
		expect(workspace).toHaveTextContent("text");
	});

	it("shows the kind specific empty copy when the kind has no records", async () => {
		renderHistory("/history/image");

		expect(await screen.findByTestId("generation-history-empty")).toHaveTextContent(
			"暂无图片生成记录",
		);
	});
});
