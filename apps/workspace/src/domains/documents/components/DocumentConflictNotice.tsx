import { useEffect, useState } from "react";
import { AlertTriangle, Download, GitMerge, RefreshCw, X } from "lucide-react";
import { useDocumentsStore, type MarkdownDocument } from "@/domains/documents/stores";
import {
	archiveDocumentRecovery,
	listOtherWindowRecoveries,
	persistDocumentRecovery,
	type DocumentRecoveryDraft,
} from "@/domains/documents/stores/document-recovery";
import { getWorkspaceDocuments } from "@/domains/workspace/api/workspace";
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
	const [recoveries, setRecoveries] = useState<DocumentRecoveryDraft[]>([]);
	const [recovery, setRecovery] = useState<DocumentRecoveryDraft | null>(null);
	const [recoveryError, setRecoveryError] = useState("");
	useEffect(() => {
		setRecovery(null);
		setDocumentId(null);
		const read = () => {
			try {
				setRecoveries(projectId ? listOtherWindowRecoveries(projectId) : []);
				setRecoveryError("");
			} catch {
				setRecoveryError("本地草稿读取失败，请保留原窗口");
			}
		};
		read();
		window.addEventListener("storage", read);
		return () => window.removeEventListener("storage", read);
	}, [projectId]);
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
	const downloadCopy = (copy: MarkdownDocument | undefined) => {
		if (!copy || !projectId) return false;
		try {
			archiveDocumentRecovery(projectId, copy);
			const url = URL.createObjectURL(
				new Blob([JSON.stringify(copy, null, 2)], { type: "application/json" }),
			);
			const link = document.createElement("a");
			link.href = url;
			link.download = `${copy.id}-local-recovery.json`;
			link.click();
			setTimeout(() => URL.revokeObjectURL(url), 1000);
			return true;
		} catch {
			setError("本地副本备份失败，请保留窗口");
			return false;
		}
	};
	const backup = () => downloadCopy(local);
	const viewRecoveries = () => {
		try {
			const entries = projectId ? listOtherWindowRecoveries(projectId) : [];
			setRecoveries(entries);
			setRecovery(entries[0] ?? null);
			setDocumentId(null);
			setRecoveryError("");
		} catch {
			setRecoveryError("本地草稿读取失败，请保留原窗口");
		}
	};
	const stageRecovery = async () => {
		if (!recovery || recovery.projectId !== projectId || !projectId || loading) return;
		const captured = recovery;
		const current = context.get();
		if (
			current.projectId !== projectId ||
			!current.workspaceDir ||
			current.syncStatus === "syncing" ||
			current.documents.some(
				(item) => item.id === captured.document.id && (item.isDirty || item.saveConflict),
			)
		) {
			setRecoveryError("请先处理本窗口的未保存修改，并等待工作区加载完成");
			return;
		}
		setLoading(true);
		setRecoveryError("");
		try {
			const payload = await getWorkspaceDocuments(projectId, [captured.document.id]);
			const latest = context.get();
			if (latest.projectId !== projectId || payload.projectId !== projectId) return;
			if (
				latest.documents.some(
					(item) => item.id === captured.document.id && (item.isDirty || item.saveConflict),
				)
			)
				throw new Error("本窗口已有未保存修改，请先处理后再载入草稿");
			const server = payload.documents.find((item) => item.id === captured.document.id) ?? null;
			const staged: MarkdownDocument = {
				...captured.document,
				isDirty: true,
				saveConflict: { server },
			};
			const next = latest.documents.filter((item) => item.id !== staged.id).concat(staged);
			persistDocumentRecovery(projectId, next);
			context.set({
				documents: next,
				activeDocumentId: staged.id,
				activeAssetId: "",
				syncStatus: "error",
				syncMessage: "已载入恢复稿，自动保存暂停",
			});
			setRecovery(null);
			open(staged);
		} catch (err) {
			setRecoveryError(err instanceof Error ? err.message : "恢复稿载入失败，请重试");
		} finally {
			setLoading(false);
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
	if (!conflicted.length && !recoveries.length && !recoveryError && !recovery) return null;
	return (
		<>
			<div
				role="alert"
				className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%_-_2rem)] max-w-xl -translate-x-1/2 flex-wrap items-center gap-2 rounded border border-warning-border bg-warning-surface p-3 text-sm text-warning-foreground shadow-md"
			>
				<AlertTriangle className="size-4 shrink-0" />
				<div className="min-w-0 flex-1">
					{conflicted.length ? <p>{conflicted.length} 篇文档有未处理修改，自动保存已暂停</p> : null}
					{recoveries.length ? <p>{recoveries.length} 份其他窗口的未保存草稿</p> : null}
					{recoveryError && !recovery ? <p>{recoveryError}</p> : null}
				</div>
				{conflicted.length ? (
					<Button variant="outline" size="sm" onClick={() => open(conflicted[0])}>
						<GitMerge className="size-4" />
						处理冲突
					</Button>
				) : null}
				{recoveries.length || recoveryError ? (
					<Button variant="outline" size="sm" onClick={viewRecoveries}>
						<RefreshCw className="size-4" />
						查看恢复草稿
					</Button>
				) : null}
			</div>
			<Sheet
				open={Boolean(recovery)}
				onOpenChange={(next) => {
					if (!next && !loading) setRecovery(null);
				}}
			>
				<SheetContent
					side="right"
					className="flex w-full flex-col gap-3 overflow-y-auto p-4 sm:max-w-3xl sm:p-6 [&>*]:shrink-0"
				>
					<SheetHeader>
						<SheetTitle>其他窗口的恢复草稿</SheetTitle>
						<SheetDescription>来源副本保留；载入后需要处理文档冲突。</SheetDescription>
					</SheetHeader>
					<select
						aria-label="选择恢复草稿"
						value={recovery ? JSON.stringify([recovery.key, recovery.document.id]) : ""}
						disabled={loading}
						className="w-full min-w-0 border border-input bg-background p-2 text-sm"
						onChange={(event) => {
							const selected = recoveries.find(
								(entry) => JSON.stringify([entry.key, entry.document.id]) === event.target.value,
							);
							if (selected) {
								setRecovery(selected);
								setRecoveryError("");
							}
						}}
					>
						{recoveries.map((entry) => (
							<option
								key={JSON.stringify([entry.key, entry.document.id])}
								value={JSON.stringify([entry.key, entry.document.id])}
							>
								{entry.document.title} · v{entry.document.version} · {entry.windowId.slice(0, 8)} ·{" "}
								{entry.document.updatedAt}
							</option>
						))}
					</select>
					<p className="break-all text-xs text-muted-foreground">
						窗口 {recovery?.windowId} · {recovery?.document.updatedAt}
					</p>
					<label className="text-sm">
						恢复正文
						<textarea
							aria-label="恢复正文"
							readOnly
							value={recovery?.document.content ?? ""}
							className="mt-1 h-72 w-full resize-y rounded border border-input bg-muted p-2 font-mono text-xs"
						/>
					</label>
					{recovery && !documents.some((item) => item.id === recovery.document.id) ? (
						<p className="text-sm text-warning-foreground">当前项目未找到此文档，副本仍可下载。</p>
					) : null}
					{recoveryError ? (
						<p role="alert" className="break-words text-sm text-destructive">
							{recoveryError}
						</p>
					) : null}
					<div className="mt-auto flex flex-wrap gap-2">
						<Button variant="outline" disabled={loading} onClick={() => setRecovery(null)}>
							取消
						</Button>
						<Button
							variant="outline"
							onClick={() => {
								if (!downloadCopy(recovery?.document))
									setRecoveryError("本地副本备份失败，请保留窗口");
							}}
						>
							<Download className="size-4" />
							下载恢复副本
						</Button>
						<Button disabled={loading} onClick={() => void stageRecovery()}>
							<GitMerge className="size-4" />
							载入为待合并稿
						</Button>
					</div>
				</SheetContent>
			</Sheet>
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
