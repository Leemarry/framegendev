import { Clapperboard, FolderOpen, Loader2, Save } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import useSWR from "swr";
import {
	getJianyingDraftSettings,
	jianyingDraftSettingsKey,
	saveJianyingDraftSettings,
} from "@/domains/settings/api/settings";
import { ModelAccessPanel } from "@/domains/settings/components/model-access/ModelAccessPanel";
import { CodexSkillsPanel } from "@/domains/settings/components/CodexSkillsPanel";
import { ShortcutKeysPanel } from "@/domains/settings/components/ShortcutKeysPanel";
import { BillingPanel } from "@/domains/billing/components/BillingPanel";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { SettingsPanelLayout } from "@/domains/settings/components/SettingsPanelLayout";
import { useToast } from "@/hooks/useToast";
import { settingsInsetRowClassName } from "@/lib/settings-layout";
import { useSettingsNavigationStore } from "@/lib/stores/settings";
import { cn } from "@/shared/lib/utils";
import { DebugTabPanel, debugTabs, type DebugTabValue } from "@/pages/Debug";
import { ProjectSettings } from "@/pages/ProjectSettings";
import { getRouteProjectId } from "@/domains/workspace/lib/workbench-route";
import { isDesktopRuntime, openProjectDirectory } from "@/domains/projects/lib/project-directory";
import { pickDesktopDirectory } from "@/shared/desktop/actions";
import { UpdatesPanel } from "@/domains/settings/components/UpdatesPanel";
import { BasicSettingsPanel } from "@/domains/settings/components/BasicSettingsPanel";
import { AccountPanel } from "@/domains/settings/components/AccountPanel";
import { StoragePanel } from "@/domains/settings/components/StoragePanel";
import { PendingSettingsPanel } from "@/domains/settings/components/PendingSettingsPanel";
import {
	isPendingSettingsTab,
	type PendingSettingsTab,
} from "@/domains/settings/lib/settings-navigation";

const jianyingDraftSettingsEnabled: boolean = false;

type SettingsTabValue =
	| "model-access"
	| "appearance"
	| "account"
	| "storage"
	| "billing"
	| "codex-skills"
	| "jianying-draft"
	| "updates"
	| "shortcuts"
	| PendingSettingsTab
	| DebugTabValue;

const isSettingsTabValue = (value: string): value is SettingsTabValue =>
	value === "model-access" ||
	value === "appearance" ||
	value === "account" ||
	value === "storage" ||
	value === "billing" ||
	value === "codex-skills" ||
	value === "updates" ||
	(jianyingDraftSettingsEnabled && value === "jianying-draft") ||
	value === "shortcuts" ||
	isPendingSettingsTab(value) ||
	debugTabs.some((tab) => tab.value === value);

/** 历史 API 密钥 / Codex 接入入口统一归一到「模型接入」整合页。 */
const normalizeSettingsTab = (value: string) =>
	value === "codex-relay" || value === "codex-access" || value === "api-keys"
		? "model-access"
		: value === "agent-model-profiles"
			? "model-access"
			: value === "prompt-templates" || value === "instructions"
				? "instructions"
				: value === "prompts" || value === "skills" || value === "prompt-library"
					? "prompt-packs"
					: value;

export const Settings: React.FC = () => {
	const location = useLocation();
	const projectId = getRouteProjectId(location.search);
	const activeTab = useSettingsNavigationStore((state) => state.activeTab);
	const normalizedTab = normalizeSettingsTab(activeTab);
	const visibleTab = isSettingsTabValue(normalizedTab) ? normalizedTab : "appearance";

	if (projectId) return <ProjectSettings />;

	return (
		<div className="h-full min-h-0 overflow-hidden bg-ide-editor text-ide-editor-foreground">
			{visibleTab === "appearance" ? <BasicSettingsPanel /> : null}
			{visibleTab === "account" ? <AccountPanel /> : null}

			{jianyingDraftSettingsEnabled && visibleTab === "jianying-draft" ? (
				<JianyingDraftPanel />
			) : null}
			{visibleTab === "model-access" ? <ModelAccessPanel /> : null}
			{visibleTab === "billing" ? <BillingPanel /> : null}
			{visibleTab === "storage" ? <StoragePanel /> : null}
			{visibleTab === "codex-skills" ? <CodexSkillsPanel /> : null}
			{visibleTab === "updates" ? <UpdatesPanel /> : null}
			{visibleTab === "shortcuts" ? <ShortcutKeysPanel /> : null}
			{isPendingSettingsTab(visibleTab) ? <PendingSettingsPanel tab={visibleTab} /> : null}

			{debugTabs.map((tab) =>
				visibleTab === tab.value ? <DebugTabPanel key={tab.value} value={tab.value} /> : null,
			)}
		</div>
	);
};

const JianyingDraftPanel: React.FC = () => {
	const toast = useToast();
	const { data, mutate, isLoading } = useSWR(jianyingDraftSettingsKey, getJianyingDraftSettings);
	const [draftsRoot, setDraftsRoot] = useState("");
	const [isPicking, setIsPicking] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isOpening, setIsOpening] = useState(false);

	useEffect(() => {
		setDraftsRoot(data?.draftsRoot ?? "");
	}, [data?.draftsRoot]);

	const pickDirectory = async () => {
		if (isPicking) return;

		setIsPicking(true);
		try {
			const directory = isDesktopRuntime()
				? await pickDesktopDirectory("选择剪映草稿文件夹")
				: window.prompt("剪映草稿文件夹绝对路径", draftsRoot)?.trim();
			if (!directory) return;
			setDraftsRoot(directory);
		} catch (err) {
			const message = err instanceof Error ? err.message : "选择文件夹失败。";
			toast.error("选择失败", { description: message });
		} finally {
			setIsPicking(false);
		}
	};

	const save = async () => {
		if (isSaving) return;

		setIsSaving(true);
		try {
			const next = await saveJianyingDraftSettings(draftsRoot.trim());
			await mutate(next, false);
			toast.success(next.draftsRoot ? "剪映草稿目录已保存" : "剪映草稿目录已清除", {
				description: next.draftsRoot || undefined,
			});
		} catch (err) {
			const message = err instanceof Error ? err.message : "保存剪映草稿目录失败。";
			toast.error("保存失败", { description: message });
		} finally {
			setIsSaving(false);
		}
	};

	const openDirectory = async () => {
		const directory = draftsRoot.trim();
		if (!directory || isOpening) return;

		setIsOpening(true);
		try {
			await openProjectDirectory(directory);
		} catch (err) {
			const message = err instanceof Error ? err.message : "打开剪映草稿目录失败。";
			toast.error("打开失败", { description: message });
		} finally {
			setIsOpening(false);
		}
	};

	return (
		<SettingsPanelLayout
			title="剪映草稿"
			description="配置剪辑工作台导出剪映草稿时使用的本机目录。"
			icon={<Clapperboard className="size-4" />}
		>
			<div className="space-y-3">
				{isLoading && !data ? (
					<div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
						<Loader2 className="size-4 animate-spin" />
						<span>加载中</span>
					</div>
				) : null}
				<div
					className={cn(
						settingsInsetRowClassName,
						"grid gap-3 md:grid-cols-[minmax(var(--settings-label-column-min),var(--settings-label-column-max))_minmax(0,1fr)] md:items-start",
					)}
				>
					<div className="min-w-0">
						<Label htmlFor="jianying-drafts-root" className="text-sm font-medium text-foreground">
							草稿文件夹
						</Label>
						<p className="mt-1 text-xs leading-5 text-muted-foreground">
							{draftsRoot.trim() ? "剪映桌面端会在这里读取新草稿。" : "尚未设置草稿文件夹。"}
						</p>
					</div>
					<div className="min-w-0">
						<Input
							id="jianying-drafts-root"
							value={draftsRoot}
							onChange={(event) => setDraftsRoot(event.target.value)}
							placeholder="选择或输入剪映草稿文件夹"
							className="h-8 rounded-md font-mono text-xs text-foreground"
						/>
						<div className="mt-2 flex flex-wrap items-center gap-2">
							<Button
								type="button"
								variant="secondary"
								size="sm"
								onClick={() => void pickDirectory()}
								disabled={isPicking}
								className="rounded-md"
							>
								{isPicking ? <Loader2 className="animate-spin" /> : <FolderOpen />}
								<span>选择</span>
							</Button>
							<Button
								type="button"
								size="sm"
								onClick={() => void save()}
								disabled={isSaving || draftsRoot.trim() === (data?.draftsRoot ?? "")}
								className="rounded-md"
							>
								{isSaving ? <Loader2 className="animate-spin" /> : <Save />}
								<span>保存</span>
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => void openDirectory()}
								disabled={!draftsRoot.trim() || isOpening || !isDesktopRuntime()}
								className="rounded-md"
								title={
									isDesktopRuntime() ? "打开剪映草稿文件夹" : "当前运行环境不支持打开本地文件夹"
								}
							>
								{isOpening ? <Loader2 className="animate-spin" /> : <FolderOpen />}
								<span>打开</span>
							</Button>
						</div>
					</div>
				</div>
			</div>
		</SettingsPanelLayout>
	);
};
