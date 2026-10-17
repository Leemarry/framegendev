import {
	Check,
	ChevronRight,
	ChevronUp,
	CircleHelp,
	Languages,
	Megaphone,
	MessageSquareText,
	Moon,
	PackageOpen,
	Settings,
	UserRound,
	Zap,
} from "lucide-react";
import { DropdownMenu as Menu } from "radix-ui";
import { useState, useSyncExternalStore } from "react";
import { useToast } from "@/hooks/useToast";
import { DropdownMenuContent, DropdownMenuItem } from "@/shared/components/ui/dropdown-menu";
import { openExternalUrl } from "@/shared/desktop/actions";
import { cn } from "@/shared/lib/utils";
import { resolveThemeMode, useThemeStore } from "@/shared/stores/theme";

const subscribeSystemTheme = (onChange: () => void) => {
	const query = window.matchMedia?.("(prefers-color-scheme: dark)");
	query?.addEventListener("change", onChange);
	return () => query?.removeEventListener("change", onChange);
};
const systemIsDark = () => resolveThemeMode("system") === "dark";
const repositoryUrl = "https://github.com/mediago-dev/mediago-drama";
const displayName = "未登录";

const subItemClassName =
	"relative flex cursor-pointer select-none items-center gap-2 rounded-control px-2 py-1.5 text-xs outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50";

/** SidebarUserAvatar renders the signed-out account glyph used by the sidebar and menu. */
const SidebarUserAvatar = ({ compact = false }: { compact?: boolean }) => (
	<span
		aria-hidden="true"
		className={cn(
			"flex shrink-0 items-center justify-center",
			compact ? "w-3.5 overflow-visible" : "size-7",
		)}
	>
		<span
			className={cn(
				"flex shrink-0 items-center justify-center text-xs font-semibold text-primary",
				compact ? "size-3.5" : "size-7",
			)}
		>
			<UserRound className="size-3.5" />
		</span>
	</span>
);

/** WorkspaceUserMenu is the sidebar account menu (official 0.1.17 layout; commerce pending). */
export const WorkspaceUserMenu = ({
	className,
	onOpenSettings,
	onOpenSkills,
	settingsActive = false,
}: {
	className?: string;
	onOpenSettings: () => void;
	onOpenSkills: () => void;
	settingsActive?: boolean;
}) => {
	const [open, setOpen] = useState(false);
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
		<Menu.Root open={open} onOpenChange={setOpen}>
			<Menu.Trigger asChild>
				<button
					type="button"
					aria-label={`用户菜单：${displayName}`}
					className={cn(
						"group relative flex h-10 min-w-0 cursor-pointer items-center gap-2 rounded-sm px-1.5 text-left transition-colors hover:bg-ide-list-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
						settingsActive && "bg-ide-list-active hover:bg-ide-list-active-hover",
						className,
					)}
				>
					<SidebarUserAvatar />
					<span className="min-w-0 flex-1">
						<span className="block truncate text-xs font-medium text-foreground">
							{displayName}
						</span>
					</span>
					<ChevronUp className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
				</button>
			</Menu.Trigger>
			<DropdownMenuContent side="top" align="start" sideOffset={8} className="w-64">
				<div
					data-testid="sidebar-user-identity"
					className="flex items-center justify-between gap-3 px-2 py-1.5"
				>
					<div className="flex min-w-0 items-center gap-2">
						<SidebarUserAvatar compact />
						<div className="min-w-0">
							<p className="block truncate text-xs font-normal text-foreground">{displayName}</p>
							<p className="mt-0.5 truncate text-2xs text-muted-foreground">本地使用</p>
						</div>
					</div>
					<span className="h-6 shrink-0 rounded-full bg-surface-interactive px-2 py-0.5 text-xs font-normal text-muted-foreground">
						待接入
					</span>
				</div>
				<DropdownMenuItem aria-label="积分 待接入，查看账户" disabled>
					<Zap className="size-3.5" />
					<span className="min-w-0 flex-1 truncate">积分</span>
					<span className="text-xs font-normal text-muted-foreground">待接入</span>
					<ChevronRight className="size-3.5 text-muted-foreground" />
				</DropdownMenuItem>
				<Menu.Separator className="-mx-1 my-1 h-px bg-border" />
				<DropdownMenuItem className="cursor-pointer" onSelect={onOpenSkills}>
					<PackageOpen className="size-3.5" />
					<span className="min-w-0 flex-1">技能包管理</span>
				</DropdownMenuItem>
				<Menu.CheckboxItem
					className={subItemClassName}
					checked={dark}
					onCheckedChange={(checked) => setMode(checked ? "dark" : "light")}
					onSelect={(event) => event.preventDefault()}
				>
					<Moon className="size-3.5" />
					<span className="min-w-0 flex-1">深色模式</span>
					<span
						aria-hidden="true"
						className={cn(
							"flex h-3.5 w-6 shrink-0 items-center rounded-full bg-input p-px transition-colors",
							dark && "bg-primary",
						)}
					>
						<span
							className={cn(
								"size-3 rounded-full bg-background shadow-xs transition-transform",
								dark && "translate-x-2.5 bg-primary-foreground",
							)}
						/>
					</span>
				</Menu.CheckboxItem>
				<Menu.Sub>
					<Menu.SubTrigger className={subItemClassName}>
						<Languages className="size-3.5" />
						<span className="min-w-0 flex-1">语言</span>
						<span className="text-muted-foreground">中文</span>
						<ChevronRight className="size-3.5 text-muted-foreground" />
					</Menu.SubTrigger>
					<Menu.Portal>
						<Menu.SubContent
							sideOffset={8}
							collisionPadding={10}
							className="z-[80] w-40 overflow-hidden rounded-sm border border-border bg-popover p-1 text-popover-foreground shadow-md"
						>
							<Menu.RadioGroup value="zh-CN">
								<Menu.Item className={subItemClassName} disabled>
									<span className="min-w-0 flex-1">跟随系统</span>
									<span className="text-2xs text-muted-foreground">待接入</span>
								</Menu.Item>
								<Menu.RadioItem
									value="zh-CN"
									className={subItemClassName}
									onSelect={(event) => event.preventDefault()}
								>
									<span className="min-w-0 flex-1">中文</span>
									<Menu.ItemIndicator>
										<Check className="size-3.5" />
									</Menu.ItemIndicator>
								</Menu.RadioItem>
								<Menu.Item className={subItemClassName} disabled>
									<span className="min-w-0 flex-1">English</span>
									<span className="text-2xs text-muted-foreground">待接入</span>
								</Menu.Item>
							</Menu.RadioGroup>
						</Menu.SubContent>
					</Menu.Portal>
				</Menu.Sub>
				<DropdownMenuItem className="cursor-pointer" onSelect={onOpenSettings}>
					<Settings className="size-3.5" />
					<span className="min-w-0 flex-1">软件设置</span>
				</DropdownMenuItem>
				<Menu.Separator className="-mx-1 my-1 h-px bg-border" />
				<DropdownMenuItem disabled>
					<Megaphone className="size-3.5" />
					<span className="min-w-0 flex-1">系统公告</span>
					<span className="text-xs text-muted-foreground">暂无</span>
				</DropdownMenuItem>
				<DropdownMenuItem
					className="cursor-pointer"
					onSelect={() => void openLink(`${repositoryUrl}/issues`)}
				>
					<MessageSquareText className="size-3.5" />
					<span>反馈</span>
				</DropdownMenuItem>
				<DropdownMenuItem className="cursor-pointer" onSelect={() => void openLink(repositoryUrl)}>
					<CircleHelp className="size-3.5" />
					<span>帮助</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</Menu.Root>
	);
};
