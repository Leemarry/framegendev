import { useState } from "react";
import { AlertTriangle, Download, GitMerge, RefreshCw, X } from "lucide-react";
import { useDocumentsStore, type MarkdownDocument } from "@/domains/documents/stores";
import { archiveDocumentRecovery } from "@/domains/documents/stores/document-recovery";
import {
	refreshDocumentConflict,
	resolveDocumentConflict,
} from "@/domains/documents/stores/document-save-queue";
import { Button } from "@/shared/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetDescription,
} from "@/shared/components/ui/sheet";

const context = { get: useDocumentsStore.getState, set: useDocumentsStore.setState };

export const DocumentConflictNotice = () => {
	const documents = useDocumentsStore((state) => state.documents);
	const projectId = useDocumentsStore((state) => state.projectId);
	const conflicted = documents.filter((document) => document.saveConflict);
	const [documentId, setDocumentId] = useState<string | null>(null);
	const [server, setServer] = useState<MarkdownDocument | null>(null);
	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const local = conflicted.find((document) => document.id === documentId);
	const open = (document: MarkdownDocument) => {
		setDocumentId(document.id);
		setServer(document.saveConflict?.server ?? null);
		setTitle(document.title);
		setContent(document.content);
		setError("");
	};
	const refresh = async () => {
		if (!local || !projectId) return;
		setLoading(true);
		const ok = await refreshDocumentConflict(context, local.id, projectId);
		setLoading(false);
		if (ok) {
			setServer(
				context.get().documents.find((document) => document.id === local.id)?.saveConflict
					?.server ?? null,
			);
			setError("");
		} else setError("服务器版本读取失败，本地修改仍保留");
	};
	const backup = () => {
		if (!local || !projectId) return false;
		try {
			archiveDocumentRecovery(projectId, local);
			const url = URL.createObjectURL(
				new Blob([JSON.stringify(local, null, 2)], { type: "application/json" }),
			);
			const link = document.createElement("a");
			link.href = url;
			link.download = `${local.id}-local-recovery.json`;
			link.click();
			setTimeout(() => URL.revokeObjectURL(url), 1000);
			return true;
		} catch {
			setError("本地副本备份失败，请保留窗口");
			return false;
		}
	};
	const reloadServer = async () => {
		if (!local || !projectId || !backup()) return;
		setLoading(true);
		const ok = await refreshDocumentConflict(context, local.id, projectId);
		setLoading(false);
		const latest = context.get().documents.find((document) => document.id === local.id)
			?.saveConflict?.server;
		if (!ok || !latest) {
			setError("服务器版本读取失败，本地修改仍保留");
			return;
		}
		resolveDocumentConflict(context, local.id, latest);
		setDocumentId(null);
	};
	if (!conflicted.length) return null;
	return (
		<>
			<div
				role="alert"
				className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%_-_2rem)] max-w-xl -translate-x-1/2 flex-wrap items-center gap-2 rounded border border-warning-border bg-warning-surface p-3 text-sm text-warning-foreground shadow-md"
			>
				<AlertTriangle className="size-4 shrink-0" />
				<span className="min-w-0 flex-1">
					{conflicted.length} 篇文档有未处理修改，自动保存已暂停
				</span>
				<Button variant="outline" size="sm" onClick={() => open(conflicted[0])}>
					<GitMerge className="size-4" />
					处理冲突
				</Button>
			</div>
			<Sheet
				open={Boolean(local)}
				onOpenChange={(next) => {
					if (!next) setDocumentId(null);
				}}
			>
				<SheetContent
					side="right"
					className="flex w-full flex-col gap-3 overflow-y-auto p-4 sm:max-w-5xl sm:p-6 [&>*]:shrink-0"
				>
					<SheetHeader className="relative pr-10">
						<Button
							variant="ghost"
							size="icon"
							className="absolute right-0 top-0"
							aria-label="关闭冲突处理"
							title="关闭冲突处理"
							onClick={() => setDocumentId(null)}
						>
							<X className="size-4" />
						</Button>
						<SheetTitle>文档修改冲突</SheetTitle>
						<SheetDescription>
							{local?.title} · 本地基线 v{local?.version} / 服务器{" "}
							{server ? `v${server.version}` : "未读取"}
						</SheetDescription>
					</SheetHeader>
					{conflicted.length > 1 ? (
						<select
							aria-label="冲突文档"
							className="border border-input bg-background p-2"
							value={documentId ?? ""}
							onChange={(event) => {
								const item = conflicted.find((document) => document.id === event.target.value);
								if (item) open(item);
							}}
						>
							{conflicted.map((document) => (
								<option key={document.id} value={document.id}>
									{document.title}
								</option>
							))}
						</select>
					) : null}
					<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
						<label className="min-w-0 text-sm">
							本地修改
							<textarea
								aria-label="本地修改"
								readOnly
								value={local?.content ?? ""}
								className="mt-1 h-48 w-full resize-y rounded border border-input bg-muted p-2 font-mono text-xs"
							/>
						</label>
						<label className="min-w-0 text-sm">
							服务器版本
							<textarea
								aria-label="服务器版本"
								readOnly
								value={server?.content ?? ""}
								className="mt-1 h-48 w-full resize-y rounded border border-input bg-muted p-2 font-mono text-xs"
							/>
						</label>
					</div>
					<label className="text-sm">
						合并标题
						<input
							aria-label="合并标题"
							value={title}
							onChange={(event) => setTitle(event.target.value)}
							className="mt-1 w-full rounded border border-input bg-background p-2"
						/>
					</label>
					<label className="text-sm">
						合并正文
						<textarea
							aria-label="合并正文"
							value={content}
							onChange={(event) => setContent(event.target.value)}
							className="mt-1 h-60 w-full resize-y rounded border border-input bg-background p-2 font-mono text-xs"
						/>
					</label>
					{error ? (
						<p role="alert" className="text-sm text-destructive">
							{error}
						</p>
					) : null}
					<div className="mt-auto flex flex-wrap gap-2">
						<Button variant="outline" disabled={loading} onClick={() => void refresh()}>
							<RefreshCw className="size-4" />
							刷新服务器
						</Button>
						<Button variant="outline" onClick={backup}>
							<Download className="size-4" />
							下载本地副本
						</Button>
						<Button
							variant="outline"
							disabled={!server || loading}
							onClick={() => void reloadServer()}
						>
							备份并重载服务器
						</Button>
						<Button
							disabled={!server || loading || !title.trim()}
							onClick={() => {
								if (local && server) {
									resolveDocumentConflict(context, local.id, server, { title, content });
									setDocumentId(null);
								}
							}}
						>
							<GitMerge className="size-4" />
							保存合并版本
						</Button>
					</div>
				</SheetContent>
			</Sheet>
		</>
	);
};
