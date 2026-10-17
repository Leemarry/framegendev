import { Loader2, Tags } from "lucide-react";
import type React from "react";
import { useState } from "react";
import type { MediaAsset } from "@/domains/workspace/api/media";
import { formatBytes } from "@/domains/documents/components/project-asset-preview.helpers";
import { commonLibraryTags } from "@/domains/workspace/lib/library-selection";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

export interface AssetLibraryBulkPanelProps {
	assets: MediaAsset[];
	busy: boolean;
	folderActions?: React.ReactNode;
	onApplyTags: (added: string[], removed: string[]) => void;
	onCompare?: () => void;
	onRestore: () => void;
	onToggleFavorite: () => void;
	onTrash: () => void;
	trashMode: boolean;
}

const parseTagDraft = (draft: string) => {
	const tags: string[] = [];
	for (const raw of draft.split(",")) {
		const tag = raw.trim();
		if (tag && !tags.includes(tag)) tags.push(tag);
	}

	return tags;
};

/**
 * Official bulk panel: every action applies to all selected assets while the
 * properties that differ keep their own values.
 */
export function AssetLibraryBulkPanel({
	assets,
	busy,
	folderActions,
	onApplyTags,
	onCompare,
	onRestore,
	onToggleFavorite,
	onTrash,
	trashMode,
}: AssetLibraryBulkPanelProps) {
	const commonTags = commonLibraryTags(assets);
	const [draft, setDraft] = useState(commonTags.join(", "));
	const edited = parseTagDraft(draft);
	const tagsChanged =
		edited.length !== commonTags.length || edited.some((tag) => !commonTags.includes(tag));
	const totalBytes = assets.reduce((sum, asset) => sum + (asset.sizeBytes ?? 0), 0);

	return (
		<div className="flex min-h-0 flex-col gap-4 overflow-y-auto bg-card p-4 text-xs">
			<header className="grid gap-1">
				<p className="text-sm font-medium">已选择 {assets.length} 项</p>
				<p className="text-muted-foreground">{formatBytes(totalBytes)}</p>
			</header>
			<p className="text-muted-foreground">
				以下操作应用于全部选中素材。其他不同的属性保持各自的值。
			</p>
			<section className="grid gap-2 border-t border-border pt-3">
				<h3 className="flex items-center gap-1.5 font-medium">
					<Tags className="size-3.5" />
					共同标签
				</h3>
				<Input
					aria-label="共同标签"
					className="h-8"
					value={draft}
					disabled={busy}
					placeholder="用逗号分隔标签"
					onChange={(event) => setDraft(event.target.value)}
				/>
				<Button
					type="button"
					size="sm"
					variant="outline"
					className="w-full"
					disabled={busy || !tagsChanged}
					onClick={() => {
						const removed = commonTags.filter((tag) => !edited.includes(tag));
						const added = edited.filter((tag) => !commonTags.includes(tag));
						onApplyTags(added, removed);
					}}
				>
					{busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
					应用到全部
				</Button>
			</section>
			<div className="grid gap-2 border-t border-border pt-3">
				{onCompare ? (
					<Button
						type="button"
						size="sm"
						variant="outline"
						className="w-full"
						disabled={busy}
						onClick={onCompare}
					>
						比较两张图片
					</Button>
				) : null}
				{folderActions}
				<Button
					type="button"
					size="sm"
					variant="ghost"
					className="w-full"
					disabled={busy}
					onClick={onToggleFavorite}
				>
					切换收藏
				</Button>
				<Button
					type="button"
					size="sm"
					variant="ghost"
					className="w-full"
					disabled={busy}
					onClick={trashMode ? onRestore : onTrash}
				>
					{trashMode ? "恢复" : "移入回收站"}
				</Button>
			</div>
		</div>
	);
}
