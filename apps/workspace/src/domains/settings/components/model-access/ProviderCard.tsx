import {
	Check,
	Ellipsis,
	ExternalLink,
	Loader2,
	LogIn,
	LogOut,
	Settings2,
	Trash2,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import type { APIKeyLoginChallenge, APIKeyProvider } from "@/domains/settings/api/settings";
import { Button } from "@/shared/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { cn } from "@/shared/lib/utils";

export interface ProviderCardProps {
	provider: APIKeyProvider;
	icon: React.ComponentType<{ className?: string }>;
	hint?: string;
	loginChallenge?: APIKeyLoginChallenge;
	isSaving?: boolean;
	isClearing?: boolean;
	isLoggingIn?: boolean;
	isCheckingLogin?: boolean;
	onLogin: () => void;
	onConfirmLogin: () => void;
	onOpenLogin: () => void;
	onClear: () => void;
	onConfigure: () => void;
}

export const ProviderCard: React.FC<ProviderCardProps> = ({
	provider,
	icon: Icon,
	hint,
	loginChallenge,
	isSaving = false,
	isClearing = false,
	isLoggingIn = false,
	isCheckingLogin = false,
	onLogin,
	onConfirmLogin,
	onOpenLogin,
	onClear,
	onConfigure,
}) => {
	const isOAuth = provider.credentialKind === "oauth";
	const isPending = loginChallenge?.status === "pending";
	const canConfirm = isPending && Boolean(loginChallenge?.deviceCode);
	const description = hint ?? provider.description;

	return (
		<div
			data-testid={`provider-card-${provider.id}`}
			className={cn(
				"flex min-h-40 flex-col rounded-lg border border-border bg-card p-4 transition-colors",
				"hover:border-primary/30 hover:bg-ide-list-hover",
			)}
		>
			<div className="flex items-start justify-between gap-2">
				<div className="flex min-w-0 items-center gap-2">
					<span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
						<Icon className="size-4" />
					</span>
					<h3 className="truncate text-sm font-semibold text-foreground">{provider.label}</h3>
				</div>
				<CardStatusBadge
					configured={provider.configured}
					isOAuth={isOAuth}
					isPending={Boolean(isPending)}
				/>
			</div>

			{description ? (
				<p className="mt-2 line-clamp-3 min-h-12 text-xs leading-5 text-muted-foreground">
					{description}
				</p>
			) : (
				<div className="mt-2 min-h-12" />
			)}

			{isOAuth && isPending ? (
				<div className="mt-2 grid gap-1 text-xs text-muted-foreground">
					{loginChallenge?.userCode ? (
						<div className="flex items-center gap-2">
							<span>验证码</span>
							<span className="font-mono text-foreground">{loginChallenge.userCode}</span>
						</div>
					) : null}
					{loginChallenge?.verificationUri ? (
						<div className="flex items-center gap-2">
							<span className="shrink-0">授权页</span>
							<span className="min-w-0 truncate font-mono text-foreground">
								{loginChallenge.verificationUri}
							</span>
						</div>
					) : null}
					<div className="flex items-center gap-1.5 text-warning-foreground">
						<span className="size-1.5 rounded-full bg-warning-foreground" />
						<span>等待浏览器授权</span>
					</div>
				</div>
			) : null}

			<div className="mt-auto flex items-center justify-end gap-1 pt-3">
				{isOAuth ? (
					<OAuthCardActions
						canConfirm={canConfirm}
						configured={provider.configured}
						isCheckingLogin={isCheckingLogin}
						isLoggingIn={isLoggingIn}
						isPending={Boolean(isPending)}
						label={provider.label}
						onConfirmLogin={onConfirmLogin}
						onLogin={onLogin}
						onOpenLogin={onOpenLogin}
					/>
				) : (
					<Button
						type="button"
						variant={provider.configured ? "outline" : "default"}
						size="sm"
						disabled={isSaving}
						onClick={onConfigure}
						aria-label={`配置 ${provider.label}`}
						className="rounded-md"
					>
						{isSaving ? <Loader2 className="animate-spin" /> : <Settings2 />}
						<span>配置</span>
					</Button>
				)}
				<CardMoreMenu
					provider={provider}
					isClearing={isClearing}
					isLoginPending={Boolean(isPending)}
					canClear={provider.configured || isPending}
					onClear={onClear}
				/>
			</div>
		</div>
	);
};

const OAuthCardActions: React.FC<{
	canConfirm: boolean;
	configured: boolean;
	isCheckingLogin: boolean;
	isLoggingIn: boolean;
	isPending: boolean;
	label: string;
	onConfirmLogin: () => void;
	onLogin: () => void;
	onOpenLogin: () => void;
}> = ({
	canConfirm,
	configured,
	isCheckingLogin,
	isLoggingIn,
	isPending,
	label,
	onConfirmLogin,
	onLogin,
	onOpenLogin,
}) => {
	if (isPending && canConfirm) {
		return (
			<>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={onOpenLogin}
					className="rounded-md"
				>
					<ExternalLink />
					<span>打开</span>
				</Button>
				<Button
					type="button"
					size="sm"
					disabled={isCheckingLogin}
					onClick={onConfirmLogin}
					className="rounded-md"
				>
					{isCheckingLogin ? <Loader2 className="animate-spin" /> : <Check />}
					<span>确认</span>
				</Button>
			</>
		);
	}
	if (isPending) {
		return (
			<Button type="button" disabled size="sm" className="rounded-md">
				<Loader2 className="animate-spin" />
				<span>登录中</span>
			</Button>
		);
	}
	return (
		<Button
			type="button"
			variant={configured ? "outline" : "default"}
			size="sm"
			disabled={isLoggingIn}
			onClick={onLogin}
			className="rounded-md"
			title={`打开 ${label} 登录授权`}
		>
			{isLoggingIn ? <Loader2 className="animate-spin" /> : <LogIn />}
			<span>{configured ? "重新登录" : "登录"}</span>
		</Button>
	);
};

const CardStatusBadge: React.FC<{ configured: boolean; isOAuth: boolean; isPending: boolean }> = ({
	configured,
	isOAuth,
	isPending,
}) => {
	if (isPending) {
		return (
			<span className="shrink-0 rounded-control bg-warning-surface px-2 py-0.5 text-[11px] font-medium text-warning-foreground">
				登录中
			</span>
		);
	}
	if (configured) {
		return (
			<span className="shrink-0 rounded-control bg-success-surface px-2 py-0.5 text-[11px] font-medium text-success-foreground">
				{isOAuth ? "已登录" : "已配置"}
			</span>
		);
	}
	return (
		<span className="shrink-0 rounded-control bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
			{isOAuth ? "未登录" : "未配置"}
		</span>
	);
};

const CardMoreMenu: React.FC<{
	provider: APIKeyProvider;
	isClearing: boolean;
	isLoginPending: boolean;
	canClear: boolean;
	onClear: () => void;
}> = ({ provider, isClearing, isLoginPending, canClear, onClear }) => {
	const [open, setOpen] = useState(false);
	const isOAuth = provider.credentialKind === "oauth";
	const actionLabel = isLoginPending ? "取消登录" : isOAuth ? "退出登录" : "清除 API Key";
	const disabled = isClearing || (!canClear && !isLoginPending);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					aria-label={`${provider.label} 更多操作`}
					aria-haspopup="menu"
					aria-expanded={open}
					className="size-8 rounded-md text-muted-foreground"
				>
					{isClearing ? <Loader2 className="animate-spin" /> : <Ellipsis />}
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" sideOffset={4} className="w-44 p-1" role="menu">
				<button
					type="button"
					role="menuitem"
					disabled={disabled}
					onClick={() => {
						setOpen(false);
						onClear();
					}}
					className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:text-muted-foreground disabled:opacity-50"
				>
					{isOAuth ? <LogOut className="size-4" /> : <Trash2 className="size-4" />}
					<span>{actionLabel}</span>
				</button>
			</PopoverContent>
		</Popover>
	);
};
