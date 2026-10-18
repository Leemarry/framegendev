import { X, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useEffect } from "react";
import type { WorkflowNode } from "../../lib/workflow-schema-v4";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { PromptEditor } from "../config-editors/PromptEditor";
import { VideoParamsForm } from "../config-editors/VideoParamsForm";
import { ImageParamsForm } from "../config-editors/ImageParamsForm";

interface NodeConfigPanelProps {
	node: WorkflowNode | null;
	onConfigChange: (nodeId: string, config: Record<string, unknown>) => void;
	onClose: () => void;
}

/**
 * 节点配置面板（底部抽屉）
 * 高度 350px，可折叠
 */
export function NodeConfigPanel({ node, onConfigChange, onClose }: NodeConfigPanelProps) {
	const [collapsed, setCollapsed] = useState(false);
	const [localConfig, setLocalConfig] = useState<Record<string, unknown>>({});

	// 当选中节点变化时，同步配置
	useEffect(() => {
		if (node?.data.config) {
			setLocalConfig(node.data.config);
		} else {
			setLocalConfig({});
		}
	}, [node?.id, node?.data.config]);

	// 没有选中节点时不显示
	if (!node) {
		return null;
	}

	const handleChange = (key: string, value: unknown) => {
		const newConfig = { ...localConfig, [key]: value };
		setLocalConfig(newConfig);
		// 实时保存到父组件
		onConfigChange(node.id, newConfig);
	};

	const panelHeight = collapsed ? 48 : 350;

	return (
		<div
			className={cn(
				"fixed bottom-0 left-0 right-0 z-50",
				"bg-card border-t border-border shadow-lg",
				"transition-all duration-300",
			)}
			style={{ height: `${panelHeight}px` }}
		>
			{/* 标题栏 */}
			<div className="flex items-center justify-between px-4 h-12 border-b border-border">
				<div className="flex items-center gap-2">
					<span className="font-medium text-foreground">{node.data.label}</span>
					<span className="text-xs text-muted-foreground">({node.type})</span>
				</div>

				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setCollapsed(!collapsed)}
						className="h-8 w-8"
					>
						{collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
					</Button>
					<Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
						<X className="h-4 w-4" />
					</Button>
				</div>
			</div>

			{/* 配置内容区 */}
			{!collapsed && (
				<div className="overflow-y-auto p-4" style={{ height: "calc(100% - 48px)" }}>
					{renderConfigEditor(node, localConfig, handleChange)}
				</div>
			)}
		</div>
	);
}

/**
 * 根据节点类型渲染对应的配置编辑器
 */
function renderConfigEditor(
	node: WorkflowNode,
	config: Record<string, unknown>,
	onChange: (key: string, value: unknown) => void,
) {
	switch (node.type) {
		case "videoGeneration":
			return (
				<div className="space-y-4">
					<PromptEditor
						value={(config.prompt as string) || ""}
						onChange={(value) => onChange("prompt", value)}
						placeholder="描述你想生成的视频内容..."
					/>
					<VideoParamsForm config={config} onChange={onChange} />
				</div>
			);

		case "imageGeneration":
			return (
				<div className="space-y-4">
					<PromptEditor
						value={(config.prompt as string) || ""}
						onChange={(value) => onChange("prompt", value)}
						placeholder="描述你想生成的图像内容..."
					/>
					<ImageParamsForm config={config} onChange={onChange} />
				</div>
			);

		case "imageInpaint":
			return (
				<div className="space-y-4">
					<PromptEditor
						value={(config.prompt as string) || ""}
						onChange={(value) => onChange("prompt", value)}
						placeholder="描述重绘区域的内容..."
					/>
					<ImageParamsForm config={config} onChange={onChange} />
				</div>
			);

		case "videoTrim":
			return (
				<div className="space-y-4">
					<label className="text-sm font-medium">裁剪参数</label>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="text-xs text-muted-foreground">开始时间（秒）</label>
							<input
								type="number"
								value={(config.startTime as number) || 0}
								onChange={(e) => onChange("startTime", Number(e.target.value))}
								min={0}
								step={0.1}
								className="w-full px-3 py-2 bg-background border border-input rounded-md"
							/>
						</div>
						<div>
							<label className="text-xs text-muted-foreground">结束时间（秒）</label>
							<input
								type="number"
								value={(config.endTime as number) || 5}
								onChange={(e) => onChange("endTime", Number(e.target.value))}
								min={0}
								step={0.1}
								className="w-full px-3 py-2 bg-background border border-input rounded-md"
							/>
						</div>
					</div>
				</div>
			);

		case "videoExtractFrame":
			return (
				<div className="space-y-4">
					<label className="text-sm font-medium">截取参数</label>
					<div>
						<label className="text-xs text-muted-foreground">时间点（秒）</label>
						<input
							type="number"
							value={(config.timestamp as number) || 0}
							onChange={(e) => onChange("timestamp", Number(e.target.value))}
							min={0}
							step={0.1}
							className="w-full px-3 py-2 bg-background border border-input rounded-md"
						/>
					</div>
				</div>
			);

		case "imageNode":
		case "videoNode":
		case "audioNode":
		case "textNode":
			return (
				<div className="text-sm text-muted-foreground">
					素材节点，无需配置。可以从节点工具栏上传或替换素材。
				</div>
			);

		default:
			return <div className="text-sm text-muted-foreground">该节点类型暂不支持配置编辑。</div>;
	}
}
