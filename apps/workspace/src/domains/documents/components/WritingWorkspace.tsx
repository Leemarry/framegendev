import type React from "react";
import { FileText, Rows3 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { CommentsGutter } from "@/domains/documents/components/CommentsGutter";
import { ProjectAssetPreviewPane } from "@/domains/documents/components/ProjectAssetPreviewPane";
import {
	prewarmWritingEditorDocument,
	WritingEditor,
} from "@/domains/documents/components/WritingEditor";
import { ProjectWorkspaceShell } from "@/domains/workspace/components/ProjectWorkspaceShell";
import { useDocumentsStore } from "@/domains/documents/stores";
import { EpisodeTimelineView } from "@/domains/episode/components/EpisodeTimelineView";
import { Button } from "@/shared/components/ui/button";

export const prewarmWritingDocumentEditor = prewarmWritingEditorDocument;

export const WritingWorkspace: React.FC = () => {
	const location = useLocation();
	const navigate = useNavigate();
	const activeAssetId = useDocumentsStore((state) => state.activeAssetId);
	const assets = useDocumentsStore((state) => state.assets);
	const projectId = useDocumentsStore((state) => state.projectId);
	const documents = useDocumentsStore((state) => state.documents);
	const activeDocumentId = useDocumentsStore((state) => state.activeDocumentId);
	const activeAsset = assets.find((asset) => asset.id === activeAssetId) ?? null;
	const params = new URLSearchParams(location.search);
	const activeDocument = documents.find((document) => document.id === activeDocumentId);
	const storyboard = Boolean(
		!activeAsset &&
		activeDocument?.category === "storyboard" &&
		params.get("projectId") === projectId &&
		params.get("documentId") === activeDocumentId,
	);
	const timelineRequested = storyboard && params.get("documentMode") === "timeline";
	const unsafeDraft = Boolean(activeDocument?.isDirty || activeDocument?.saveConflict);
	const timeline = timelineRequested && !unsafeDraft;
	const selectMode = (mode: "document" | "timeline") => {
		params.set("documentMode", mode);
		navigate(
			{ pathname: location.pathname, search: `?${params.toString()}` },
			{ state: location.state },
		);
	};

	return (
		<ProjectWorkspaceShell>
			<div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-ide-editor">
				{storyboard ? (
					<div
						className="flex shrink-0 items-center gap-1 border-b border-border px-3 py-1"
						role="group"
						aria-label="分镜视图"
					>
						<Button
							size="sm"
							variant={timeline ? "ghost" : "secondary"}
							aria-pressed={!timeline}
							onClick={() => selectMode("document")}
						>
							<FileText className="size-4" />
							正文
						</Button>
						<Button
							size="sm"
							variant={timeline ? "secondary" : "ghost"}
							aria-pressed={timeline}
							disabled={unsafeDraft}
							title={unsafeDraft ? "请先保存正文并处理文档冲突" : "时间轴"}
							onClick={() => selectMode("timeline")}
						>
							<Rows3 className="size-4" />
							时间轴
						</Button>
					</div>
				) : null}
				{timelineRequested && unsafeDraft ? (
					<p role="status" className="shrink-0 px-4 py-2 text-sm text-warning-foreground">
						请先保存正文并处理文档冲突。
					</p>
				) : null}
				{activeAsset ? (
					<ProjectAssetPreviewPane asset={activeAsset} projectId={projectId} />
				) : (
					<>
						<div hidden={timeline} className={timeline ? "hidden" : "relative flex min-h-0 flex-1"}>
							<WritingEditor showHeaderActions={false} />
							<CommentsGutter />
						</div>
						{timeline ? (
							<div className="min-h-0 flex-1">
								<EpisodeTimelineView
									key={`${projectId}:${activeDocumentId}`}
									documentId={activeDocumentId}
								/>
							</div>
						) : null}
					</>
				)}
			</div>
		</ProjectWorkspaceShell>
	);
};
