import { ArrowRight, Loader2, Save, Sparkles, Trash2 } from "lucide-react";
import type React from "react";
import { useState } from "react";
import type { APIKeyProvider } from "@/domains/settings/api/settings";
import { Button } from "@/shared/components/ui/button";
import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
	apiKeyInputPlaceholder,
	providerConfigVariantLabel,
	providerSavedCredentialLabel,
	type ProviderConfigVariant,
} from "./provider-credential-utils";

export const MaskedAPIKeyInput: React.FC<{
	"aria-label": string;
	className?: string;
	id: string;
	onChange: (value: string) => void;
	placeholder: string;
	provider: APIKeyProvider;
	value: string;
}> = ({ "aria-label": ariaLabel, className, id, onChange, placeholder, provider, value }) => {
	const [isEditing, setIsEditing] = useState(false);
	const savedCredential = provider.configured ? providerSavedCredentialLabel(provider) : "";
	const showsSavedCredential = Boolean(savedCredential) && !isEditing && value.trim() === "";

	return (
		<Input
			id={id}
			aria-label={ariaLabel}
			className={className}
			onBlur={() => {
				if (!value.trim()) setIsEditing(false);
			}}
			onChange={(event) => {
				if (!isEditing) setIsEditing(true);
				onChange(event.target.value);
			}}
			onFocus={() => {
				if (showsSavedCredential) {
					setIsEditing(true);
					onChange("");
				}
			}}
			placeholder={placeholder}
			type={showsSavedCredential ? "text" : "password"}
			value={showsSavedCredential ? savedCredential : value}
		/>
	);
};

/**
 * 通用 API Key / Access Key 配置弹窗。端点与模型路由由系统预设，
 * 这里只保存凭据，不展示供应商标识、端点策略等非可编辑路由元数据。
 */
export const ProviderConfigDialog: React.FC<{
	apiKey: string;
	isClearing: boolean;
	isSaving: boolean;
	onAPIKeyChange: (value: string) => void;
	onClear: () => void;
	onOpenChange: (open: boolean) => void;
	onSave: () => void;
	open: boolean;
	provider: APIKeyProvider;
	variant: ProviderConfigVariant;
}> = ({
	apiKey,
	isClearing,
	isSaving,
	onAPIKeyChange,
	onClear,
	onOpenChange,
	onSave,
	open,
	provider,
	variant,
}) => {
	if (!open) return null;
	const inputID = `provider-api-key-${provider.id}`;
	const variantLabel = providerConfigVariantLabel(variant);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-6">
			<div
				aria-labelledby={`provider-config-title-${provider.id}`}
				aria-modal="true"
				className="max-h-[calc(100vh-3rem)] w-full max-w-xl overflow-auto rounded-md border border-border bg-background p-6 shadow-xl"
				role="dialog"
			>
				<div className="flex items-start justify-between gap-4">
					<div>
						<div className="text-xs font-semibold text-muted-foreground">
							{variant === "cli" ? "CLI 配置" : "凭据配置"}
						</div>
						<h3
							id={`provider-config-title-${provider.id}`}
							className="mt-2 text-lg font-semibold text-foreground"
						>
							配置 {provider.label}
						</h3>
						<p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
							{variant === "custom"
								? "这里仅保存该接口的 API Key。供应商标识、端点和模型路由由系统预设，不需要在这里填写。"
								: variant === "cli"
									? "这里仅保存本地 CLI 使用的 Access Key。端点和模型能力由系统预设。"
									: "这里仅保存官方账号凭据。端点和模型能力由系统内置配置决定。"}
						</p>
					</div>
					<span className="rounded-full bg-ide-list-hover px-2 py-1 text-xs font-medium text-muted-foreground">
						{variantLabel}
					</span>
				</div>

				<div className="mt-6">
					<div className="grid gap-2">
						<Label htmlFor={inputID} className="text-sm font-medium text-foreground">
							{provider.credentialLabel || "API Key"}
						</Label>
						<MaskedAPIKeyInput
							id={inputID}
							aria-label={`${provider.label} API Key`}
							className="h-10 rounded-md font-mono text-sm text-foreground"
							onChange={onAPIKeyChange}
							placeholder={apiKeyInputPlaceholder(provider, "输入API Key")}
							provider={provider}
							value={apiKey}
						/>
						{provider.help ? (
							<p className="text-xs leading-5 text-muted-foreground">{provider.help}</p>
						) : null}
					</div>
				</div>

				<div className="mt-6 flex justify-end gap-2">
					{provider.configured ? (
						<Button
							type="button"
							variant="ghost"
							disabled={isClearing}
							onClick={onClear}
							className="mr-auto rounded-md text-destructive"
						>
							{isClearing ? <Loader2 className="animate-spin" /> : <Trash2 />}
							<span>清除当前 Key</span>
						</Button>
					) : null}
					<DialogDismissButton
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						className="w-24 rounded-md"
					>
						取消
					</DialogDismissButton>
					<Button
						type="button"
						disabled={!apiKey.trim() || isSaving}
						onClick={onSave}
						className="w-24 rounded-md"
					>
						{isSaving ? <Loader2 className="animate-spin" /> : <Save />}
						<span>保存</span>
					</Button>
				</div>
			</div>
		</div>
	);
};

export const MediaGoConfigDialog: React.FC<{
	apiKey: string;
	isClearing: boolean;
	isSaving: boolean;
	onAPIKeyChange: (value: string) => void;
	onClear: () => void;
	onOpenChange: (open: boolean) => void;
	onRegister: () => void;
	onSave: () => void;
	open: boolean;
	provider: APIKeyProvider;
}> = ({
	apiKey,
	isClearing,
	isSaving,
	onAPIKeyChange,
	onClear,
	onOpenChange,
	onRegister,
	onSave,
	open,
	provider,
}) => {
	if (!open) return null;
	const helperText = mediaGoKeyHelperText(provider, apiKey, isSaving);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-6">
			<div
				aria-labelledby="mediago-config-dialog-title"
				aria-modal="true"
				className="max-h-[calc(100vh-3rem)] w-full max-w-xl overflow-auto rounded-md border border-border bg-background p-6 shadow-xl"
				role="dialog"
			>
				<div className="text-xs font-semibold text-muted-foreground">聚合平台</div>
				<h3 id="mediago-config-dialog-title" className="mt-2 text-lg font-semibold text-foreground">
					配置 MediaGo API Key
				</h3>
				<p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
					粘贴已有的 API Key 完成接入；还没有账号可先去官网注册获取。
				</p>

				<div className="mt-6 grid gap-2">
					<Label htmlFor="mediago-api-key" className="text-sm font-medium text-foreground">
						API Key
					</Label>
					<MaskedAPIKeyInput
						id="mediago-api-key"
						aria-label="MediaGo API Key"
						className="h-10 rounded-md bg-ide-editor font-mono text-sm text-foreground"
						onChange={onAPIKeyChange}
						placeholder="粘贴 MediaGo API Key"
						provider={provider}
						value={apiKey}
					/>
					<p className="text-xs leading-5 text-muted-foreground">{helperText}</p>
				</div>

				<button
					type="button"
					onClick={onRegister}
					className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
				>
					<span>还没有账号？免费注册获取</span>
					<ArrowRight className="size-3.5" />
				</button>

				<div className="mt-6 flex flex-wrap items-center justify-between gap-2">
					{provider.configured ? (
						<Button
							type="button"
							variant="ghost"
							disabled={isClearing}
							onClick={onClear}
							className="rounded-md text-muted-foreground"
						>
							{isClearing ? <Loader2 className="animate-spin" /> : <Trash2 />}
							<span>清除当前 Key</span>
						</Button>
					) : (
						<span />
					)}
					<div className="flex gap-2">
						<DialogDismissButton
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							className="w-24 rounded-md"
						>
							取消
						</DialogDismissButton>
						<Button
							type="button"
							disabled={!apiKey.trim() || isSaving}
							onClick={onSave}
							className="rounded-md px-4"
						>
							{isSaving ? <Loader2 className="animate-spin" /> : <Sparkles />}
							<span>一键配置</span>
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
};

const mediaGoKeyHelperText = (provider: APIKeyProvider, apiKey: string, isSaving: boolean) => {
	const trimmedKey = apiKey.trim();
	if (isSaving) return "正在保存并刷新本地运行时配置。";
	if (trimmedKey.length >= 12) return "API Key 已输入，可以点击一键配置完成保存。";
	if (trimmedKey.length > 0) return "当前 API Key 长度偏短，请确认完整复制后再保存。";
	if (provider.configured)
		return `当前已保存 ${providerSavedCredentialLabel(provider)}，输入新的 Key 可替换。`;
	return "输入后可一键配置并刷新生成与 Agent 配置。";
};
