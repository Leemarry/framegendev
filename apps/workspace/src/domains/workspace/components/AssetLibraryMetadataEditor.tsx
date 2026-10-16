import { useId, useState } from "react";
import type { MediaAssetMetadataUpdate } from "@/domains/workspace/api/media";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

export function AssetLibraryMetadataEditor({
	tags,
	note,
	rating,
	favorite = false,
	disabled = false,
	onSave,
}: MediaAssetMetadataUpdate & {
	disabled?: boolean;
	onSave: (payload: MediaAssetMetadataUpdate) => Promise<void>;
}) {
	const id = useId();
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState({ tags: "", note: "", rating: 0 });
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const busy = disabled || saving;

	if (!editing) {
		return (
			<section
				aria-label="素材元数据"
				className="grid shrink-0 gap-2 border-t border-border pt-3 text-xs"
			>
				<dl className="grid gap-2">
					<div>
						<dt className="text-muted-foreground">标签</dt>
						<dd className="mt-1 break-words">{tags.join("、") || "无标签"}</dd>
					</div>
					<div>
						<dt className="text-muted-foreground">备注</dt>
						<dd className="mt-1 whitespace-pre-wrap break-words">{note || "无备注"}</dd>
					</div>
					<div>
						<dt className="text-muted-foreground">评分</dt>
						<dd className="mt-1">{rating ? `${rating} / 5` : "未评分"}</dd>
					</div>
					<div>
						<dt className="text-muted-foreground">收藏</dt>
						<dd className="mt-1">{favorite ? "已收藏" : "未收藏"}</dd>
					</div>
				</dl>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="h-7 justify-self-start text-xs"
					disabled={busy}
					onClick={() => {
						setDraft({ tags: tags.join(", "), note, rating });
						setError("");
						setEditing(true);
					}}
				>
					编辑元数据
				</Button>
			</section>
		);
	}

	const save = async () => {
		if (busy) return;
		const tags = [
			...new Set(
				draft.tags
					.split(/[,，]/)
					.map((value) => value.trim())
					.filter(Boolean),
			),
		];
		if (tags.length > 20 || tags.some((tag) => Array.from(tag).length > 40)) {
			setError("最多20个标签，每个标签最多40个字符。");
			return;
		}
		if (Array.from(draft.note).length > 4000) {
			setError("备注最多4000个字符。");
			return;
		}
		setSaving(true);
		setError("");
		try {
			await onSave({ tags, note: draft.note, rating: draft.rating });
			setEditing(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : "元数据保存失败，请重试。");
		} finally {
			setSaving(false);
		}
	};

	return (
		<form
			data-asset-metadata-editor
			aria-label="编辑素材元数据"
			className="grid shrink-0 gap-2 border-t border-border pt-3 text-xs"
			onSubmit={(event) => {
				event.preventDefault();
				void save();
			}}
			onKeyDown={(event) => {
				if (event.key === "Escape") {
					event.preventDefault();
					event.stopPropagation();
					if (!busy) setEditing(false);
				}
			}}
		>
			<label htmlFor={`${id}-tags`}>标签</label>
			<Input
				id={`${id}-tags`}
				autoFocus
				value={draft.tags}
				disabled={busy}
				placeholder="用逗号分隔标签"
				className="h-8 text-xs"
				onChange={(event) => setDraft({ ...draft, tags: event.target.value })}
			/>
			<label htmlFor={`${id}-note`}>备注</label>
			<textarea
				id={`${id}-note`}
				rows={3}
				value={draft.note}
				disabled={busy}
				className="min-h-20 w-full resize-y rounded-md border border-input bg-background p-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				onChange={(event) => setDraft({ ...draft, note: event.target.value })}
			/>
			<label htmlFor={`${id}-rating`}>评分</label>
			<select
				id={`${id}-rating`}
				value={draft.rating}
				disabled={busy}
				className="h-8 rounded-md border border-input bg-background px-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				onChange={(event) => setDraft({ ...draft, rating: Number(event.target.value) })}
			>
				<option value={0}>未评分</option>
				{[1, 2, 3, 4, 5].map((value) => (
					<option key={value} value={value}>
						{value} / 5
					</option>
				))}
			</select>
			{error ? (
				<p role="alert" className="text-error-foreground">
					{error}
				</p>
			) : null}
			<div className="flex gap-2">
				<Button type="submit" size="sm" className="h-7 text-xs" disabled={busy}>
					{saving ? "保存中…" : "保存元数据"}
				</Button>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="h-7 text-xs"
					disabled={busy}
					aria-label="取消编辑元数据"
					onClick={() => setEditing(false)}
				>
					取消
				</Button>
			</div>
		</form>
	);
}
