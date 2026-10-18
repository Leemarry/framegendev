import { Settings, Save, Check, AlertCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

interface CanvasMenuProps {
	projectName: string;
	saveStatus: "idle" | "saving" | "saved" | "error";
	lastSavedTime?: Date;
	onOpenSettings: () => void;
}

/**
 * 画布菜单（左上角浮动层）
 * 布局：[项目名称] | [工作流选择器] | [⚙️ 设置] | [保存状态]
 */
export function CanvasMenu({
	projectName,
	saveStatus,
	lastSavedTime,
	onOpenSettings,
}: CanvasMenuProps) {
	return (
		<div
			className={cn(
				"absolute top-4 left-4 z-10",
				"flex items-center gap-3",
				"px-4 py-2 bg-card/95 backdrop-blur-sm",
				"border border-border rounded-lg shadow-lg",
			)}
		>
			{/* 项目名称（只读） */}
			<div className="text-sm font-medium text-foreground">{projectName}</div>

			{/* 分隔线 */}
			<div className="w-px h-4 bg-border" />

			{/* 占位：工作流选择器（在父组件传入） */}
			<div className="text-sm text-muted-foreground">{/* WorkflowSelector 会在这里渲染 */}</div>

			{/* 分隔线 */}
			<div className="w-px h-4 bg-border" />

			{/* 设置按钮 */}
			<Button variant="ghost" size="icon" onClick={onOpenSettings} className="h-8 w-8">
				<Settings className="h-4 w-4" />
			</Button>

			{/* 分隔线 */}
			<div className="w-px h-4 bg-border" />

			{/* 保存状态指示器 */}
			<SaveStatusIndicator status={saveStatus} lastSavedTime={lastSavedTime} />
		</div>
	);
}

/**
 * 保存状态指示器
 */
function SaveStatusIndicator({
	status,
	lastSavedTime,
}: {
	status: "idle" | "saving" | "saved" | "error";
	lastSavedTime?: Date;
}) {
	const getStatusDisplay = () => {
		switch (status) {
			case "saving":
				return {
					icon: <Save className="h-3.5 w-3.5 animate-pulse" />,
					text: "保存中...",
					className: "text-blue-500",
				};
			case "saved":
				return {
					icon: <Check className="h-3.5 w-3.5" />,
					text: lastSavedTime ? getTimeAgo(lastSavedTime) : "已保存",
					className: "text-green-500",
				};
			case "error":
				return {
					icon: <AlertCircle className="h-3.5 w-3.5" />,
					text: "保存失败",
					className: "text-red-500",
				};
			case "idle":
			default:
				return {
					icon: null,
					text: "",
					className: "",
				};
		}
	};

	const { icon, text, className } = getStatusDisplay();

	if (!text) return null;

	return (
		<div className={cn("flex items-center gap-1.5 text-xs", className)}>
			{icon}
			<span>{text}</span>
		</div>
	);
}

/**
 * 计算时间差（多久前保存的）
 */
function getTimeAgo(date: Date): string {
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffSec = Math.floor(diffMs / 1000);

	if (diffSec < 10) return "刚刚保存";
	if (diffSec < 60) return `${diffSec} 秒前`;
	if (diffSec < 3600) return `${Math.floor(diffSec / 60)} 分钟前`;
	return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}
