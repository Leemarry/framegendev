import { HardDrive, RefreshCw } from "lucide-react";
import useSWR from "swr";
import { Button } from "@/shared/components/ui/button";
import { getDesktopCacheStatistics } from "@/shared/desktop/actions";
import { isDesktopRuntime } from "@/shared/desktop/runtime";
import { SettingsPanelLayout } from "./SettingsPanelLayout";

export function StoragePanel() {
	const desktop = isDesktopRuntime();
	const { data, error, isValidating, mutate } = useSWR(
		desktop ? "desktop:cache-statistics" : null,
		getDesktopCacheStatistics,
		{ revalidateOnFocus: false, shouldRetryOnError: false },
	);
	return (
		<SettingsPanelLayout title="存储管理" icon={<HardDrive className="size-4" />}>
			<div className="max-w-3xl space-y-6">
				<section
					className="space-y-4"
					aria-labelledby="storage-cache-heading"
					aria-busy={isValidating}
				>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<h3 id="storage-cache-heading" className="text-sm font-semibold">
							浏览器缓存
						</h3>
						<Button
							variant="outline"
							size="sm"
							disabled={!desktop || isValidating}
							onClick={() => void mutate()}
						>
							<RefreshCw className={isValidating ? "animate-spin" : undefined} />
							{error ? "重试" : "刷新"}
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
					{desktop && !data && isValidating ? (
						<p role="status" className="text-sm text-muted-foreground">
							正在读取缓存占用…
						</p>
					) : null}
					{error ? (
						<p role="alert" className="break-words text-xs leading-5 text-error-foreground">
							读取缓存占用失败。{error instanceof Error ? error.message : "请重试。"}
							{data ? " 下方为上次读数，可能已过期。" : ""}
						</p>
					) : null}
					{data ? (
						<dl className="space-y-4 text-sm">
							<div>
								<dt className="text-xs text-muted-foreground">缓存占用</dt>
								<dd className="mt-1 font-semibold">
									{formatBytes(data.cacheBytes)}{" "}
									<span className="font-normal text-muted-foreground">
										({data.cacheBytes.toLocaleString()} 字节)
									</span>
								</dd>
							</div>
							<div>
								<dt className="text-xs text-muted-foreground">配置目录</dt>
								<dd className="mt-1 break-all">{data.profilePath}</dd>
							</div>
							<div>
								<dt className="text-xs text-muted-foreground">统计时间</dt>
								<dd className="mt-1">{new Date(data.measuredAt).toLocaleString()}</dd>
							</div>
						</dl>
					) : null}
				</section>
				<section
					className="space-y-3 border-t border-border pt-5"
					aria-labelledby="storage-workspace-heading"
				>
					<h3 id="storage-workspace-heading" className="text-sm font-semibold">
						工作区存储
					</h3>
					<p className="text-xs leading-5 text-muted-foreground">
						【待开发】TASK-100：项目、素材及临时文件的分类统计、预算与安全清理尚待实现，需先核实文件引用及使用状态。
					</p>
				</section>
			</div>
		</SettingsPanelLayout>
	);
}

function formatBytes(bytes: number) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}
