import { Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import useSWR from "swr";
import { getProjects, projectsKey } from "@/domains/projects/api/projects";
import {
	type CatalogUseItem,
	type CatalogUseRequest,
	type CatalogUseTarget,
	newCatalogOperationID,
	type MediaAsset,
	useCatalogAssets,
} from "@/domains/workspace/api/media";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { ImportTarget } from "./ImportTarget";

export interface AssetLibraryUseDialogProps {
	assets: MediaAsset[];
	onChanged?: () => void;
	onClose: () => void;
}

const dialogErrorMessage = (error: unknown, fallback: string) => {
	if (error instanceof Error && error.message.trim()) return error.message.trim();
	return fallback;
};

const isImageOrVideo = (asset: MediaAsset) => asset.kind === "image" || asset.kind === "video";

const assetFilename = (assets: MediaAsset[], sourceId: string) =>
	assets.find((asset) => asset.id === sourceId)?.filename ?? sourceId;

/**
 * Official "Use in creation" dialog: save the selected assets into a project and
 * optionally bind images and videos to one section's candidate list.
 */
export function AssetLibraryUseDialog({ assets, onChanged, onClose }: AssetLibraryUseDialogProps) {
	const sourceProjectId = assets[0]?.projectId?.trim() ?? "";
	const [projectId, setProjectId] = useState(sourceProjectId);
	const [target, setTarget] = useState<CatalogUseTarget>();
	const [targetValid, setTargetValid] = useState(true);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [items, setItems] = useState<CatalogUseItem[]>([]);
	const payloadRef = useRef<CatalogUseRequest | undefined>(undefined);

	const { data: projectsData, error: projectsError } = useSWR(projectsKey, () => getProjects());
	const projects = projectsData?.projects ?? [];
	const locked = Boolean(sourceProjectId) || Boolean(payloadRef.current);
	const allBindable = assets.length > 0 && assets.every(isImageOrVideo);
	const canSubmit = !busy && Boolean(projectId.trim()) && targetValid && !projectsError;

	const submit = async () => {
		if (!canSubmit) return;
		payloadRef.current ??= {
			operationId: newCatalogOperationID(),
			sourceProjectId: sourceProjectId || undefined,
			projectId: projectId.trim(),
			target,
			assetIds: assets.map((asset) => asset.id),
		};

		setBusy(true);
		setError("");
		try {
			const result = await useCatalogAssets(payloadRef.current);
			onChanged?.();
			if (result.items.every((item) => !item.error)) {
				onClose();
				return;
			}
			setItems(result.items);
		} catch (err) {
			setError(dialogErrorMessage(err, "用于创作失败，请重试。"));
		} finally {
			setBusy(false);
		}
	};

	return (
		<AlertDialog
			open
			onOpenChange={(open) => {
				if (!open && !busy) onClose();
			}}
		>
			<AlertDialogContent
				className="max-w-md"
				onEscapeKeyDown={(event) => {
					if (busy) event.preventDefault();
				}}
			>
				<div className="grid gap-4">
					<AlertDialogTitle>用于创作</AlertDialogTitle>
					<AlertDialogDescription>
						将 {assets.length} 项素材保存到目标项目，可加入章节候选列表。已有选用结果保持不变。
					</AlertDialogDescription>
					<label className="grid gap-2 text-sm">
						选择目标项目
						<select
							aria-label="选择目标项目"
							className="h-9 w-full rounded-sm border border-input bg-background px-3 text-xs"
							value={projectId}
							disabled={busy || locked}
							onChange={(event) => {
								setProjectId(event.target.value);
								setTarget(undefined);
							}}
						>
							<option value="" disabled>
								选择一个项目
							</option>
							{projects.map((project) => (
								<option key={project.id} value={project.id}>
									{project.name}
								</option>
							))}
						</select>
					</label>
					{projectsError ? (
						<p role="alert" className="text-xs text-error-foreground">
							加载项目列表失败，请重试。
						</p>
					) : null}
					{allBindable ? (
						<ImportTarget
							projectId={projectId.trim() || undefined}
							value={target}
							onChange={setTarget}
							onValidity={setTargetValid}
							disabled={busy || Boolean(payloadRef.current)}
						/>
					) : (
						<p className="text-xs text-muted-foreground">
							当前选择包含其他文件类型，将仅保存到项目素材库。
						</p>
					)}
					{items.length > 0 ? (
						<div
							role="status"
							className="max-h-48 space-y-2 overflow-y-auto rounded-sm border border-border bg-muted/40 p-2 text-xs"
						>
							{items.map((item) => (
								<p
									key={item.sourceId}
									className={item.error ? "text-error-foreground" : "text-muted-foreground"}
								>
									{assetFilename(assets, item.sourceId)} ·{" "}
									{item.error || (item.added ? "已加入候选列表" : "已保存到项目")}
								</p>
							))}
						</div>
					) : null}
					{error ? (
						<p role="alert" className="text-xs text-error-foreground">
							{error}
						</p>
					) : null}
					<div className="flex justify-end gap-2">
						<Button variant="outline" type="button" disabled={busy} onClick={onClose}>
							<X className="size-4" />
							取消
						</Button>
						<Button type="button" disabled={!canSubmit} onClick={() => void submit()}>
							{busy ? <Loader2 className="size-4 animate-spin" /> : null}
							{busy ? "正在保存…" : items.length > 0 || error ? "重试" : "用于创作"}
						</Button>
					</div>
				</div>
			</AlertDialogContent>
		</AlertDialog>
	);
}
