import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss";
import { confirmDialog } from "@/shared/components/callable/ConfirmDialog";
import {
	customProviderError,
	discoverCustomModels,
	emptyCustomModel,
	saveCustomProvider,
	validateCustomProvider,
	type CustomModel,
	type CustomProtocol,
	type CustomProvider,
	type CustomProviderDefinition,
} from "../../api/custom-providers";

export const protocolLabels: Record<CustomProtocol, string> = {
	"openai-completions": "OpenAI Chat Completions",
	"openai-responses": "OpenAI Responses",
	"anthropic-messages": "Anthropic Messages",
	"openai-images": "OpenAI Images",
};
const paths: Record<CustomProtocol, string> = {
	"openai-completions": "/chat/completions",
	"openai-responses": "/responses",
	"anthropic-messages": "/messages",
	"openai-images": "/images/generations · /images/edits",
};
const selectClass = "h-9 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm";

export function CustomField({ title, children }: { title: string; children: ReactNode }) {
	return (
		<label className="grid min-w-0 gap-1 text-sm">
			<span className="text-muted-foreground">{title}</span>
			{children}
		</label>
	);
}
function Flag({
	label,
	checked,
	onChange,
}: {
	label: string;
	checked: boolean;
	onChange: (value: boolean) => void;
}) {
	return (
		<label className="flex items-center gap-2 text-sm">
			<input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
			{label}
		</label>
	);
}
export function CustomDialogShell({
	title,
	onClose,
	children,
	busy = false,
}: {
	title: string;
	onClose: () => void;
	children: ReactNode;
	busy?: boolean;
}) {
	return (
		<Dialog.Root
			open
			onOpenChange={(open) => {
				if (!open && !busy) onClose();
			}}
		>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" />
				<Dialog.Content
					aria-describedby={undefined}
					className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-background p-5 shadow-xl"
				>
					<Dialog.Title className="mb-4 pr-8 text-lg font-semibold">{title}</Dialog.Title>
					{!busy && (
						<DialogDismissButton
							aria-label="关闭"
							className="absolute right-3 top-3"
							variant="ghost"
							size="sm"
							onClick={onClose}
						>
							×
						</DialogDismissButton>
					)}
					{children}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

function ModelFields({
	model,
	index,
	baseURL,
	invalid,
	update,
	remove,
}: {
	model: CustomModel;
	index: number;
	baseURL: string;
	invalid: boolean;
	update: (model: CustomModel) => void;
	remove: () => void;
}) {
	const patch = (value: Partial<CustomModel>) => update({ ...model, ...value });
	return (
		<fieldset className="min-w-0 space-y-3 rounded-md border border-border p-3">
			<legend className="px-1 text-sm">模型 {index + 1}</legend>
			<div className="grid gap-3 md:grid-cols-2">
				<CustomField title="模型 ID">
					<Input
						data-model-id-index={index}
						aria-invalid={invalid || undefined}
						value={model.id}
						onChange={(e) => patch({ id: e.target.value })}
						placeholder="上游实际模型 ID"
					/>
				</CustomField>
				<CustomField title="显示名称">
					<Input value={model.name} onChange={(e) => patch({ name: e.target.value })} />
				</CustomField>
				<CustomField title="模型协议">
					<select
						className={selectClass}
						value={model.protocol}
						onChange={(e) => {
							const protocol = e.target.value as CustomProtocol;
							update({ ...emptyCustomModel(protocol), id: model.id, name: model.name });
						}}
					>
						{Object.entries(protocolLabels).map(([value, label]) => (
							<option key={value} value={value}>
								{label}
							</option>
						))}
					</select>
				</CustomField>
			</div>
			<p className="break-all text-xs text-muted-foreground">
				请求地址：{baseURL.replace(/\/+$/, "") || "API Base URL"}
				{paths[model.protocol]}
			</p>
			{model.kind === "text" ? (
				<>
					<div className="flex flex-wrap gap-4">
						<Flag
							label="流式输出"
							checked={model.streaming}
							onChange={(streaming) => patch({ streaming })}
						/>
						<Flag label="工具调用" checked={model.tools} onChange={(tools) => patch({ tools })} />
						<Flag
							label="图片输入"
							checked={model.vision}
							onChange={(vision) => patch({ vision })}
						/>
					</div>
					<div className="grid gap-3 md:grid-cols-2">
						<CustomField title="上下文长度（可选）">
							<Input
								type="number"
								min={1}
								value={model.contextWindow || ""}
								onChange={(e) => patch({ contextWindow: Number(e.target.value) || undefined })}
							/>
						</CustomField>
						<CustomField title="最大输出 token（可选）">
							<Input
								type="number"
								min={1}
								value={model.maxOutputTokens || ""}
								onChange={(e) => patch({ maxOutputTokens: Number(e.target.value) || undefined })}
							/>
						</CustomField>
					</div>
				</>
			) : (
				<>
					<div className="flex flex-wrap gap-4">
						<Flag
							label="文生图"
							checked={model.generation}
							onChange={(generation) => patch({ generation })}
						/>
						<Flag
							label="图片编辑"
							checked={model.editing}
							onChange={(editing) =>
								patch({ editing, maxReferenceImages: editing ? model.maxReferenceImages || 1 : 0 })
							}
						/>
					</div>
					{model.editing && (
						<CustomField title="最多参考图数量">
							<Input
								type="number"
								min={1}
								max={16}
								value={model.maxReferenceImages || 1}
								onChange={(e) => patch({ maxReferenceImages: Number(e.target.value) })}
							/>
						</CustomField>
					)}
					<div className="grid gap-3 md:grid-cols-3">
						{(
							[
								["sizes", "尺寸"],
								["qualities", "质量"],
								["outputFormats", "输出格式"],
							] as const
						).map(([key, title]) => (
							<CustomField title={`${title}（逗号分隔）`} key={key}>
								<Input
									value={model[key]?.join(",") ?? ""}
									onChange={(e) =>
										patch({
											[key]: e.target.value.split(/[,，]/),
										})
									}
									placeholder={key === "outputFormats" ? "png, jpeg, webp" : "按接口文档填写"}
								/>
							</CustomField>
						))}
					</div>
				</>
			)}
			<Button type="button" variant="ghost" size="sm" onClick={remove}>
				移除此模型
			</Button>
		</fieldset>
	);
}

export function CustomProviderDialog({
	provider,
	existing,
	onClose,
	onSaved,
}: {
	provider?: CustomProvider;
	existing: CustomProvider[];
	onClose: () => void;
	onSaved: () => Promise<void>;
}) {
	const [target, setTarget] = useState(provider);
	const [draft, setDraft] = useState<CustomProviderDefinition>(() =>
		structuredClone(
			provider?.definition ?? {
				schemaVersion: 1,
				id: "",
				name: "",
				baseURL: "",
				enabled: true,
				models: [],
			},
		),
	);
	const [key, setKey] = useState("");
	const [tab, setTab] = useState<"manual" | "import">("manual");
	const [source, setSource] = useState("");
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);
	const [discovering, setDiscovering] = useState(false);
	const [protocol, setProtocol] = useState<CustomProtocol>("openai-completions");
	const [discovered, setDiscovered] = useState<{ id: string; name: string }[]>([]);
	const [selected, setSelected] = useState<string[]>([]);
	const [invalidModelIndex, setInvalidModelIndex] = useState<number>();
	const formRef = useRef<HTMLFormElement>(null);
	const request = useRef<AbortController | null>(null);
	useEffect(() => () => request.current?.abort(), []);
	useEffect(() => {
		request.current?.abort();
		setDiscovered([]);
		setSelected([]);
	}, [draft.baseURL, key, protocol]);
	const patch = (value: Partial<CustomProviderDefinition>) =>
		setDraft((current) => ({ ...current, ...value }));
	const importSource = async (text: string) => {
		setBusy(true);
		setError("");
		try {
			if (new Blob([text]).size > 1024 * 1024) throw new Error("配置文件不能超过 1 MB");
			const validated = await validateCustomProvider(JSON.parse(text));
			const match = existing.find((item) => item.definition.id === validated.id);
			if (
				match &&
				!(await confirmDialog({
					title: "更新已有供应商",
					description: `将用导入配置更新「${match.definition.name}」，保留已保存的密钥。`,
					confirmLabel: "载入更新配置",
				}))
			)
				return;
			setTarget(match);
			setDraft(validated);
			setKey("");
			setTab("manual");
		} catch (err) {
			setError(customProviderError(err));
		} finally {
			setBusy(false);
		}
	};
	const discover = async () => {
		request.current?.abort();
		const controller = new AbortController();
		request.current = controller;
		setDiscovering(true);
		setError("");
		try {
			const result = await discoverCustomModels(
				{
					baseURL: draft.baseURL,
					protocol,
					apiKey: key || undefined,
					providerId: target?.definition.id,
					revision: target?.revision,
				},
				controller.signal,
			);
			if (!controller.signal.aborted) {
				setDiscovered(result.models);
				setSelected([]);
				if (!result.models.length) setError("未返回模型，可手动添加。");
			}
		} catch (err) {
			if (!controller.signal.aborted) setError(customProviderError(err));
		} finally {
			if (request.current === controller) setDiscovering(false);
		}
	};
	const save = async () => {
		setInvalidModelIndex(undefined);
		if (selected.length) {
			setError("还有勾选的模型未添加，请先点击「添加所选模型」，再保存配置。");
			return;
		}
		if (!draft.models.length) {
			setError("请从获取的列表中勾选并添加模型，或点击「手动添加模型」。");
			return;
		}
		const invalidIndex = draft.models.findIndex(
			(m) =>
				!m.id.trim() ||
				m.id !== m.id.trim() ||
				new TextEncoder().encode(m.id).length > 200 ||
				/[\r\n]/.test(m.id),
		);
		if (invalidIndex >= 0) {
			setError(
				`模型 ${invalidIndex + 1} 的模型 ID 无效：请填写上游实际模型 ID，不能有首尾空格、换行或超过 200 字节；不需要的行可点击「移除此模型」。`,
			);
			setInvalidModelIndex(invalidIndex);
			formRef.current
				?.querySelector<HTMLInputElement>(`[data-model-id-index="${invalidIndex}"]`)
				?.focus();
			return;
		}
		setBusy(true);
		setError("");
		request.current?.abort();
		try {
			await saveCustomProvider(
				{
					definition: {
						...draft,
						models: draft.models.map((m) => ({
							...m,
							name: m.name || m.id,
							sizes: m.sizes?.map((v) => v.trim()).filter(Boolean),
							qualities: m.qualities?.map((v) => v.trim()).filter(Boolean),
							outputFormats: m.outputFormats?.map((v) => v.trim()).filter(Boolean),
						})),
					},
					revision: target?.revision,
					apiKey: key || undefined,
				},
				target?.definition.id,
			);
			await onSaved();
			onClose();
		} catch (err) {
			setError(customProviderError(err));
		} finally {
			setBusy(false);
		}
	};
	return (
		<CustomDialogShell
			title={target ? "配置自定义供应商" : "添加自定义供应商"}
			onClose={onClose}
			busy={busy}
		>
			<div className="mb-4 flex gap-2">
				<Button
					variant={tab === "manual" ? "default" : "outline"}
					disabled={busy}
					onClick={() => setTab("manual")}
				>
					手动配置
				</Button>
				<Button
					variant={tab === "import" ? "default" : "outline"}
					disabled={busy}
					onClick={() => setTab("import")}
				>
					导入配置
				</Button>
			</div>
			{error && (
				<p
					role="alert"
					className="mb-3 break-words rounded border border-error bg-error-surface p-3 text-sm text-error-foreground"
				>
					{error}
				</p>
			)}
			{tab === "import" ? (
				<div className="space-y-3">
					<p className="text-sm text-muted-foreground">
						导入 .provider.json，检查配置后再保存。文件不应包含 API Key。
					</p>
					<Input
						aria-label="选择配置文件"
						type="file"
						accept=".json,application/json"
						disabled={busy}
						onChange={async (e) => {
							const file = e.target.files?.[0];
							if (!file) return;
							if (file.size > 1024 * 1024) {
								setError("配置文件不能超过 1 MB");
								return;
							}
							try {
								const text = await file.text();
								setSource(text);
								await importSource(text);
							} catch (err) {
								setError(customProviderError(err));
							}
						}}
					/>
					<textarea
						aria-label="配置 JSON"
						className="min-h-56 w-full rounded border border-input bg-background p-2 font-mono text-sm"
						value={source}
						onChange={(e) => setSource(e.target.value)}
					/>
					<Button disabled={busy || !source.trim()} onClick={() => void importSource(source)}>
						校验并载入表单
					</Button>
				</div>
			) : (
				<form
					ref={formRef}
					className="space-y-4"
					onSubmit={(e) => {
						e.preventDefault();
						void save();
					}}
				>
					<fieldset disabled={busy} className="min-w-0 space-y-4">
						<div className="grid gap-3 md:grid-cols-2">
							<CustomField title="供应商名称">
								<Input
									required
									value={draft.name}
									onChange={(e) => patch({ name: e.target.value })}
								/>
							</CustomField>
							<CustomField title="供应商 ID">
								<Input
									required
									pattern="[a-z][a-z0-9_-]{0,63}"
									disabled={!!target}
									value={draft.id}
									onChange={(e) => patch({ id: e.target.value })}
									placeholder="例如 my-provider"
								/>
							</CustomField>
						</div>
						<CustomField title="API Base URL">
							<Input
								required
								type="url"
								value={draft.baseURL}
								onChange={(e) => patch({ baseURL: e.target.value })}
								placeholder="https://example.com/v1"
							/>
						</CustomField>
						<CustomField
							title={target?.configured ? "替换 API Key（留空保留已保存密钥）" : "API Key"}
						>
							<Input
								type="password"
								autoComplete="new-password"
								value={key}
								onChange={(e) => setKey(e.target.value)}
								placeholder={target?.masked || "仅保存到本地凭据存储"}
							/>
						</CustomField>
						<Flag
							label="启用供应商"
							checked={draft.enabled}
							onChange={(enabled) => patch({ enabled })}
						/>
						<div className="flex flex-wrap items-center gap-2">
							<select
								aria-label="获取模型使用的协议"
								className={`${selectClass} md:w-auto`}
								value={protocol}
								onChange={(e) => setProtocol(e.target.value as CustomProtocol)}
							>
								{Object.entries(protocolLabels).map(([value, label]) => (
									<option key={value} value={value}>
										{label}
									</option>
								))}
							</select>
							<Button
								type="button"
								variant="outline"
								disabled={discovering || !draft.baseURL}
								onClick={() => void discover()}
							>
								{discovering ? "正在获取…" : "获取模型列表"}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => patch({ models: [...draft.models, emptyCustomModel(protocol)] })}
							>
								手动添加模型
							</Button>
						</div>
						{discovered.length > 0 && (
							<div className="space-y-2 rounded border border-border p-3">
								<p className="text-sm">
									已获取 {discovered.length}{" "}
									个候选模型。请勾选后点击「添加所选模型」，获取列表不会自动添加。
								</p>
								<p className="text-xs text-muted-foreground">
									所选协议将用于新增模型。图片模型需使用服务支持的图片协议；获取列表不代表支持该协议或能力。
								</p>
								<div className="max-h-44 space-y-2 overflow-auto">
									{discovered.map((m) => (
										<Flag
											key={m.id}
											label={m.name}
											checked={selected.includes(m.id)}
											onChange={(checked) =>
												setSelected((current) =>
													checked ? [...current, m.id] : current.filter((id) => id !== m.id),
												)
											}
										/>
									))}
								</div>
								<Button
									type="button"
									size="sm"
									disabled={!selected.length}
									onClick={() => {
										const additions = discovered
											.filter(
												(m) =>
													selected.includes(m.id) &&
													!draft.models.some(
														(existingModel) =>
															existingModel.id === m.id && existingModel.protocol === protocol,
													),
											)
											.map((m) => ({ ...emptyCustomModel(protocol), ...m }));
										patch({
											models: [...draft.models, ...additions],
										});
										setDiscovered([]);
										setSelected([]);
										setError("");
									}}
								>
									添加所选模型
								</Button>
							</div>
						)}
						<p className="text-sm" role="status">
							已添加 {draft.models.length} 个模型
						</p>
						{!draft.models.length && (
							<p className="text-sm text-muted-foreground">
								尚未添加模型。请从获取的列表中勾选并添加，或点击「手动添加模型」。
							</p>
						)}
						{draft.models.map((model, index) => (
							<ModelFields
								key={`${index}-${model.protocol}`}
								model={model}
								index={index}
								invalid={invalidModelIndex === index}
								baseURL={draft.baseURL}
								update={(value) =>
									patch({ models: draft.models.map((m, i) => (i === index ? value : m)) })
								}
								remove={() => patch({ models: draft.models.filter((_, i) => i !== index) })}
							/>
						))}
						<p className="text-xs text-muted-foreground">
							配置保存后可在对应模型选择器中使用。保存不会发起生成，也不代表调用测试通过。
						</p>
					</fieldset>
					<div className="flex justify-end gap-2">
						<Button type="button" variant="outline" disabled={busy} onClick={onClose}>
							取消
						</Button>
						<Button type="submit" disabled={busy || !draft.models.length}>
							{busy ? "保存中…" : "保存配置"}
						</Button>
					</div>
				</form>
			)}
		</CustomDialogShell>
	);
}
