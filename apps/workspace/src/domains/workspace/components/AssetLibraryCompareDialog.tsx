import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useState } from "react";
import type { MediaAsset } from "@/domains/workspace/api/media";
import { Button } from "@/shared/components/ui/button";
import { dialogContentMotion, dialogOverlayMotion } from "@/shared/components/ui/dialog-motion";
import { apiResourceURL } from "@/shared/lib/api-base";
import { cn } from "@/shared/lib/utils";

export interface AssetLibraryCompareDialogProps {
	assets: [MediaAsset, MediaAsset];
	onClose: () => void;
}

/**
 * Official comparison view: two images side by side with one shared zoom switch.
 * "原始尺寸" keeps the natural pixel size inside a scroll area, "适应窗口" fits.
 */
export function AssetLibraryCompareDialog({ assets, onClose }: AssetLibraryCompareDialogProps) {
	const [zoomed, setZoomed] = useState(false);

	return (
		<DialogPrimitive.Root
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogPrimitive.Portal>
				<DialogPrimitive.Overlay
					className={cn(
						"fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm p-4",
						dialogOverlayMotion,
					)}
				/>
				<DialogPrimitive.Content
					className={cn(
						"fixed left-1/2 top-1/2 z-50 flex h-[88vh] w-[calc(100vw-2rem)] max-w-7xl -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-2xl outline-none",
						dialogContentMotion,
					)}
				>
					<div className="flex items-center gap-3">
						<DialogPrimitive.Title className="flex-1 text-sm font-semibold">
							比较两张图片
						</DialogPrimitive.Title>
						<DialogPrimitive.Description className="sr-only">
							并排查看两张图片的细节差异。
						</DialogPrimitive.Description>
						<Button
							type="button"
							size="sm"
							variant="outline"
							className="h-7 rounded-sm px-2 text-xs"
							title={zoomed ? "适应窗口" : "原始尺寸"}
							aria-label={zoomed ? "适应窗口" : "原始尺寸"}
							onClick={() => setZoomed(!zoomed)}
						>
							{zoomed ? "适应窗口" : "原始尺寸"}
						</Button>
						<DialogPrimitive.Close asChild>
							<Button type="button" size="icon" variant="ghost" aria-label="关闭">
								<X className="size-4" />
							</Button>
						</DialogPrimitive.Close>
					</div>
					<div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
						{assets.map((asset) => (
							<figure key={asset.id} className="flex min-h-0 min-w-0 flex-col gap-2">
								<div
									className={cn(
										"flex min-h-0 flex-1 rounded-sm border border-border bg-ide-editor p-2",
										zoomed ? "overflow-auto" : "overflow-hidden items-center justify-center",
									)}
								>
									<img
										src={apiResourceURL(asset.url)}
										alt={asset.filename}
										className={cn(
											"m-auto",
											zoomed ? "max-h-none max-w-none" : "max-h-full max-w-full object-contain",
										)}
									/>
								</div>
								<figcaption className="truncate text-xs" title={asset.filename}>
									{asset.filename}
								</figcaption>
							</figure>
						))}
					</div>
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}
