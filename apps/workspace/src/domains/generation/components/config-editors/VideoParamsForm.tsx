import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";

interface VideoParamsFormProps {
	config: Record<string, unknown>;
	onChange: (key: string, value: unknown) => void;
}

// Mock 模型列表（后续从 API 获取）
const VIDEO_MODELS = [
	{ id: "kling-1.6", name: "Kling 1.6" },
	{ id: "runway-gen3", name: "Runway Gen-3" },
	{ id: "pika-1.5", name: "Pika 1.5" },
	{ id: "stable-video", name: "Stable Video Diffusion" },
];

const ASPECT_RATIOS = [
	{ value: "16:9", label: "16:9 横屏" },
	{ value: "9:16", label: "9:16 竖屏" },
	{ value: "1:1", label: "1:1 方形" },
	{ value: "4:3", label: "4:3 标准" },
];

const DURATIONS = [
	{ value: "5", label: "5 秒" },
	{ value: "10", label: "10 秒" },
	{ value: "15", label: "15 秒" },
	{ value: "30", label: "30 秒" },
];

/**
 * 视频生成参数表单
 */
export function VideoParamsForm({ config, onChange }: VideoParamsFormProps) {
	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<label className="text-sm font-medium">模型</label>
				<Select
					value={(config.modelId as string) || VIDEO_MODELS[0].id}
					onValueChange={(value) => onChange("modelId", value)}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{VIDEO_MODELS.map((model) => (
							<SelectItem key={model.id} value={model.id}>
								{model.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-2">
					<label className="text-sm font-medium">画面比例</label>
					<Select
						value={(config.aspectRatio as string) || "16:9"}
						onValueChange={(value) => onChange("aspectRatio", value)}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{ASPECT_RATIOS.map((ratio) => (
								<SelectItem key={ratio.value} value={ratio.value}>
									{ratio.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-2">
					<label className="text-sm font-medium">时长</label>
					<Select
						value={String(config.duration || "5")}
						onValueChange={(value) => onChange("duration", Number(value))}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{DURATIONS.map((duration) => (
								<SelectItem key={duration.value} value={duration.value}>
									{duration.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className="space-y-2">
				<label className="text-sm font-medium">候选数量</label>
				<input
					type="number"
					value={(config.candidateCount as number) || 1}
					onChange={(e) => onChange("candidateCount", Number(e.target.value))}
					min={1}
					max={4}
					className="w-full px-3 py-2 bg-background border border-input rounded-md"
				/>
				<p className="text-xs text-muted-foreground">生成多个候选结果供选择（1-4）</p>
			</div>
		</div>
	);
}
