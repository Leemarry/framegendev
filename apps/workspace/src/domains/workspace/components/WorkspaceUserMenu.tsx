import {
	Check,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronUp,
	CircleHelp,
	Languages,
	Megaphone,
	MessageSquare,
	Moon,
	PackageOpen,
	Settings,
	Zap,
} from "lucide-react";
import { DropdownMenu as Menu } from "radix-ui";
import { useRef, useState, useSyncExternalStore } from "react";
import { useToast } from "@/hooks/useToast";
import { DropdownMenuContent } from "@/shared/components/ui/dropdown-menu";
import { openExternalUrl } from "@/shared/desktop/actions";
import { resolveThemeMode, useThemeStore } from "@/shared/stores/theme";

const subscribeSystemTheme = (onChange: () => void) => {
	const query = window.matchMedia?.("(prefers-color-scheme: dark)");
	query?.addEventListener("change", onChange);
	return () => query?.removeEventListener("change", onChange);
};
const systemIsDark = () => resolveThemeMode("system") === "dark";
const subscribeCompactMenu = (onChange: () => void) => {
	const query = window.matchMedia?.("(max-width: 700px)");
	query?.addEventListener("change", onChange);
	return () => query?.removeEventListener("change", onChange);
};
const menuIsCompact = () => window.matchMedia?.("(max-width: 700px)").matches ?? false;
const repositoryUrl = "https://github.com/mediago-dev/mediago-drama";

const LanguageChoices = () => (
	<>
		<Menu.RadioGroup value="zh-CN">
			<Menu.RadioItem
				value="zh-CN"
				className="workspace-user-menu-row"
				onSelect={(event) => event.preventDefault()}
			>
				<Check />
				简体中文
			</Menu.RadioItem>
		</Menu.RadioGroup>
		<Menu.Item className="workspace-user-menu-row" disabled>
			跟随系统 <span className="workspace-user-menu-value">待接入</span>
		</Menu.Item>
		<Menu.Item className="workspace-user-menu-row" disabled>
			English <span className="workspace-user-menu-value">待接入</span>
		</Menu.Item>
	</>
);

export const WorkspaceUserMenu = ({
	onOpenSettings,
	onOpenSkills,
}: {
	onOpenSettings: () => void;
	onOpenSkills: () => void;
}) => {
	const [open, setOpen] = useState(false);
	const [languageOpen, setLanguageOpen] = useState(false);
	const languageTriggerRef = useRef<HTMLDivElement>(null);
	const compact = useSyncExternalStore(subscribeCompactMenu, menuIsCompact);
	const mode = useThemeStore((state) => state.mode);
	const setMode = useThemeStore((state) => state.setMode);
	const systemDark = useSyncExternalStore(subscribeSystemTheme, systemIsDark);
	const dark = mode === "system" ? systemDark : mode === "dark";
	const toast = useToast();
	const openLink = async (url: string) => {
		try {
			await openExternalUrl(url);
		} catch {
			toast.error("无法打开链接", { description: url });
		}
	};

	return (
		<Menu.Root
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (!next) setLanguageOpen(false);
			}}
		>
			<Menu.Trigger asChild>
				<button
					type="button"
					className="projects-root-user-trigger"
					aria-label="本地用户菜单"
					title="本地用户菜单"
				>
					<img src="/icon.png" alt="" />
					<span>本地用户</span>
					{open ? <ChevronDown /> : <ChevronUp />}
				</button>
			</Menu.Trigger>
			<DropdownMenuContent
				side="top"
				align="start"
				alignOffset={-8}
				sideOffset={22}
				collisionPadding={10}
				className="workspace-user-menu overflow-y-auto rounded-lg p-1.5"
			>
				{compact && languageOpen ? (
					<>
						<Menu.Item
							className="workspace-user-menu-row"
							ref={(node) => node?.focus()}
							onSelect={(event) => {
								event.preventDefault();
								setLanguageOpen(false);
								requestAnimationFrame(() => languageTriggerRef.current?.focus());
							}}
						>
							<ChevronLeft />
							返回用户菜单
						</Menu.Item>
						<Menu.Separator className="workspace-user-menu-separator" />
						<LanguageChoices />
					</>
				) : (
					<>
						<div className="workspace-user-menu-identity">
							<img src="/icon.png" alt="" />
							<div>
								<strong>本地用户</strong>
								<span>本地工作区</span>
							</div>
							<span className="workspace-user-menu-badge">本地用户</span>
						</div>
						<Menu.Item className="workspace-user-menu-row" aria-label="积分 待接入" disabled>
							<Zap />
							<span>积分</span>
							<span className="workspace-user-menu-value">待接入</span>
							<ChevronRight />
						</Menu.Item>
						<Menu.Separator className="workspace-user-menu-separator" />
						<Menu.Item className="workspace-user-menu-row" onSelect={onOpenSkills}>
							<PackageOpen />
							<span>技能包管理</span>
						</Menu.Item>
						<Menu.CheckboxItem
							className="workspace-user-menu-row"
							checked={dark}
							onCheckedChange={(checked) => setMode(checked ? "dark" : "light")}
							onSelect={(event) => event.preventDefault()}
						>
							<Moon />
							<span>深色模式</span>
							<span className="workspace-user-menu-switch" aria-hidden="true">
								<span />
							</span>
						</Menu.CheckboxItem>
						{compact ? (
							<Menu.Item
								className="workspace-user-menu-row"
								aria-label="语言 简体中文"
								ref={languageTriggerRef}
								onSelect={(event) => {
									event.preventDefault();
									setLanguageOpen(true);
								}}
							>
								<Languages />
								<span>语言</span>
								<span className="workspace-user-menu-value">简体中文</span>
								<ChevronRight />
							</Menu.Item>
						) : (
							<Menu.Sub>
								<Menu.SubTrigger className="workspace-user-menu-row" aria-label="语言 简体中文">
									<Languages />
									<span>语言</span>
									<span className="workspace-user-menu-value">简体中文</span>
									<ChevronRight />
								</Menu.SubTrigger>
								<Menu.Portal>
									<Menu.SubContent
										className="workspace-user-language-menu"
										sideOffset={8}
										collisionPadding={10}
									>
										<LanguageChoices />
									</Menu.SubContent>
								</Menu.Portal>
							</Menu.Sub>
						)}
						<Menu.Item className="workspace-user-menu-row" onSelect={onOpenSettings}>
							<Settings />
							<span>软件设置</span>
						</Menu.Item>
						<Menu.Separator className="workspace-user-menu-separator" />
						<Menu.Item className="workspace-user-menu-row" aria-label="系统公告 待接入" disabled>
							<Megaphone />
							<span>系统公告</span>
							<span className="workspace-user-menu-value">待接入</span>
						</Menu.Item>
						<Menu.Item
							className="workspace-user-menu-row"
							onSelect={() => void openLink(`${repositoryUrl}/issues`)}
						>
							<MessageSquare />
							<span>反馈</span>
						</Menu.Item>
						<Menu.Item
							className="workspace-user-menu-row"
							onSelect={() => void openLink(repositoryUrl)}
						>
							<CircleHelp />
							<span>帮助</span>
						</Menu.Item>
					</>
				)}
			</DropdownMenuContent>
		</Menu.Root>
	);
};
