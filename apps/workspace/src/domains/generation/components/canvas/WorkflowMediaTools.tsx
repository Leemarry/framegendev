import { useEffect, useRef, useState } from "react";
import { GenerationModalShell } from "@/domains/documents/components/GenerationModalShell";
import { Button } from "@/shared/components/ui/button";
import { uploadMediaAsset, type MediaAsset } from "@/domains/workspace/api/media";
import { useToast } from "@/hooks/useToast";

export type MediaTool = "grid" | "mark" | "crop";
type Point = { x: number; y: number };
type Stroke = { points: Point[]; width: number; color: string };
const labels = { grid: "宫格切分", mark: "标记图片", crop: "裁剪图片" };

/** Local image operations export real files into the project's existing media catalog. */
export function WorkflowMediaTools({
	mode,
	src,
	label,
	projectId,
	onClose,
	onAssets,
}: {
	mode: MediaTool;
	src: string;
	label: string;
	projectId: string;
	onClose: () => void;
	onAssets: (assets: MediaAsset[]) => void;
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [image, setImage] = useState<HTMLImageElement | null>(null);
	const [error, setError] = useState("");
	const [rows, setRows] = useState(2);
	const [columns, setColumns] = useState(2);
	const [width, setWidth] = useState(8);
	const [strokes, setStrokes] = useState<Stroke[]>([]);
	const [crop, setCrop] = useState<{ start: Point; end: Point } | null>(null);
	const drawing = useRef(false);
	const [busy, setBusy] = useState(false);
	const [progress, setProgress] = useState("");
	const toast = useToast();
	useEffect(() => {
		const next = new Image();
		next.crossOrigin = "anonymous";
		next.onload = () => setImage(next);
		next.onerror = () => setError("图片读取失败，请检查素材是否可访问");
		next.src = src;
		return () => {
			next.onload = null;
			next.onerror = null;
		};
	}, [src]);
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!image || !canvas) return;
		canvas.width = image.naturalWidth;
		canvas.height = image.naturalHeight;
		const ctx = canvas.getContext("2d")!;
		ctx.drawImage(image, 0, 0);
		paintStrokes(ctx, strokes);
		ctx.strokeStyle = getComputedStyle(canvas).color;
		ctx.lineWidth = Math.max(2, image.naturalWidth / 500);
		ctx.setLineDash([ctx.lineWidth * 4, ctx.lineWidth * 2]);
		if (mode === "grid") {
			for (let x = 1; x < columns; x++) {
				ctx.beginPath();
				ctx.moveTo((canvas.width * x) / columns, 0);
				ctx.lineTo((canvas.width * x) / columns, canvas.height);
				ctx.stroke();
			}
			for (let y = 1; y < rows; y++) {
				ctx.beginPath();
				ctx.moveTo(0, (canvas.height * y) / rows);
				ctx.lineTo(canvas.width, (canvas.height * y) / rows);
				ctx.stroke();
			}
		} else if (mode === "crop" && crop)
			ctx.strokeRect(
				crop.start.x,
				crop.start.y,
				crop.end.x - crop.start.x,
				crop.end.y - crop.start.y,
			);
	}, [image, strokes, crop, mode, rows, columns]);
	const point = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
		const canvas = event.currentTarget;
		const rect = canvas.getBoundingClientRect();
		return {
			x: Math.max(
				0,
				Math.min(canvas.width, ((event.clientX - rect.left) * canvas.width) / rect.width),
			),
			y: Math.max(
				0,
				Math.min(canvas.height, ((event.clientY - rect.top) * canvas.height) / rect.height),
			),
		};
	};
	const validCrop =
		crop && Math.abs(crop.end.x - crop.start.x) >= 1 && Math.abs(crop.end.y - crop.start.y) >= 1;
	const save = async () => {
		if (!image) return;
		setBusy(true);
		const assets: MediaAsset[] = [];
		try {
			const regions =
				mode === "grid"
					? Array.from({ length: rows * columns }, (_, index) => {
							const x = Math.round(((index % columns) * image.naturalWidth) / columns);
							const y = Math.round((Math.floor(index / columns) * image.naturalHeight) / rows);
							return {
								x,
								y,
								width: Math.round((((index % columns) + 1) * image.naturalWidth) / columns) - x,
								height:
									Math.round(((Math.floor(index / columns) + 1) * image.naturalHeight) / rows) - y,
							};
						})
					: mode === "crop" && crop
						? [
								{
									x: Math.round(Math.min(crop.start.x, crop.end.x)),
									y: Math.round(Math.min(crop.start.y, crop.end.y)),
									width: Math.round(Math.abs(crop.end.x - crop.start.x)),
									height: Math.round(Math.abs(crop.end.y - crop.start.y)),
								},
							]
						: [{ x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight }];
			for (const [index, region] of regions.entries()) {
				if (region.width < 1 || region.height < 1) throw new Error("切分区域太小，请减少行列数");
				setProgress(`保存 ${index + 1} / ${regions.length}`);
				const result = document.createElement("canvas");
				result.width = region.width;
				result.height = region.height;
				const ctx = result.getContext("2d")!;
				ctx.drawImage(
					image,
					region.x,
					region.y,
					region.width,
					region.height,
					0,
					0,
					region.width,
					region.height,
				);
				if (mode === "mark") paintStrokes(ctx, strokes);
				const blob = await new Promise<Blob>((resolve, reject) =>
					result.toBlob(
						(value) => (value ? resolve(value) : reject(new Error("图片导出失败"))),
						"image/png",
					),
				);
				assets.push(
					await uploadMediaAsset(
						new File([blob], `${label}-${labels[mode]}-${index + 1}.png`, { type: "image/png" }),
						projectId,
					),
				);
			}
			toast.success(`已生成 ${assets.length} 张图片`);
			onClose();
		} catch (failure) {
			toast.error("图片处理失败", { description: String(failure) });
		} finally {
			if (assets.length) onAssets(assets);
			setBusy(false);
			setProgress("");
		}
	};
	return (
		<GenerationModalShell
			open
			onOpenChange={(open) => {
				if (!open && !busy) onClose();
			}}
			title={labels[mode]}
			titleId="workflow-media-tool"
			contentClassName="h-[85vh]"
		>
			<div className="nodrag nopan nowheel flex h-full flex-col gap-4 overflow-auto p-4">
				<div className="flex flex-wrap items-center gap-3 text-sm">
					{mode === "grid" && (
						<>
							{(["rows", "columns"] as const).map((axis) => (
								<label key={axis} className="flex items-center gap-2">
									{axis === "rows" ? "行数" : "列数"}
									<select
										aria-label={axis === "rows" ? "行数" : "列数"}
										disabled={busy}
										value={axis === "rows" ? rows : columns}
										onChange={(event) =>
											(axis === "rows" ? setRows : setColumns)(Number(event.target.value))
										}
										className="rounded border border-input bg-background p-2"
									>
										{[1, 2, 3, 4, 5, 6].map((value) => (
											<option key={value}>{value}</option>
										))}
									</select>
								</label>
							))}
							<span>将生成 {rows * columns} 张图片</span>
						</>
					)}
					{mode === "mark" && (
						<>
							<label>
								笔画粗细{" "}
								<input
									aria-label="笔画粗细"
									type="range"
									min={1}
									max={60}
									value={width}
									disabled={busy}
									onChange={(event) => setWidth(Number(event.target.value))}
								/>
							</label>
							<Button
								size="sm"
								variant="outline"
								disabled={busy || !strokes.length}
								onClick={() => setStrokes(strokes.slice(0, -1))}
							>
								撤销笔画
							</Button>
							<Button size="sm" variant="ghost" disabled={busy} onClick={() => setStrokes([])}>
								清空标记
							</Button>
						</>
					)}
					{mode === "crop" && <p>在图片上拖动，框选需要保留的区域。</p>}
				</div>
				{error && (
					<p role="alert" className="text-error-foreground">
						{error}
					</p>
				)}
				<div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded border border-border bg-muted p-2">
					{!image && !error && <p role="status">加载图片…</p>}
					<canvas
						ref={canvasRef}
						aria-label={labels[mode]}
						className="max-h-full max-w-full touch-none text-primary"
						style={{ cursor: mode === "grid" ? "default" : "crosshair" }}
						onPointerDown={(event) => {
							if (busy || !image || mode === "grid" || event.button !== 0) return;
							event.currentTarget.setPointerCapture(event.pointerId);
							drawing.current = true;
							const start = point(event);
							if (mode === "crop") setCrop({ start, end: start });
							else
								setStrokes((current) => [
									...current,
									{ points: [start], width, color: getComputedStyle(event.currentTarget).color },
								]);
						}}
						onPointerMove={(event) => {
							if (!drawing.current) return;
							const end = point(event);
							if (mode === "crop") setCrop((current) => (current ? { ...current, end } : null));
							else
								setStrokes((current) =>
									current.map((stroke, index) =>
										index === current.length - 1
											? { ...stroke, points: [...stroke.points, end] }
											: stroke,
									),
								);
						}}
						onPointerUp={() => {
							drawing.current = false;
						}}
						onPointerCancel={() => {
							drawing.current = false;
						}}
					/>
				</div>
				<div className="flex items-center justify-end gap-2">
					<p role="status" className="mr-auto text-sm text-muted-foreground">
						{progress || "结果保存为新素材和节点"}
					</p>
					<Button variant="outline" disabled={busy} onClick={onClose}>
						取消
					</Button>
					<Button
						disabled={busy || !image || (mode === "crop" && !validCrop)}
						onClick={() => void save()}
					>
						{busy ? "处理中…" : "保存并加入画布"}
					</Button>
				</div>
			</div>
		</GenerationModalShell>
	);
}

function paintStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[]) {
	ctx.lineJoin = "round";
	ctx.lineCap = "round";
	for (const stroke of strokes) {
		ctx.strokeStyle = stroke.color;
		ctx.lineWidth = stroke.width;
		ctx.beginPath();
		stroke.points.forEach((point, index) =>
			index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y),
		);
		if (stroke.points.length === 1) ctx.lineTo(stroke.points[0].x + 0.1, stroke.points[0].y);
		ctx.stroke();
	}
}
