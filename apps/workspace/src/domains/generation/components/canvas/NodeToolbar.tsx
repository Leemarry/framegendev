import {
	Wand2,
	Image as ImageIcon,
	Video,
	Music,
	Type,
	Scissors,
	Frame,
	Paintbrush,
	Layers,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import type { WorkflowNode } from "../../lib/workflow-schema-v4";

type NodeType = WorkflowNode["type"];

interface NodeToolbarProps {
	onCreateNode: (type: NodeType, label: string) => void;
	className?: string;
}

/**
 * 节点工具栏（画布左侧悬浮）
 * 点击按钮创建对应类型的节点
 */
export function NodeToolbar({ onCreateNode, className }: NodeToolbarProps) {
	const tools: Array<{
		type: NodeType;
		label: string;
		icon: React.ReactNode;
		category: "generation" | "material" | "edit";
	}> = [
		// 生成类
		{ type: "videoGeneration", label: "视频生成", icon: <Wand2 />, category: "generation" },
		{ type: "imageGeneration", label: "图像生成", icon: <ImageIcon />, category: "generation" },

		// 素材类
		{ type: "imageNode", label: "图片素材", icon: <ImageIcon />, category: "material" },
		{ type: "videoNode", label: "视频素材", icon: <Video />, category: "material" },
		{ type: "audioNode", label: "音频素材", icon: <Music />, category: "material" },
		{ type: "textNode", label: "文本", icon: <Type />, category: "material" },

		// 编辑类
		{ type: "videoTrim", label: "裁剪", icon: <Scissors />, category: "edit" },
		{ type: "videoExtractFrame", label: "截帧", icon: <Frame />, category: "edit" },
		{ type: "imageInpaint", label: "局部重绘", icon: <Paintbrush />, category: "edit" },
		{ type: "videoConcat", label: "拼接", icon: <Layers />, category: "edit" },
	];

	return (
		<div
			className={cn(
				"absolute left-4 top-20 z-10",
				"flex flex-col gap-2",
				"p-2 bg-card/95 backdrop-blur-sm",
				"border border-border rounded-lg shadow-lg",
				className,
			)}
		>
			{/* 生成类 */}
			<div className="space-y-1">
				<div className="text-xs text-muted-foreground px-2 py-1">生成</div>
				{tools
					.filter((t) => t.category === "generation")
					.map((tool) => (
						<ToolButton
							key={tool.type}
							icon={tool.icon}
							label={tool.label}
							onClick={() => onCreateNode(tool.type, tool.label)}
						/>
					))}
			</div>

			<div className="h-px bg-border" />

			{/* 素材类 */}
			<div className="space-y-1">
				<div className="text-xs text-muted-foreground px-2 py-1">素材</div>
				{tools
					.filter((t) => t.category === "material")
					.map((tool) => (
						<ToolButton
							key={tool.type}
							icon={tool.icon}
							label={tool.label}
							onClick={() => onCreateNode(tool.type, tool.label)}
						/>
					))}
			</div>

			<div className="h-px bg-border" />

			{/* 编辑类 */}
			<div className="space-y-1">
				<div className="text-xs text-muted-foreground px-2 py-1">编辑</div>
				{tools
					.filter((t) => t.category === "edit")
					.map((tool) => (
						<ToolButton
							key={tool.type}
							icon={tool.icon}
							label={tool.label}
							onClick={() => onCreateNode(tool.type, tool.label)}
						/>
					))}
			</div>
		</div>
	);
}

/**
 * 工具按钮（图标 + 标签）
 */
function ToolButton({
	icon,
	label,
	onClick,
}: {
	icon: React.ReactNode;
	label: string;
	onClick: () => void;
}) {
	return (
		<Button
			variant="ghost"
			className="w-full justify-start gap-2 h-9 px-3 text-sm"
			onClick={onClick}
		>
			<div className="h-4 w-4">{icon}</div>
			<span>{label}</span>
		</Button>
	);
}
