import { FileClock, MessageSquare, PanelRight } from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDocumentsStore } from "@/domains/documents/stores";
import { selectEditableDocument } from "@/domains/documents/lib/filters";
import { DocumentHistoryPanel } from "./DocumentHistoryPanel";

export const DocumentHeaderActions = ({ projectId }: { projectId: string }) => {
	const location = useLocation();
	const navigate = useNavigate();
	const [historyOpen, setHistoryOpen] = useState(false);
	const documents = useDocumentsStore((state) => state.documents);
	const activeDocumentId = useDocumentsStore((state) => state.activeDocumentId);
	const activeAssetId = useDocumentsStore((state) => state.activeAssetId);
	const documentProjectId = useDocumentsStore((state) => state.projectId);
	const showComments = useDocumentsStore((state) => state.showComments);
	const setShowComments = useDocumentsStore((state) => state.setShowComments);
	const activeDocument = selectEditableDocument(documents, activeDocumentId);
	const params = new URLSearchParams(location.search);
	const resourcesOpen = params.get("resourcePanel") === "open";
	const setResourcesOpen = (open: boolean) => {
		if (open) {
			params.set("resourcePanel", "open");
			setShowComments(false);
		} else params.delete("resourcePanel");
		navigate(
			{ pathname: location.pathname, search: `?${params.toString()}` },
			{ state: location.state },
		);
	};
	if (!activeDocument || activeAssetId || projectId !== documentProjectId) return null;
	if (
		activeDocument.category === "storyboard" &&
		!activeDocument.isDirty &&
		!activeDocument.saveConflict &&
		new URLSearchParams(location.search).get("documentMode") === "timeline"
	)
		return null;
	return (
		<>
			<button
				type="button"
				className="project-header-icon"
				aria-label="查看变更记录"
				title="变更记录"
				onClick={() => setHistoryOpen(true)}
			>
				<FileClock />
			</button>
			<button
				type="button"
				className="project-header-icon"
				aria-label={showComments ? "收起批注" : "展开批注"}
				title={showComments ? "收起批注" : "展开批注"}
				aria-pressed={showComments}
				onClick={() => {
					if (!showComments && resourcesOpen) setResourcesOpen(false);
					setShowComments(!showComments);
				}}
			>
				<MessageSquare />
			</button>
			{activeDocument.category === "storyboard" &&
			params.get("projectId") === projectId &&
			params.get("documentId") === activeDocument.id ? (
				<button
					type="button"
					className="project-header-icon"
					aria-label={resourcesOpen ? "关闭资源栏" : "打开资源栏"}
					title={resourcesOpen ? "关闭资源栏" : "打开资源栏"}
					aria-pressed={resourcesOpen}
					onClick={() => setResourcesOpen(!resourcesOpen)}
				>
					<PanelRight />
				</button>
			) : null}
			<DocumentHistoryPanel
				open={historyOpen}
				onOpenChange={setHistoryOpen}
				projectId={projectId}
				document={activeDocument}
			/>
		</>
	);
};
