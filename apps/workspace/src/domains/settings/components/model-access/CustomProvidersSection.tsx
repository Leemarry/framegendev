import { useEffect, useRef, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import useSWR, { useSWRConfig } from "swr";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { confirmDialog } from "@/shared/components/callable/ConfirmDialog";
import { useToast } from "@/hooks/useToast";
import { generationModelsKey } from "@/domains/generation/api/generation";
import { isAgentRuntimeConfigKey } from "@/domains/agent/api/agent";
import { generationProvidersKey } from "../../api/settings";
import {
	clearCustomProviderKey,
	customProviderError,
	customProvidersKey,
	deleteCustomProvider,
	getCustomProviders,
	saveCustomProvider,
	testCustomProvider,
	type CustomProvider,
	type CustomTestResult,
} from "../../api/custom-providers";
import {
	CustomDialogShell,
	CustomField,
	CustomProviderDialog,
	protocolLabels,
} from "./CustomProviderDialog";
import { ProviderCardsGrid, ProviderSection } from "./ProviderSection";

function exportProvider(provider: CustomProvider) {
	const url = URL.createObjectURL(
		new Blob([JSON.stringify(provider.definition, null, 2)], { type: "application/json" }),
	);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = `${provider.definition.id}.provider.json`;
	anchor.click();
	window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ProviderTestDialog({
	provider,
	onClose,
	onTested,
}: {
	provider: CustomProvider;
	onClose: () => void;
	onTested: () => Promise<void>;
}) {
	const [index, setIndex] = useState(0);
	const model = provider.definition.models[index];
	const [operation, setOperation] = useState(model?.generation ? "generate" : "edit");
	const [prompt, setPrompt] = useState(
		model?.kind === "image" ? "A simple blue circle on a white background." : "Reply with OK.",
	);
	const [references, setReferences] = useState<string[]>([]);
	const [result, setResult] = useState<CustomTestResult>();
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);
	const request = useRef<AbortController | null>(null);
	useEffect(() => () => request.current?.abort(), []);
	const run = async () => {
		if (!model) return;
		setError("");
		setResult(undefined);
		setBusy(true);
		const controller = new AbortController();
		request.current = controller;
		try {
			const next = await testCustomProvider(
				provider,
				{
					modelId: model.id,
					protocol: model.protocol,
					operation: model.kind === "text" ? "text" : operation,
					prompt,
					referenceURLs: operation === "edit" ? references : undefined,
				},
				controller.signal,
			);
			if (!controller.signal.aborted) {
				setResult(next);
				await onTested();
			}
		} catch (err) {
			if (!controller.signal.aborted) setError(customProviderError(err));
		} finally {
			setBusy(false);
		}
	};
	return (
		<CustomDialogShell title={`测试 ${provider.definition.name}`} onClose={onClose}>
			<div className="space-y-4">
				<p className="text-sm text-muted-foreground">
					测试会真实调用所选模型，可能产生费用。这里只检查接口返回，正式创作请在工作区生成并保存素材。
				</p>
				<CustomField title="测试模型">
					<select
						className="h-9 w-full rounded border border-input bg-background px-2"
						disabled={busy}
						value={index}
						onChange={(e) => {
							const nextIndex = Number(e.target.value);
							setIndex(nextIndex);
							const nextModel = provider.definition.models[nextIndex];
							setOperation(nextModel?.generation ? "generate" : "edit");
							setPrompt(
								nextModel?.kind === "image"
									? "A simple blue circle on a white background."
									: "Reply with OK.",
							);
							setResult(undefined);
						}}
					>
						{provider.definition.models.map((m, i) => (
							<option key={`${m.protocol}:${m.id}`} value={i}>
								{m.name} · {protocolLabels[m.protocol]}
							</option>
						))}
					</select>
				</CustomField>
				{model?.kind === "image" && (
					<CustomField title="测试操作">
						<select
							disabled={busy}
							className="h-9 w-full rounded border border-input bg-background px-2"
							value={operation}
							onChange={(e) => {
								setOperation(e.target.value);
								setResult(undefined);
							}}
						>
							{model.generation && <option value="generate">文生图</option>}
							{model.editing && <option value="edit">图片编辑</option>}
						</select>
					</CustomField>
				)}
				<CustomField title="测试提示词">
					<Input disabled={busy} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
				</CustomField>
				{model?.kind === "image" && operation === "edit" && (
					<CustomField title="参考图片">
						<Input
							type="file"
							accept="image/*"
							multiple
							disabled={busy}
							onChange={async (e) => {
								const files = Array.from(e.target.files ?? []);
								if (
									files.length > (model.maxReferenceImages || 1) ||
									files.some((file) => file.size > 1024 * 1024)
								) {
									setError("测试参考图每张不超过 1 MB，数量不能超过模型限制");
									return;
								}
								try {
									const values = await Promise.all(
										files.map(
											(file) =>
												new Promise<string>((resolve, reject) => {
													const reader = new FileReader();
													reader.onload = () =>
														typeof reader.result === "string"
															? resolve(reader.result)
															: reject(new Error("读取图片失败"));
													reader.onerror = () => reject(new Error("读取图片失败"));
													reader.readAsDataURL(file);
												}),
										),
									);
									setReferences(values);
									setError("");
								} catch (err) {
									setError(customProviderError(err));
								}
							}}
						/>
					</CustomField>
				)}
				{error && (
					<p role="alert" className="break-words text-sm text-error-foreground">
						{error}
					</p>
				)}
				{result && (
					<p
						role="status"
						className={`break-words text-sm ${result.passed ? "text-success-foreground" : "text-error-foreground"}`}
					>
						{result.passed ? "测试通过" : "测试失败"} · {result.modelId} · {result.message}
					</p>
				)}
				<div className="flex flex-wrap justify-end gap-2">
					{busy ? (
						<Button
							variant="outline"
							onClick={() => {
								request.current?.abort();
								setBusy(false);
							}}
						>
							停止等待
						</Button>
					) : (
						<Button variant="outline" onClick={onClose}>
							关闭
						</Button>
					)}
					<Button
						disabled={
							busy ||
							!prompt.trim() ||
							(model?.kind === "image" && operation === "edit" && !references.length)
						}
						onClick={() => void run()}
					>
						{busy ? "调用中…" : "开始真实调用测试"}
					</Button>
				</div>
			</div>
		</CustomDialogShell>
	);
}

export function CustomProvidersSection({ children }: { children: ReactNode }) {
	const { data, error, mutate } = useSWR(customProvidersKey, getCustomProviders);
	const { mutate: mutateGlobal } = useSWRConfig();
	const toast = useToast();
	const [editor, setEditor] = useState<CustomProvider | "new">();
	const [testing, setTesting] = useState<CustomProvider>();
	const [pending, setPending] = useState<string>();
	const refresh = async () => {
		await mutate();
		void mutateGlobal(generationProvidersKey);
		void mutateGlobal(generationModelsKey);
		void mutateGlobal(isAgentRuntimeConfigKey);
	};
	const run = async (provider: CustomProvider, operation: () => Promise<unknown>) => {
		setPending(provider.definition.id);
		try {
			await operation();
			await refresh();
			toast.success("已更新");
		} catch (err) {
			toast.error(customProviderError(err));
		} finally {
			setPending(undefined);
		}
	};
	return (
		<ProviderSection
			title="聚合平台接入"
			description="通过聚合平台或自定义供应商使用模型，使用对应平台的 API Key 和额度。"
			testid="aggregator-section"
			actions={
				<Button size="sm" variant="outline" onClick={() => setEditor("new")}>
					<Plus className="mr-1 size-4" />
					添加自定义供应商
				</Button>
			}
		>
			{error && (
				<div role="alert" className="mb-3 text-sm text-error-foreground">
					自定义供应商加载失败。
					<Button size="sm" variant="ghost" onClick={() => void mutate()}>
						重试
					</Button>
				</div>
			)}
			<ProviderCardsGrid>
				{children}
				{data?.providers.map((provider) => {
					const d = provider.definition;
					const latest = provider.tests.at(-1);
					const disabled = pending === d.id;
					return (
						<article
							key={d.id}
							className="flex min-h-52 min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-4"
							data-testid={`custom-provider-${d.id}`}
						>
							<div className="flex items-start justify-between gap-2">
								<h4 className="break-words font-medium">{d.name}</h4>
								<span className="shrink-0 rounded bg-muted px-2 py-1 text-xs">
									{!d.enabled ? "已停用" : provider.configured ? "配置完整" : "未配置密钥"}
								</span>
							</div>
							<p className="break-all text-xs text-muted-foreground">{d.baseURL}</p>
							<p className="text-xs text-muted-foreground">
								{[...new Set(d.models.map((m) => (m.kind === "text" ? "文本" : "图片")))].join(
									" / ",
								)}{" "}
								· {d.models.length} 个模型
							</p>
							<div className="min-h-10 text-xs text-muted-foreground">
								{latest ? (
									<>
										<span>
											{latest.passed ? "测试通过" : "测试失败"} · {latest.modelId} ·{" "}
											{latest.operation}
										</span>
										<br />
										<span>{new Date(latest.testedAt).toLocaleString()}</span>
									</>
								) : (
									"未测试"
								)}
							</div>
							<div className="mt-auto flex flex-wrap gap-1">
								<Button
									size="sm"
									variant="outline"
									disabled={disabled}
									onClick={() => setEditor(provider)}
								>
									配置
								</Button>
								<Button
									size="sm"
									variant="outline"
									disabled={disabled || !d.enabled || !provider.configured}
									onClick={() => setTesting(provider)}
								>
									测试
								</Button>
								<Button size="sm" variant="ghost" onClick={() => exportProvider(provider)}>
									导出
								</Button>
								<Button
									size="sm"
									variant="ghost"
									disabled={disabled}
									onClick={() =>
										void run(provider, () =>
											saveCustomProvider(
												{ definition: { ...d, enabled: !d.enabled }, revision: provider.revision },
												d.id,
											),
										)
									}
								>
									{d.enabled ? "停用" : "启用"}
								</Button>
								<Button
									size="sm"
									variant="ghost"
									disabled={disabled || !provider.configured}
									onClick={async () => {
										if (
											await confirmDialog({
												title: `清除 ${d.name} 的 API Key？`,
												description: "保留模型配置，清除后需要重新填写密钥。",
											})
										)
											void run(provider, () => clearCustomProviderKey(provider));
									}}
								>
									清除 Key
								</Button>
								<Button
									size="sm"
									variant="ghost"
									disabled={disabled}
									onClick={async () => {
										if (
											await confirmDialog({
												title: `删除 ${d.name}？`,
												description: "将删除配置和密钥，已有素材和历史消息仍会保留。",
											})
										)
											void run(provider, () => deleteCustomProvider(provider));
									}}
								>
									删除
								</Button>
							</div>
						</article>
					);
				})}
			</ProviderCardsGrid>
			{editor && (
				<CustomProviderDialog
					provider={editor === "new" ? undefined : editor}
					existing={data?.providers ?? []}
					onClose={() => setEditor(undefined)}
					onSaved={async () => {
						await refresh();
						toast.success("已保存配置");
					}}
				/>
			)}
			{testing && (
				<ProviderTestDialog
					provider={testing}
					onClose={() => setTesting(undefined)}
					onTested={refresh}
				/>
			)}
		</ProviderSection>
	);
}
