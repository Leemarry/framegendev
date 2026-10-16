import { HardDrive, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/shared/components/ui/button";
import { getDesktopCacheStatistics } from "@/shared/desktop/actions";
import { isDesktopRuntime } from "@/shared/desktop/runtime";
import {
	cleanupPosterCache,
	getStorageSnapshot,
	previewPosterCacheCleanup,
	type PosterCleanupResult,
} from "../api/storage";
import { SettingsPanelLayout } from "./SettingsPanelLayout";

const categoryLabels: Record<string, string> = {
	projects: "已登记项目",
	"media-library": "全局素材库",
	"application-metadata": "应用元数据",
	"poster-cache": "视频海报缓存",
};

export function StoragePanel() {
	const desktop = isDesktopRuntime();
	const cache = useSWR(desktop ? "desktop:cache-statistics" : null, getDesktopCacheStatistics, {
		revalidateOnFocus: false,
		shouldRetryOnError: false,
	});
	const statistics = useSWR("storage:statistics", getStorageSnapshot, {
		revalidateOnFocus: false,
		shouldRetryOnError: false,
	});
	const [previewRequested, setPreviewRequested] = useState(false);
	const preview = useSWR(
		desktop && previewRequested ? "storage:poster-cache-preview" : null,
		previewPosterCacheCleanup,
		{ revalidateOnFocus: false, shouldRetryOnError: false },
	);
	const [cleanupResult, setCleanupResult] = useState<PosterCleanupResult>();
	const [cleanupError, setCleanupError] = useState<string>();
	const [cleaning, setCleaning] = useState(false);

	const runCleanup = async () => {
		const data = preview.data;
		if (!data?.candidates.length) return;
		const count = data.candidates.length;
		if (
			!window.confirm(
				`将清理 ${count} 个生成的海报缓存文件，共 ${data.bytes.toLocaleString()} 字节。继续？`,
			)
		) {
			return;
		}
		setCleaning(true);
		setCleanupError(undefined);
		try {
			const result = await cleanupPosterCache(data.candidates.map((candidate) => candidate.id));
			setCleanupResult(result);
			void statistics.mutate();
			void preview.mutate();
		} catch (error) {
			setCleanupError(errorMessage(error));
		} finally {
			setCleaning(false);
		}
	};

	return (
		<SettingsPanelLayout title="存储管理" icon={<HardDrive className="size-4" />}>
			<div className="max-w-3xl space-y-6">
				<section
					className="space-y-4"
					aria-labelledby="storage-cache-heading"
					aria-busy={cache.isValidating}
				>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<h3 id="storage-cache-heading" className="text-sm font-semibold">
							浏览器缓存
						</h3>
						<Button
							variant="outline"
							size="sm"
							disabled={!desktop || cache.isValidating}
							onClick={() => void cache.mutate()}
						>
							<RefreshCw className={cache.isValidating ? "animate-spin" : undefined} />
							{cache.error ? "重试" : "刷新"}
						</Button>
					</div>
					<p className="text-xs leading-5 text-muted-foreground">
						当前桌面会话的 Chromium HTTP 缓存，不含项目文件及完整配置目录占用。
					</p>
					{!desktop ? (
						<p role="status" className="text-sm text-muted-foreground">
							当前运行环境不支持桌面缓存统计，请在桌面客户端查看。
						</p>
					) : null}
					{desktop && !cache.data && cache.isValidating ? (
						<p role="status" className="text-sm text-muted-foreground">
							正在读取缓存占用…
						</p>
					) : null}
					{cache.error ? (
						<p role="alert" className="break-words text-xs leading-5 text-error-foreground">
							读取缓存占用失败。{errorMessage(cache.error)}
							{cache.data ? " 下方为上次读数，可能已过期。" : ""}
						</p>
					) : null}
					{cache.data ? (
						<dl className="space-y-3 text-sm">
							<div>
								<dt className="text-xs text-muted-foreground">缓存占用</dt>
								<dd className="mt-1 font-semibold">
									{formatBytes(cache.data.cacheBytes)} ({cache.data.cacheBytes.toLocaleString()}{" "}
									字节)
								</dd>
							</div>
							<div>
								<dt className="text-xs text-muted-foreground">配置目录</dt>
								<dd className="mt-1 break-all">{cache.data.profilePath}</dd>
							</div>
							<div>
								<dt className="text-xs text-muted-foreground">统计时间</dt>
								<dd className="mt-1">{new Date(cache.data.measuredAt).toLocaleString()}</dd>
							</div>
						</dl>
					) : null}
				</section>

				<section
					className="space-y-4 border-t border-border pt-5"
					aria-labelledby="storage-workspace-heading"
					aria-busy={statistics.isValidating}
				>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<h3 id="storage-workspace-heading" className="text-sm font-semibold">
							工作区存储
						</h3>
						<Button
							variant="outline"
							size="sm"
							disabled={statistics.isValidating}
							onClick={() => void statistics.mutate()}
						>
							<RefreshCw className={statistics.isValidating ? "animate-spin" : undefined} />
							{statistics.error ? "重试" : "扫描"}
						</Button>
					</div>
					{statistics.error ? (
						<p role="alert" className="break-words text-xs leading-5 text-error-foreground">
							读取分类占用失败。{errorMessage(statistics.error)}
							{statistics.data ? " 上次读数可能已过期。" : ""}
						</p>
					) : null}
					{!statistics.data && statistics.isValidating ? (
						<p role="status" className="text-sm text-muted-foreground">
							正在扫描已知存储目录…
						</p>
					) : null}
					{statistics.data ? (
						<>
							<dl className="space-y-3 text-sm">
								<div>
									<dt className="text-xs text-muted-foreground">已分类占用</dt>
									<dd className="mt-1 font-semibold">
										{formatBytes(statistics.data.bytes)} ({statistics.data.bytes.toLocaleString()}{" "}
										字节)
									</dd>
								</div>
								{statistics.data.categories.map((category) => (
									<div key={category.id} className="border-t border-border pt-3">
										<dt className="font-medium">{categoryLabels[category.id] ?? category.id}</dt>
										<dd className="mt-1 text-muted-foreground">
											{formatBytes(category.bytes)} · {category.fileCount.toLocaleString()} 个文件
										</dd>
										{category.skippedCount || category.unknownCount || category.errorCount ? (
											<dd className="mt-1 text-xs text-warning-foreground">
												跳过 {category.skippedCount} · 未分类 {category.unknownCount} · 失败{" "}
												{category.errorCount}
											</dd>
										) : null}
									</div>
								))}
							</dl>
							<p className="text-xs text-muted-foreground">
								统计于 {new Date(statistics.data.measuredAt).toLocaleString()} · 共{" "}
								{statistics.data.fileCount.toLocaleString()} 个文件；跳过{" "}
								{statistics.data.skippedCount}，未分类 {statistics.data.unknownCount}，失败{" "}
								{statistics.data.errorCount}
							</p>
						</>
					) : null}
				</section>

				<section
					className="space-y-4 border-t border-border pt-5"
					aria-labelledby="poster-cleanup-heading"
				>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<h3 id="poster-cleanup-heading" className="text-sm font-semibold">
							生成的海报缓存
						</h3>
						{desktop ? (
							<Button
								variant="outline"
								size="sm"
								disabled={preview.isValidating || cleaning}
								onClick={() => {
									setCleanupResult(undefined);
									setCleanupError(undefined);
									if (previewRequested) void preview.mutate();
									else setPreviewRequested(true);
								}}
							>
								<RefreshCw className={preview.isValidating ? "animate-spin" : undefined} />
								{preview.error ? "重试预览" : "预览清理"}
							</Button>
						) : null}
					</div>
					{!desktop ? (
						<p className="text-xs leading-5 text-muted-foreground">文件清理仅在桌面客户端提供。</p>
					) : null}
					{preview.error ? (
						<p role="alert" className="break-words text-xs leading-5 text-error-foreground">
							海报缓存预览失败。{errorMessage(preview.error)}
						</p>
					) : null}
					{cleanupError ? (
						<p role="alert" className="break-words text-xs leading-5 text-error-foreground">
							清理请求失败。{cleanupError}
						</p>
					) : null}
					{desktop && preview.isValidating && !preview.data ? (
						<p role="status" className="text-sm text-muted-foreground">
							正在检查海报缓存…
						</p>
					) : null}
					{desktop && preview.data ? (
						<>
							<p className="text-sm text-muted-foreground">
								预览发现 {preview.data.candidates.length} 个文件，共{" "}
								{preview.data.bytes.toLocaleString()} 字节。
							</p>
							{preview.data.candidates.length ? (
								<ul className="max-h-56 divide-y divide-border overflow-auto border-y border-border">
									{preview.data.candidates.map((candidate) => (
										<li
											key={candidate.id}
											className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
										>
											<span className="min-w-0 break-all">
												{candidate.name}
												{candidate.active ? " · 正在使用" : ""}
											</span>
											<span className="shrink-0 text-muted-foreground">
												{formatBytes(candidate.bytes)}
											</span>
										</li>
									))}
								</ul>
							) : null}
							{preview.data.candidates.length ? (
								<Button
									variant="destructive"
									size="sm"
									disabled={cleaning}
									onClick={() => void runCleanup()}
								>
									<Trash2 />
									{cleaning ? "正在清理…" : "确认清理"}
								</Button>
							) : null}
						</>
					) : null}
					{cleanupResult ? <CleanupFeedback result={cleanupResult} /> : null}
				</section>
			</div>
		</SettingsPanelLayout>
	);
}

function CleanupFeedback({ result }: { result: PosterCleanupResult }) {
	return (
		<div role="status" className="space-y-2 text-sm">
			<p>
				已删除 {result.removed} 个文件，释放 {result.bytes.toLocaleString()} 字节；跳过{" "}
				{result.skipped}，失败 {result.failed}。
			</p>
			{result.outcomes.some((outcome) => outcome.status !== "removed") ? (
				<ul className="divide-y divide-border border-y border-border text-xs">
					{result.outcomes
						.filter((outcome) => outcome.status !== "removed")
						.map((outcome) => (
							<li key={`${outcome.id}:${outcome.status}`} className="py-2">
								{outcome.name || "预览候选"}：{outcome.status === "skipped" ? "已保留" : "清理失败"}
								（{outcome.reason ?? "未知原因"}）
							</li>
						))}
				</ul>
			) : null}
		</div>
	);
}

function errorMessage(error: unknown) {
	if (error instanceof Error) return error.message;
	if (typeof error === "object" && error && "message" in error) return String(error.message);
	return "请重试。";
}

function formatBytes(bytes: number) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}
