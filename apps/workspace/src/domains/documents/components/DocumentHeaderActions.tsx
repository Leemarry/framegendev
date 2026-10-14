import { FileClock, MessageSquare } from "lucide-react";
import { useState } from "react";
import { useDocumentsStore } from "@/domains/documents/stores";
import { selectEditableDocument } from "@/domains/documents/lib/filters";
import { DocumentHistoryPanel } from "./DocumentHistoryPanel";

export const DocumentHeaderActions = ({ projectId }: { projectId: string }) => {
	const [historyOpen, setHistoryOpen] = useState(false);
	const documents = useDocumentsStore((state) => state.documents);
	const activeDocumentId = useDocumentsStore((state) => state.activeDocumentId);
	const activeAssetId = useDocumentsStore((state) => state.activeAssetId);
	const documentProjectId = useDocumentsStore((state) => state.projectId);
	const showComments = useDocumentsStore((state) => state.showComments);
	const setShowComments = useDocumentsStore((state) => state.setShowComments);
	const activeDocument = selectEditableDocument(documents, activeDocumentId);
	if (!activeDocument || activeAssetId || projectId !== documentProjectId) return null;
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
				onClick={() => setShowComments(!showComments)}
			>
				<MessageSquare />
			</button>
			<DocumentHistoryPanel
				open={historyOpen}
				onOpenChange={setHistoryOpen}
				projectId={projectId}
				document={activeDocument}
			/>
		</>
	);
};
