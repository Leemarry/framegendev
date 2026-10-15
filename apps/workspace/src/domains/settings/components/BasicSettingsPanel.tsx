import {
	Check,
	FolderOpen,
	Loader2,
	Monitor,
	Moon,
	RefreshCw,
	SlidersHorizontal,
	Sun,
} from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { getProjects, projectsKey } from "@/domains/projects/api/projects";
import { Button } from "@/shared/components/ui/button";
import { Switch } from "@/shared/components/ui/switch";
import { openNativePath } from "@/shared/desktop/actions";
import { isDesktopRuntime } from "@/shared/desktop/runtime";
import { cn } from "@/shared/lib/utils";
import { useThemeStore, type ThemeMode } from "@/shared/stores/theme";
import { SettingsPanelLayout } from "./SettingsPanelLayout";

const themeOptions = [
	{ value: "light", label: "浅色", icon: Sun, description: "使用浅色外观。" },
	{ value: "dark", label: "深色", icon: Moon, description: "使用深色外观。" },
	{ value: "system", label: "跟随系统", icon: Monitor, description: "根据系统外观自动切换。" },
] satisfies Array<{ value: ThemeMode; label: string; icon: typeof Sun; description: string }>;

export function BasicSettingsPanel() {
	const mode = useThemeStore((state) => state.mode);
	const setMode = useThemeStore((state) => state.setMode);
	const { data, error, isLoading, mutate } = useSWR(projectsKey, getProjects);
	const [isOpening, setIsOpening] = useState(false);
	const [openError, setOpenError] = useState("");
	const workspaceDir = data?.workspaceDir?.trim() ?? "";
	const desktop = isDesktopRuntime();
	const openWorkspace = async () => {
		if (!workspaceDir || !desktop || isOpening) return;
		setOpenError("");
		setIsOpening(true);
		try {
			await openNativePath(workspaceDir);
		} catch (cause) {
			setOpenError(cause instanceof Error ? cause.message : "打开工作区目录失败。");
		} finally {
			setIsOpening(false);
		}
	};

	return (
		<SettingsPanelLayout title="基础设置" icon={<SlidersHorizontal className="size-4" />}>
			<div className="max-w-3xl space-y-8">
				<section className="space-y-4" aria-labelledby="basic-appearance-heading">
					<h3 id="basic-appearance-heading" className="text-sm font-semibold">
						外观与语言
					</h3>
					<fieldset className="min-w-0 space-y-3">
						<legend className="mb-3 text-sm font-medium">外观</legend>
						<div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
							{themeOptions.map((option) => (
								<label
									key={option.value}
									className={cn(
										"relative min-w-0 cursor-pointer overflow-hidden rounded-md border bg-ide-sidebar has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
										mode === option.value ? "border-primary ring-1 ring-primary" : "border-border",
									)}
								>
									<input
										type="radio"
										name="theme-mode"
										value={option.value}
										checked={mode === option.value}
										onChange={() => setMode(option.value)}
										className="sr-only"
									/>
									<ThemePreview mode={option.value} />
									<span className="flex min-h-10 items-center gap-2 px-3 text-xs font-medium">
										<option.icon className="size-3.5 shrink-0 text-muted-foreground" />
										<span className="min-w-0 flex-1">{option.label}</span>
										<Check
											aria-hidden
											className={cn(
												"size-3.5 shrink-0 text-primary",
												mode !== option.value && "invisible",
											)}
										/>
									</span>
								</label>
							))}
						</div>
						<p className="text-xs text-muted-foreground">
							{themeOptions.find((option) => option.value === mode)?.description}
						</p>
					</fieldset>
					<div className="flex flex-wrap items-center justify-between gap-3 pt-2">
						<div className="min-w-0 space-y-1">
							<label htmlFor="basic-language" className="text-sm font-medium">
								语言
							</label>
							<p className="text-xs text-muted-foreground">
								【待开发】当前仅支持简体中文，尚未接入多语言资源。
							</p>
						</div>
						<select
							id="basic-language"
							disabled
							className="h-8 max-w-full rounded-md border border-input bg-background px-3 text-xs text-muted-foreground"
						>
							<option>简体中文</option>
						</select>
					</div>
				</section>
				<section className="space-y-4" aria-labelledby="basic-workspace-heading">
					<h3 id="basic-workspace-heading" className="text-sm font-semibold">
						工作区
					</h3>
					<div className="flex flex-wrap items-center gap-3 rounded-md bg-ide-sidebar p-4">
						<FolderOpen className="size-5 shrink-0 text-primary" />
						<div className="min-w-0 flex-1 basis-40 space-y-1">
							<p className="text-sm font-medium">工作区目录</p>
							<p className="break-all font-mono text-xs leading-5 text-muted-foreground">
								{workspaceDir || (isLoading ? "正在读取工作区目录…" : "工作区目录不可用")}
							</p>
						</div>
						<Button
							variant="secondary"
							size="sm"
							disabled={!desktop || !workspaceDir || isOpening}
							onClick={() => void openWorkspace()}
							title={desktop ? "打开工作区目录" : "当前运行环境不支持打开本地文件夹"}
						>
							{isOpening ? <Loader2 className="animate-spin" /> : <FolderOpen />}
							打开
						</Button>
					</div>
					{error ? (
						<div
							role="alert"
							className="flex flex-wrap items-center gap-2 text-xs text-error-foreground"
						>
							<span>读取工作区目录失败。{error instanceof Error ? error.message : "请重试。"}</span>
							<Button variant="outline" size="sm" onClick={() => void mutate()}>
								<RefreshCw />
								重试
							</Button>
						</div>
					) : null}
					{openError ? (
						<p role="alert" className="break-words text-xs text-error-foreground">
							{openError}
						</p>
					) : null}
				</section>
				<section className="space-y-4" aria-labelledby="basic-preferences-heading">
					<h3 id="basic-preferences-heading" className="text-sm font-semibold">
						使用偏好
					</h3>
					<div className="divide-y divide-border">
						<PendingPreference
							name="匿名使用数据"
							reason="【待接入】当前未接入匿名统计服务，不发送使用数据。"
						/>
						<PendingPreference
							name="调试模式"
							reason="【待开发】测试服务配置与桌面能力检查尚未实现。"
						/>
					</div>
				</section>
			</div>
		</SettingsPanelLayout>
	);
}

function PendingPreference({ name, reason }: { name: string; reason: string }) {
	return (
		<label className="flex items-start justify-between gap-4 py-4 first:pt-0">
			<span className="min-w-0 space-y-2">
				<span className="block text-sm font-medium">{name}</span>
				<span className="block text-xs leading-5 text-muted-foreground">{reason}</span>
			</span>
			<Switch aria-label={name} disabled checked={false} className="mt-1" />
		</label>
	);
}

function ThemePreview({ mode }: { mode: ThemeMode }) {
	return (
		<span aria-hidden className="flex h-20 overflow-hidden">
			{(mode === "system" ? ["light", "dark"] : [mode]).map((appearance) => (
				<span
					key={appearance}
					className="flex min-w-0 flex-1 gap-2 p-3"
					style={{ background: appearance === "light" ? "var(--slate-0)" : "var(--slate-900)" }}
				>
					<span
						className="flex w-1/3 shrink-0 flex-col gap-1.5 rounded p-1.5"
						style={{ background: appearance === "light" ? "var(--slate-100)" : "var(--slate-800)" }}
					>
						<span className="h-1 w-4/5 rounded-sm bg-primary" />
						<span className="h-1 rounded-sm bg-muted-foreground/30" />
						<span className="h-1 w-2/3 rounded-sm bg-muted-foreground/30" />
					</span>
					<span className="min-w-0 flex-1 space-y-2">
						<span className="block h-1 w-4/5 rounded-sm bg-muted-foreground/30" />
						<span className="block h-8 rounded bg-muted-foreground/15" />
					</span>
				</span>
			))}
		</span>
	);
}
