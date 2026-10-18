import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";

interface ImageParamsFormProps {
	config: Record<string, unknown>;
	onChange: (key: string, value: unknown) => void;
}

// Mock 图像模型列表
const IMAGE_MODELS = [
	{ id: "sd3", name: "Stable Diffusion 3" },
	{ id: "sdxl", name: "SDXL" },
	{ id: "flux-pro", name: "Flux Pro" },
	{ id: "midjourney-6", name: "Midjourney v6" },
];

const IMAGE_SIZES = [
	{ value: "1024x1024", label: "1024×1024（正方形）" },
	{ value: "1024x768", label: "1024×768（横屏）" },
	{ value: "768x1024", label: "768×1024（竖屏）" },
	{ value: "1280x720", label: "1280×720（16:9）" },
];

/**
 * 图像生成参数表单
 */
export function ImageParamsForm({ config, onChange }: ImageParamsFormProps) {
	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<label className="text-sm font-medium">模型</label>
				<Select
					value={(config.modelId as string) || IMAGE_MODELS[0].id}
					onValueChange={(value) => onChange("modelId", value)}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{IMAGE_MODELS.map((model) => (
							<SelectItem key={model.id} value={model.id}>
								{model.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="space-y-2">
				<label className="text-sm font-medium">图像尺寸</label>
				<Select
					value={(config.size as string) || "1024x1024"}
					onValueChange={(value) => onChange("size", value)}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{IMAGE_SIZES.map((size) => (
							<SelectItem key={size.value} value={size.value}>
								{size.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
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
			</div>

			<div className="space-y-2">
				<label className="text-sm font-medium">随机种子</label>
				<input
					type="number"
					value={(config.seed as number) || -1}
					onChange={(e) => onChange("seed", Number(e.target.value))}
					placeholder="-1 为随机"
					className="w-full px-3 py-2 bg-background border border-input rounded-md"
				/>
				<p className="text-xs text-muted-foreground">相同的种子会产生相似的结果</p>
			</div>
		</div>
	);
}
