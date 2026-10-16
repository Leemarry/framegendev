import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import useSWR from "swr";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { StoryboardTimelinePanel } from "./StoryboardTimelinePanel";
import type { MarkdownDocument } from "@/domains/documents/stores";

vi.mock("swr", () => ({ default: vi.fn() }));
const mutate = vi.fn();
const document: MarkdownDocument = {
	id: "doc-a",
	title: "Shots",
	content: "## Group\nBody",
	category: "storyboard",
	parentId: null,
	sortOrder: 0,
	updatedAt: "2026-10-16",
	version: 3,
	isDirty: false,
	comments: [],
	workbenchDraft: null,
};
const data = {
	documentId: "doc-a",
	documentUpdatedAt: document.updatedAt,
	projectId: "project-a",
	workspaceDir: "/isolated",
	episode: {
		id: "episode-doc-a",
		title: "Shots",
		aspectRatio: "16:9",
		duration: 5,
		sections: [{ id: "section-1", title: "Saved group", start: 0, end: 5, summary: "Visual" }],
		tracks: [
			{
				id: "video",
				type: "video",
				label: "视频",
				clips: [
					{
						id: "clip",
						title: "Visual",
						start: 0,
						end: 5,
						content: "Saved camera",
						status: "draft",
					},
				],
			},
		],
	},
};
beforeEach(() => {
	mutate.mockReset();
	vi.mocked(useSWR).mockReturnValue({
		data,
		isLoading: false,
		isValidating: false,
		mutate,
	} as never);
});
afterEach(cleanup);
const show = (value = document) =>
	render(<StoryboardTimelinePanel document={value} projectId="project-a" onClose={vi.fn()} />);

it("reads existing resolved groups and revalidates after saved document changes without writes", () => {
	const view = show();
	expect(screen.getByText("Saved group")).toBeVisible();
	expect(screen.getByText("Saved camera")).toBeVisible();
	const calls = mutate.mock.calls.length;
	view.rerender(
		<StoryboardTimelinePanel
			document={{ ...document, updatedAt: "2026-10-17" }}
			projectId="project-a"
			onClose={vi.fn()}
		/>,
	);
	expect(mutate.mock.calls.length).toBeGreaterThan(calls);
});

it.each([
	{ isLoading: true },
	{ isValidating: true },
	{ error: new Error("offline") },
	{ data: { ...data, projectId: "foreign" } },
	{ data: { ...data, documentId: "foreign" } },
	{ data: { ...data, documentUpdatedAt: "older" } },
])("hides cached groups when a read is unsafe %j", (patch) => {
	vi.mocked(useSWR).mockReturnValue({
		data,
		isLoading: false,
		isValidating: false,
		mutate,
		...patch,
	} as never);
	show();
	expect(screen.queryByText("Saved group")).toBeNull();
	if (!("isLoading" in patch) && !("isValidating" in patch)) {
		fireEvent.click(screen.getByRole("button", { name: "重试读取分镜资源" }));
		expect(mutate).toHaveBeenCalled();
	}
});

it.each([{ isDirty: true }, { saveConflict: { server: null } }])(
	"suppresses saved groups for unsafe drafts %j",
	(patch) => {
		show({ ...document, ...patch });
		expect(screen.queryByText("Saved group")).toBeNull();
		expect(screen.getByRole("status")).toHaveTextContent("请先保存正文并处理文档冲突");
		expect(useSWR).toHaveBeenLastCalledWith(null, expect.any(Function));
	},
);

it("does not present the generic episode fallback as an H2 storyboard group", () => {
	show({ ...document, content: "Plain document without any groups.\n" });
	expect(screen.queryByText("Saved group")).toBeNull();
	expect(screen.getByText("还没有识别到二级标题分镜组。")).toBeVisible();
	expect(useSWR).toHaveBeenLastCalledWith(null, expect.any(Function));
});
