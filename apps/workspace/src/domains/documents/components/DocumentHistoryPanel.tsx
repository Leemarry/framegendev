import type React from "react";
import { useEffect, useRef, useState } from "react";
import {
	ArrowLeftRight,
	ChevronLeft,
	ChevronRight,
	History,
	Loader2,
	RefreshCw,
	RotateCcw,
	X,
} from "lucide-react";
import useSWR from "swr";
import {
	type DocumentHistoryItem,
	getWorkspaceDocumentHistory,
	getWorkspaceDocumentHistoryDiff,
	restoreWorkspaceDocumentHistoryVersion,
} from "@/domains/workspace/api/workspace";
import { historyChangeStarts } from "@/domains/documents/lib/document-history-diff";
import { useDocumentsStore, type MarkdownDocument } from "@/domains/documents/stores";
import { Button } from "@/shared/components/ui/button";
import { confirmDialog } from "@/shared/components/callable/ConfirmDialog";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/shared/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/shared/lib/utils";
import { DocumentHistoryDiff } from "./DocumentHistoryDiff";
import { DocumentHistorySnapshot } from "./DocumentHistorySnapshot";

interface DocumentHistoryPanelProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	projectId?: string | null;
	document: MarkdownDocument | null;
}

export const DocumentHistoryPanel: React.FC<DocumentHistoryPanelProps> = ({
	open,
	onOpenChange,
	projectId,
	document,
}) => {
	const toast = useToast();
	const [selectedHash, setSelectedHash] = useState<string | null>(null);
	const [restoring, setRestoring] = useState(false);
	const [reviewedVersion, setReviewedVersion] = useState<number | null>(null);
	const [restoreError, setRestoreError] = useState("");
	const [mode, setMode] = useState("parallel");
	const [contentView, setContentView] = useState("diff");
	const [changeIndex, setChangeIndex] = useState(-1);
	const diffContainer = useRef<HTMLDivElement>(null);
	const documentId = document?.id ?? null;
	const historyKey =
		open && projectId && documentId ? ["document-history", projectId, documentId] : null;
	const {
		data: history,
		error: historyError,
		isLoading: loadingHistory,
		isValidating: refreshingHistory,
		mutate: refreshHistory,
	} = useSWR(historyKey, () => getWorkspaceDocumentHistory(documentId ?? "", projectId, 50), {
		revalidateOnFocus: false,
	});
	const items = history?.items ?? [];
	const currentHash = items[0]?.hash;
	const selectedItem = items.find((item) => item.hash === selectedHash);
	const dirty = Boolean(document?.isDirty || document?.saveConflict);
	useEffect(() => {
		setSelectedHash(null);
		setReviewedVersion(open ? (document?.version ?? null) : null);
		setRestoreError("");
	}, [open, projectId, documentId]);
	useEffect(() => {
		if (
			open &&
			items.length &&
			(!selectedHash || !items.some((item) => item.hash === selectedHash))
		)
			setSelectedHash((items[1] ?? items[0]).hash);
	}, [open, items, selectedHash]);
	const {
		data: response,
		error: diffError,
		isLoading: loadingDiff,
		isValidating: refreshingDiff,
		mutate: refreshDiff,
	} = useSWR(
		open && projectId && documentId && selectedHash && currentHash
			? ["document-history-diff", projectId, documentId, selectedHash, currentHash]
			: null,
		() =>
			getWorkspaceDocumentHistoryDiff(
				documentId ?? "",
				currentHash ?? "",
				projectId,
				selectedHash ?? undefined,
			),
		{ revalidateOnFocus: false },
	);
	const diff =
		response &&
		response.projectId === projectId &&
		response.documentId === documentId &&
		response.diff.to.hash === currentHash &&
		response.diff.from?.hash === selectedHash
			? response.diff
			: undefined;
	const snapshot = selectedHash === currentHash ? diff?.to : diff?.from;
	const reading = contentView !== "diff";
	const unavailable = Boolean(historyError || diffError || refreshingHistory || refreshingDiff);
	const changes = historyChangeStarts(diff?.lines ?? []);
	useEffect(() => {
		setChangeIndex(-1);
	}, [selectedHash, currentHash]);
	const navigateChange = (direction: number) => {
		if (!changes.length) return;
		const next =
			changeIndex < 0
				? direction < 0
					? changes.length - 1
					: 0
				: (changeIndex + direction + changes.length) % changes.length;
		setChangeIndex(next);
		diffContainer.current
			?.querySelector(`[data-change-start="${changes[next]}"]`)
			?.scrollIntoView({ block: "center" });
	};
	const restore = async (hash: string, expectedVersion: number) => {
		const state = useDocumentsStore.getState();
		const current = state.documents.find((item) => item.id === documentId);
		if (
			!projectId ||
			!documentId ||
			state.projectId !== projectId ||
			!current ||
			current?.isDirty ||
			current?.saveConflict
		) {
			setRestoreError("当前文档有未保存修改，请先保存或处理冲突。");
			return false;
		}
		setRestoring(true);
		setRestoreError("");
		try {
			const saved = await restoreWorkspaceDocumentHistoryVersion(
				documentId,
				hash,
				projectId,
				expectedVersion,
			);
			if (useDocumentsStore.getState().projectId === projectId) {
				useDocumentsStore.getState().hydrateWorkspaceDocuments(saved.state);
				setReviewedVersion(saved.document.version);
			}
			await refreshHistory();
			toast.success("已恢复历史版本", { description: saved.document.title });
			return true;
		} catch (error) {
			setRestoreError(
				error && typeof error === "object" && "code" in error && error.code === 409
					? "文档已被修改，恢复未执行。请刷新文档页面并重新打开历史，确认最新版本后再恢复。"
					: historyErrorMessage(error),
			);
			return false;
		} finally {
			setRestoring(false);
		}
	};
	const confirmRestore = () => {
		if (!selectedHash || reviewedVersion === null || dirty || restoring) return;
		void confirmDialog({
			title: "恢复这个历史版本？",
			description: "将恢复所选版本的正文和元数据，并生成新版本。当前内容和已有历史仍会保留。",
			confirmLabel: "恢复",
			onConfirm: async () => {
				await restore(selectedHash, reviewedVersion);
			},
		});
	};
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-6xl">
				<SheetHeader className="shrink-0 border-b border-border px-4 py-3">
					<div className="flex min-w-0 items-center gap-2">
						<History className="size-4 shrink-0 text-muted-foreground" />
						<div className="min-w-0 flex-1">
							<SheetTitle>文档历史</SheetTitle>
							<SheetDescription className="break-words">
								{document?.title ?? "未选择文档"} · 当前基线 v{reviewedVersion ?? "-"}
							</SheetDescription>
						</div>
						<Button
							size="icon"
							variant="ghost"
							aria-label="刷新变更记录"
							title="刷新变更记录"
							onClick={() => {
								void refreshHistory();
								void refreshDiff();
							}}
						>
							<RefreshCw />
						</Button>
						<Button
							size="icon"
							variant="ghost"
							aria-label="关闭文档历史"
							title="关闭文档历史"
							onClick={() => onOpenChange(false)}
						>
							<X />
						</Button>
					</div>
				</SheetHeader>
				<div className="grid min-h-0 flex-1 grid-rows-[minmax(0,9rem)_minmax(0,1fr)] md:grid-cols-[15rem_minmax(0,1fr)] md:grid-rows-1">
					<div className="min-h-0 overflow-y-auto border-b border-border p-2 md:border-b-0 md:border-r">
						{loadingHistory ? (
							<Loading />
						) : historyError ? (
							<p role="alert" className="p-2 text-sm text-destructive">
								变更记录加载失败，请刷新重试。
							</p>
						) : !items.length ? (
							<p className="p-2 text-sm text-muted-foreground">暂无变更记录。</p>
						) : (
							items.map((item, index) => (
								<button
									key={item.hash}
									type="button"
									aria-pressed={item.hash === selectedHash}
									onClick={() => setSelectedHash(item.hash)}
									className={cn(
										"mb-1 block w-full rounded-sm border border-transparent px-3 py-2 text-left hover:bg-ide-list-hover",
										item.hash === selectedHash && "border-border bg-ide-list-hover",
									)}
								>
									<span className="block truncate text-sm font-medium">
										{index === 0 ? "当前版本" : historySummary(item)}
									</span>
									<span className="mt-1 block text-xs text-muted-foreground">
										{formatHistoryTime(item.createdAt)} · {shortHash(item.hash)}
									</span>
									<span className="block truncate text-xs text-muted-foreground">
										{item.source || item.operation || "文档更新"}
									</span>
								</button>
							))
						)}
					</div>
					<div className="flex min-h-0 min-w-0 flex-col">
						<div
							role="group"
							aria-label="历史比较版本"
							className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b border-border p-2"
						>
							<Select
								value={selectedHash ?? ""}
								onValueChange={setSelectedHash}
								disabled={
									loadingHistory ||
									refreshingHistory ||
									Boolean(historyError) ||
									!selectedItem ||
									restoring
								}
							>
								<SelectTrigger aria-label="选择历史版本">
									<SelectValue placeholder="选择历史版本" />
								</SelectTrigger>
								<SelectContent>
									{items.map((item, index) => (
										<SelectItem key={item.hash} value={item.hash}>
											{index === 0 ? "当前版本" : "历史版本"} {shortHash(item.hash)} ·{" "}
											{formatHistoryTime(item.createdAt)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<ArrowLeftRight aria-hidden="true" className="size-4 text-muted-foreground" />
							<span className="min-w-0 truncate text-xs text-muted-foreground" title={currentHash}>
								当前版本 {shortHash(currentHash ?? "")}
							</span>
						</div>
						<div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border p-2">
							<Tabs value={contentView} onValueChange={setContentView}>
								<TabsList aria-label="历史内容视图">
									<TabsTrigger value="diff">差异</TabsTrigger>
									<TabsTrigger value="reading">阅读视图</TabsTrigger>
									<TabsTrigger value="source">源文件</TabsTrigger>
								</TabsList>
							</Tabs>
							{!reading ? (
								<>
									<Tabs value={mode} onValueChange={setMode}>
										<TabsList aria-label="差异显示方式">
											<TabsTrigger value="parallel">并排</TabsTrigger>
											<TabsTrigger value="unified">合并</TabsTrigger>
										</TabsList>
									</Tabs>
									<div className="flex items-center gap-1">
										<Button
											size="icon"
											variant="ghost"
											aria-label="上一处变更"
											title="上一处变更"
											disabled={!changes.length || unavailable}
											onClick={() => navigateChange(-1)}
										>
											<ChevronLeft />
										</Button>
										<span className="min-w-12 text-center text-xs tabular-nums" aria-live="polite">
											{changeIndex + 1} / {changes.length}
										</span>
										<Button
											size="icon"
											variant="ghost"
											aria-label="下一处变更"
											title="下一处变更"
											disabled={!changes.length || unavailable}
											onClick={() => navigateChange(1)}
										>
											<ChevronRight />
										</Button>
									</div>
								</>
							) : null}
						</div>
						<div className="grid shrink-0 grid-cols-2 gap-2 border-b border-border px-3 py-2 text-xs text-muted-foreground">
							<span className="min-w-0 break-words">所选版本 {shortHash(selectedHash ?? "")}</span>
							{reading ? (
								<span className="min-w-0 break-words">{snapshot?.title}</span>
							) : (
								<span className="min-w-0 break-words">当前版本 {shortHash(currentHash ?? "")}</span>
							)}
						</div>
						{diff?.from &&
						(diff.from.title !== diff.to.title ||
							diff.from.category !== diff.to.category ||
							JSON.stringify(diff.from.tags ?? []) !== JSON.stringify(diff.to.tags ?? [])) ? (
							<p className="shrink-0 border-b border-warning-border bg-warning-surface p-2 text-xs text-warning-foreground">
								恢复会更新元数据：{diff.to.title} → {diff.from.title}（标题、分类、标签）
							</p>
						) : null}
						<div ref={diffContainer} className="min-h-0 flex-1 overflow-auto bg-ide-editor">
							{loadingDiff || refreshingDiff || refreshingHistory ? (
								<Loading />
							) : diffError || historyError ? (
								<p role="alert" className="p-4 text-sm text-destructive">
									版本差异加载失败，请刷新重试。
								</p>
							) : reading && snapshot ? (
								<DocumentHistorySnapshot
									key={`${projectId}:${documentId}:${snapshot.hash}`}
									version={snapshot}
									source={contentView === "source"}
								/>
							) : diff ? (
								<DocumentHistoryDiff lines={diff.lines} parallel={mode === "parallel"} />
							) : (
								<p className="p-4 text-sm text-muted-foreground">选择一个版本查看差异。</p>
							)}
						</div>
					</div>
				</div>
				<div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border p-3">
					<p
						role={restoreError ? "alert" : undefined}
						className={cn(
							"min-w-0 basis-full text-xs",
							restoreError || dirty ? "text-destructive" : "text-muted-foreground",
						)}
					>
						{restoreError ||
							(dirty
								? "当前文档有未保存修改，请先保存或处理冲突。"
								: "恢复后生成新版本，当前内容和已有历史仍会保留。")}
					</p>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						取消
					</Button>
					<Button
						disabled={
							!selectedItem ||
							selectedHash === currentHash ||
							reviewedVersion === null ||
							dirty ||
							restoring ||
							Boolean(diffError) ||
							Boolean(historyError) ||
							!diff ||
							loadingHistory ||
							loadingDiff ||
							refreshingHistory ||
							refreshingDiff
						}
						onClick={confirmRestore}
					>
						{restoring ? <Loader2 className="animate-spin" /> : <RotateCcw />}恢复所选版本
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	);
};

const Loading = () => (
	<div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
		<Loader2 className="size-4 animate-spin" />
		加载中
	</div>
);
const shortHash = (hash: string) => hash.slice(0, 7);
const historySummary = (item: DocumentHistoryItem) => item.summary || item.operation || "文档更新";
const formatHistoryTime = (value: string) => {
	const date = new Date(value);
	return Number.isNaN(date.getTime())
		? ""
		: new Intl.DateTimeFormat("zh-CN", {
				month: "2-digit",
				day: "2-digit",
				hour: "2-digit",
				minute: "2-digit",
			}).format(date);
};
const historyErrorMessage = (error: unknown) => {
	if (error && typeof error === "object" && "message" in error && typeof error.message === "string")
		return error.message;
	return "恢复失败，请稍后重试。";
};
