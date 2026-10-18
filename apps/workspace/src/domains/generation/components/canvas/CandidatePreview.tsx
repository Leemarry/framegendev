import { Check, X, Eye, Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import type { NodeDataType, WorkflowNode } from "../../lib/workflow-schema-v4";

interface WorkflowExecutionResult {
	nodeId: string;
	node: WorkflowNode;
	executionTime?: number;
	outputAssets?: Array<{ type: NodeDataType; url?: string; localPath?: string }>;
}

interface CandidatePreviewProps {
	results: WorkflowExecutionResult[];
	onAdoptCandidate: (resultId: string, nodeId: string) => void;
	onDismiss: () => void;
}

/**
 * 候选结果预览区（底部展开，在 NodeConfigPanel 下方）
 * 显示工作流执行完成后的所有输出节点结果
 */
export function CandidatePreview({ results, onAdoptCandidate, onDismiss }: CandidatePreviewProps) {
	const [selectedIndex, setSelectedIndex] = useState(0);

	if (results.length === 0) {
		return null;
	}

	const currentResult = results[selectedIndex];

	return (
		<div
			className={cn(
				"fixed bottom-0 left-0 right-0 z-40",
				"bg-card/95 backdrop-blur-sm border-t border-border shadow-2xl",
				"transition-all duration-300",
			)}
			style={{ height: "280px" }}
		>
			{/* 标题栏 */}
			<div className="flex items-center justify-between px-4 h-12 border-b border-border">
				<div className="flex items-center gap-2">
					<span className="font-medium text-foreground">生成结果</span>
					<span className="text-xs text-muted-foreground">（{results.length} 个候选）</span>
				</div>

				<Button variant="ghost" size="icon" onClick={onDismiss} className="h-8 w-8">
					<X className="h-4 w-4" />
				</Button>
			</div>

			{/* 内容区 */}
			<div className="flex h-[calc(100%-48px)]">
				{/* 左侧：缩略图列表 */}
				<div className="w-48 border-r border-border overflow-y-auto p-2 space-y-2">
					{results.map((result, index) => (
						<button
							key={result.nodeId}
							type="button"
							onClick={() => setSelectedIndex(index)}
							className={cn(
								"w-full aspect-video rounded-md overflow-hidden",
								"border-2 transition-all",
								selectedIndex === index
									? "border-primary ring-2 ring-primary/20"
									: "border-border hover:border-primary/50",
							)}
						>
							<ResultThumbnail result={result} />
						</button>
					))}
				</div>

				{/* 中间：大预览 */}
				<div className="flex-1 flex items-center justify-center p-4 bg-muted/30">
					<ResultPreview result={currentResult} />
				</div>

				{/* 右侧：操作区 */}
				<div className="w-64 border-l border-border p-4 space-y-4">
					<div className="space-y-2">
						<div className="text-sm font-medium text-foreground">
							{currentResult.node.data.label}
						</div>
						<div className="text-xs text-muted-foreground">节点 ID: {currentResult.nodeId}</div>
					</div>

					<div className="space-y-2">
						<Button
							className="w-full"
							onClick={() => onAdoptCandidate(currentResult.nodeId, currentResult.nodeId)}
						>
							<Check className="h-4 w-4 mr-2" />
							采用到分镜
						</Button>

						<Button variant="outline" className="w-full">
							<Eye className="h-4 w-4 mr-2" />
							在新窗口预览
						</Button>

						<Button variant="outline" className="w-full">
							<Download className="h-4 w-4 mr-2" />
							下载
						</Button>
					</div>

					{/* 生成信息 */}
					<div className="pt-4 border-t border-border space-y-1 text-xs text-muted-foreground">
						<div>
							<span className="font-medium">模型：</span>
							{currentResult.node.data.config?.modelId || "未知"}
						</div>
						<div>
							<span className="font-medium">耗时：</span>
							{currentResult.executionTime ? `${currentResult.executionTime}ms` : "未知"}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

/**
 * 结果缩略图
 */
function ResultThumbnail({ result }: { result: WorkflowExecutionResult }) {
	if (!result.outputAssets || result.outputAssets.length === 0) {
		return (
			<div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
				无预览
			</div>
		);
	}

	const asset = result.outputAssets[0];
	const url = asset.url || asset.localPath;

	if (asset.type === "IMAGE") {
		return <img src={url} alt="" className="w-full h-full object-cover" />;
	}

	if (asset.type === "VIDEO") {
		return <video src={url} className="w-full h-full object-cover" muted />;
	}

	return (
		<div className="w-full h-full bg-muted flex items-center justify-center text-xs">
			{asset.type}
		</div>
	);
}

/**
 * 大预览
 */
function ResultPreview({ result }: { result: WorkflowExecutionResult }) {
	if (!result.outputAssets || result.outputAssets.length === 0) {
		return <div className="text-muted-foreground text-sm">该节点没有生成可预览的资产</div>;
	}

	const asset = result.outputAssets[0];
	const url = asset.url || asset.localPath;

	if (asset.type === "IMAGE") {
		return (
			<img src={url} alt="" className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
		);
	}

	if (asset.type === "VIDEO") {
		return <video src={url} controls className="max-w-full max-h-full rounded-lg shadow-lg" />;
	}

	if (asset.type === "AUDIO") {
		return (
			<div className="w-full max-w-md">
				<audio src={url} controls className="w-full" />
			</div>
		);
	}

	return <div className="text-muted-foreground text-sm">不支持预览 {asset.type} 类型</div>;
}
