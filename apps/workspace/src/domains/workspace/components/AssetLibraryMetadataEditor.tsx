import { useEffect, useId, useRef, useState } from "react";
import type { MediaAssetMetadataUpdate } from "@/domains/workspace/api/media";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

type SaveStatus = "saved" | "unsaved" | "saving" | "saveFailed";

export function AssetLibraryMetadataEditor({
	tags,
	note,
	rating,
	favorite = false,
	colors,
	sourceUrl,
	modifiedAt,
	folderPath,
	disabled = false,
	onSave,
}: MediaAssetMetadataUpdate & {
	colors?: string[];
	sourceUrl?: string;
	modifiedAt?: string;
	folderPath?: string;
	disabled?: boolean;
	onSave: (payload: MediaAssetMetadataUpdate) => Promise<void>;
}) {
	const id = useId();
	const [draft, setDraft] = useState({ tags: tags.join(", "), note, rating });
	const [status, setStatus] = useState<SaveStatus>("saved");
	const [error, setError] = useState("");
	const revision = useRef(0);

	useEffect(() => {
		if (status !== "unsaved" || disabled) return;
		const saveRevision = revision.current;
		const timer = window.setTimeout(() => {
			const nextTags = [
				...new Set(
					draft.tags
						.split(/[,，]/)
						.map((value) => value.trim())
						.filter(Boolean),
				),
			];
			if (nextTags.length > 20 || nextTags.some((tag) => Array.from(tag).length > 40)) {
				setError("最多20个标签，每个标签最多40个字符。");
				setStatus("saveFailed");
				return;
			}
			if (Array.from(draft.note).length > 4000) {
				setError("备注最多4000个字符。");
				setStatus("saveFailed");
				return;
			}
			setError("");
			setStatus("saving");
			void onSave({ tags: nextTags, note: draft.note, rating: draft.rating }).then(
				() => {
					if (revision.current === saveRevision) setStatus("saved");
				},
				(err: unknown) => {
					if (revision.current === saveRevision) {
						setError(err instanceof Error ? err.message : "元数据保存失败，请重试。");
						setStatus("saveFailed");
					}
				},
			);
		}, 800);
		return () => window.clearTimeout(timer);
	}, [disabled, draft, onSave, status]);

	const updateDraft = (next: typeof draft) => {
		revision.current += 1;
		setDraft(next);
		setError("");
		setStatus("unsaved");
	};
	const parsedTags = [
		...new Set(
			draft.tags
				.split(/[,，]/)
				.map((value) => value.trim())
				.filter(Boolean),
		),
	];

	return (
		<section
			data-asset-metadata-editor
			data-save-status={status}
			aria-label="素材元数据"
			className="grid shrink-0 gap-2 border-t border-border pt-3 text-xs"
		>
			<div>
				<label htmlFor={`${id}-tags`}>标签</label>
				<div className="mt-1 flex flex-wrap gap-1">
					{parsedTags.map((tag) => (
						<span
							key={tag}
							className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5"
						>
							{tag}
							<button
								type="button"
								aria-label={`移除标签 ${tag}`}
								disabled={disabled}
								onClick={() =>
									updateDraft({
										...draft,
										tags: parsedTags.filter((item) => item !== tag).join(", "),
									})
								}
							>
								×
							</button>
						</span>
					))}
				</div>
				<Input
					id={`${id}-tags`}
					value={draft.tags}
					disabled={disabled}
					placeholder="输入标签，以逗号分隔"
					className="mt-1 h-8 text-xs"
					onChange={(event) => updateDraft({ ...draft, tags: event.target.value })}
				/>
			</div>
			<label htmlFor={`${id}-note`}>备注</label>
			<textarea
				id={`${id}-note`}
				rows={3}
				value={draft.note}
				disabled={disabled}
				className="min-h-20 w-full resize-y rounded-md border border-input bg-background p-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				onChange={(event) => updateDraft({ ...draft, note: event.target.value })}
			/>
			<label htmlFor={`${id}-rating`}>评分</label>
			<select
				id={`${id}-rating`}
				value={draft.rating}
				disabled={disabled}
				className="h-8 rounded-md border border-input bg-background px-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				onChange={(event) => updateDraft({ ...draft, rating: Number(event.target.value) })}
			>
				<option value={0}>未评分</option>
				{[1, 2, 3, 4, 5].map((value) => (
					<option key={value} value={value}>
						{value} / 5
					</option>
				))}
			</select>
			<div role="status" aria-live="polite">
				{status === "saving"
					? "正在保存素材"
					: status === "saved"
						? "已保存"
						: status === "unsaved"
							? "有未保存的修改"
							: "保存失败"}
			</div>
			{error ? (
				<p role="alert" className="text-error-foreground">
					{error}
				</p>
			) : null}
			{status === "saveFailed" ? (
				<Button
					type="button"
					size="sm"
					disabled={disabled}
					onClick={() => {
						setStatus("unsaved");
					}}
				>
					重试保存
				</Button>
			) : null}
			<div className="text-muted-foreground">{favorite ? "已收藏" : "未收藏"}</div>
			{colors && colors.length > 0 ? (
				<div>
					<p className="mb-1">主色板</p>
					<div className="flex flex-wrap gap-1">
						{colors.map((color, idx) => (
							<button
								key={idx}
								type="button"
								aria-label={`复制颜色 ${color}`}
								title={color}
								className="size-6 rounded border border-border"
								style={{ backgroundColor: color }}
								onClick={() => navigator.clipboard.writeText(color)}
							/>
						))}
					</div>
				</div>
			) : null}
			{sourceUrl ? (
				<div className="text-muted-foreground">
					<p className="mb-1">来源网址</p>
					<a
						href={sourceUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="break-all text-primary underline"
					>
						{sourceUrl}
					</a>
				</div>
			) : null}
			{modifiedAt ? (
				<div className="text-muted-foreground">
					<p className="mb-1">文件修改时间</p>
					<p>{new Date(modifiedAt).toLocaleString("zh-CN")}</p>
				</div>
			) : null}
			{folderPath ? (
				<div className="text-muted-foreground">
					<p className="mb-1">文件夹</p>
					<p className="break-all">{folderPath}</p>
				</div>
			) : null}
		</section>
	);
}
