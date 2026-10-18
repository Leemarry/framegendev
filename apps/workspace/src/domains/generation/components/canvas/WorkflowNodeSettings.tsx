import useSWR from "swr";
import { generationModelsKey, getGenerationModels } from "../../api/generation";
import type { WorkflowNode } from "../../lib/workflow-schema-v4";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

type Config = NonNullable<WorkflowNode["data"]["config"]>;
const selectClass = "h-9 w-full rounded-md border border-input bg-background px-2 text-foreground";

/** Use the generation catalog's parameter definitions rather than inventing model options. */
export function WorkflowNodeSettings({
	type,
	config,
	onChange,
}: {
	type: string;
	config: Config;
	onChange: (config: Config) => void;
}) {
	const catalog = useSWR(generationModelsKey, getGenerationModels);
	const kind =
		type === "videoGeneration"
			? "video"
			: type === "audioGeneration"
				? "audio"
				: type === "textNode"
					? "text"
					: "image";
	const models = catalog.data?.routes?.some((route) => route.kind === kind)
		? catalog.data.routes.filter((route) => route.kind === kind)
		: (catalog.data?.models ?? []).filter((model) => model.kind === kind);
	const selected = models.find((model) => model.id === config.modelId);
	const setParam = (name: string, value: unknown) =>
		onChange({ ...config, params: { ...config.params, [name]: value } });
	return (
		<>
			<label className="block space-y-1 text-xs text-muted-foreground">
				生成模型
				<select
					aria-label="生成模型"
					className={selectClass}
					value={config.modelId ?? ""}
					onChange={(event) => {
						const model = models.find((item) => item.id === event.target.value);
						onChange({
							...config,
							modelId: event.target.value,
							params: Object.fromEntries(
								(model?.params ?? [])
									.filter((param) => param.default !== undefined)
									.map((param) => [param.name, param.default]),
							),
						});
					}}
				>
					<option value="">{catalog.isLoading ? "加载模型…" : "选择生成模型"}</option>
					{config.modelId && !selected && (
						<option value={config.modelId}>{config.modelId}（当前不可用）</option>
					)}
					{models.map((model) => (
						<option
							key={model.id}
							value={model.id}
							disabled={
								("status" in model && model.status !== "available") ||
								("configured" in model && model.configured === false)
							}
						>
							{model.label} · {model.provider}
						</option>
					))}
				</select>
			</label>
			{catalog.error && (
				<p role="alert" className="text-xs text-error-foreground">
					模型加载失败
					<Button variant="ghost" size="sm" onClick={() => void catalog.mutate()}>
						重试
					</Button>
				</p>
			)}
			{!catalog.isLoading && !catalog.error && !models.length && (
				<p className="text-xs text-muted-foreground">暂无可用模型，请先在生成设置中配置模型。</p>
			)}
			{selected?.params.map((param) => {
				const value = config.params?.[param.name] ?? param.default ?? "";
				return (
					<label key={param.name} className="block space-y-1 text-xs text-muted-foreground">
						{param.label}
						{param.required ? " *" : ""}
						{param.options?.length ? (
							<select
								aria-label={param.label}
								className={selectClass}
								value={String(value)}
								onChange={(event) => setParam(param.name, event.target.value)}
							>
								<option value="">请选择</option>
								{param.options.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						) : param.type === "boolean" ? (
							<input
								type="checkbox"
								className="ml-2 accent-primary"
								checked={value === true}
								onChange={(event) => setParam(param.name, event.target.checked)}
							/>
						) : (
							<Input
								type={
									["number", "integer", "int", "float"].includes(param.type) ? "number" : "text"
								}
								min={param.min}
								max={param.max}
								step={["integer", "int"].includes(param.type) ? 1 : "any"}
								value={String(value)}
								onChange={(event) => {
									const input = event.target;
									if (input.type === "number" && input.value !== "") {
										if (!input.validity.valid || !Number.isFinite(input.valueAsNumber)) return;
										setParam(param.name, input.valueAsNumber);
									} else setParam(param.name, input.value);
								}}
							/>
						)}
						{param.help && <span className="block">{param.help}</span>}
					</label>
				);
			})}
		</>
	);
}
