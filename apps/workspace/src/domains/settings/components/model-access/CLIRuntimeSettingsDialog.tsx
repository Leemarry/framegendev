import * as Dialog from "@radix-ui/react-dialog";
import type { APIKeyProvider, CLIProviderRuntime } from "@/domains/settings/api/settings";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

export const CLIRuntimeFields = ({
	runtime,
	providerID,
}: {
	runtime?: CLIProviderRuntime;
	providerID: string;
}) => (
	<div className="grid gap-2 text-sm">
		<Label htmlFor={`cli-path-${providerID}`}>CLI 可执行文件路径</Label>
		<Input
			id={`cli-path-${providerID}`}
			readOnly
			value={runtime?.binaryPath ?? ""}
			placeholder={runtime ? "未找到可用 CLI" : "未获取到 CLI 信息"}
			className="font-mono text-xs"
		/>
		<p className="text-xs leading-5 text-muted-foreground">由应用管理，当前为只读。</p>
		{runtime?.available ? (
			<p className="text-xs text-muted-foreground">
				{runtime.source === "packaged"
					? "应用工具包"
					: runtime.source === "path"
						? "系统 PATH"
						: "本地路径配置"}
				{runtime.version ? ` · 工具包版本 ${runtime.version}` : " · 版本未提供"}
			</p>
		) : (
			<p role="status" className="text-xs text-warning-foreground">
				{runtime?.message || "暂时无法读取 CLI 信息，请稍后重试。"}
			</p>
		)}
	</div>
);

export const CLIRuntimeSettingsDialog = ({
	provider,
	pending,
	onClose,
}: {
	provider: APIKeyProvider;
	pending: boolean;
	onClose: () => void;
}) => (
	<Dialog.Root
		open
		onOpenChange={(open) => {
			if (!open) onClose();
		}}
	>
		<Dialog.Portal>
			<Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" />
			<Dialog.Content className="fixed left-1/2 top-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 gap-6 overflow-auto rounded-lg border border-border bg-card p-5 shadow-xl">
				<Dialog.Title className="text-base font-semibold">{provider.label} · 高级设置</Dialog.Title>
				<Dialog.Description className="text-sm text-muted-foreground">
					查看当前登录状态和本地 CLI 配置。
				</Dialog.Description>
				<div className="grid gap-2 text-sm">
					<p className="font-medium">{provider.label}</p>
					<p>
						{pending
							? "等待授权"
							: provider.configured
								? provider.status === "partial"
									? "已登录 · 权限待确认"
									: "已登录"
								: "未登录"}
					</p>
					<p className="text-muted-foreground">请在平台卡片上管理登录状态。</p>
				</div>
				<CLIRuntimeFields providerID={provider.id} runtime={provider.runtime} />
				<Dialog.Close asChild>
					<Button variant="outline" className="justify-self-end">
						关闭
					</Button>
				</Dialog.Close>
			</Dialog.Content>
		</Dialog.Portal>
	</Dialog.Root>
);
