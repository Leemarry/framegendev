import { Play, Square, RefreshCw, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { cn } from "@/shared/lib/utils";
import {
	executeWorkflow,
	cancelWorkflowExecution,
	retryWorkflowExecution,
	useWorkflowExecution,
} from "../../api/workflow";
import type { WorkflowExecutionStatus, WorkflowNodeStatus } from "@/api/types/workflow-execution";
import { useToast } from "@/hooks/useToast";

interface Props {
	workflowId: string;
	executionId: string | null;
	onExecutionStart?: (executionId: string) => void;
	disabledReason?: string;
	className?: string;
}

const statusIcons: Record<WorkflowExecutionStatus | WorkflowNodeStatus, React.ReactNode> = {
	pending: <Clock className="h-4 w-4" />,
	running: <Loader2 className="h-4 w-4 animate-spin" />,
	completed: <CheckCircle className="h-4 w-4" />,
	failed: <XCircle className="h-4 w-4" />,
	cancelled: <Square className="h-4 w-4" />,
	skipped: <Clock className="h-4 w-4" />,
};

const statusColors: Record<WorkflowExecutionStatus | WorkflowNodeStatus, string> = {
	pending: "text-muted-foreground",
	running: "text-blue-500",
	completed: "text-green-500",
	failed: "text-red-500",
	cancelled: "text-yellow-500",
	skipped: "text-gray-400",
};

export function WorkflowExecutionPanel({
	workflowId,
	executionId,
	onExecutionStart,
	disabledReason,
	className,
}: Props) {
	const toast = useToast();
	const [isExecuting, setIsExecuting] = useState(false);
	const { data: executionData, error, mutate } = useWorkflowExecution(workflowId, executionId);

	const execution = executionData?.execution;

	const handleExecute = async () => {
		if (disabledReason) return;
		try {
			setIsExecuting(true);
			const result = await executeWorkflow(workflowId);
			onExecutionStart?.(result.execution.id);
			mutate();
			toast.success("工作流已启动");
		} catch (err) {
			toast.error("启动失败", { description: String(err) });
		} finally {
			setIsExecuting(false);
		}
	};

	const handleCancel = async () => {
		if (!executionId) return;
		try {
			await cancelWorkflowExecution(workflowId, executionId);
			mutate();
			toast.info("已取消执行");
		} catch (err) {
			toast.error("取消失败", { description: String(err) });
		}
	};

	const handleRetry = async () => {
		if (!executionId || !execution) return;
		try {
			const failedNodes = Object.entries(execution.nodeStatuses)
				.filter(([_, status]) => status.status === "failed")
				.map(([nodeId]) => nodeId);
			await retryWorkflowExecution(workflowId, executionId, { failedNodeIds: failedNodes });
			mutate();
			toast.success("重试已启动");
		} catch (err) {
			toast.error("重试失败", { description: String(err) });
		}
	};

	const renderControls = () => {
		if (!execution) {
			return (
				<Button
					onClick={handleExecute}
					disabled={isExecuting || !!disabledReason}
					title={disabledReason}
					size="sm"
				>
					{isExecuting ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							启动中...
						</>
					) : (
						<>
							<Play className="mr-2 h-4 w-4" />
							执行工作流
						</>
					)}
				</Button>
			);
		}

		switch (execution.status) {
			case "running":
				return (
					<Button onClick={handleCancel} variant="destructive" size="sm">
						<Square className="mr-2 h-4 w-4" />
						取消
					</Button>
				);
			case "failed":
				return (
					<Button onClick={handleRetry} variant="outline" size="sm">
						<RefreshCw className="mr-2 h-4 w-4" />
						重试失败节点
					</Button>
				);
			case "completed":
				return (
					<Button onClick={handleExecute} variant="outline" size="sm">
						<Play className="mr-2 h-4 w-4" />
						重新执行
					</Button>
				);
			default:
				return null;
		}
	};

	return (
		<Card className={cn("border-border", className)}>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="text-base">执行状态</CardTitle>
						{disabledReason && <CardDescription>{disabledReason}</CardDescription>}
						{execution && (
							<CardDescription className="mt-1">
								{execution.status === "running" && `进度: ${Math.round(execution.progress)}%`}
								{execution.completedAt &&
									`完成于 ${new Date(execution.completedAt).toLocaleString()}`}
							</CardDescription>
						)}
					</div>
					<div className="flex gap-2">{renderControls()}</div>
				</div>
			</CardHeader>

			{execution && (
				<CardContent>
					<div className="flex items-center gap-2 mb-4">
						<span className={cn("flex items-center gap-1.5", statusColors[execution.status])}>
							{statusIcons[execution.status]}
							<span className="text-sm font-medium capitalize">{execution.status}</span>
						</span>
						{execution.error && (
							<Badge variant="destructive" className="text-xs">
								{execution.error}
							</Badge>
						)}
					</div>

					{Object.keys(execution.nodeStatuses).length > 0 && (
						<div>
							<h4 className="text-sm font-medium mb-2">节点状态</h4>
							<ScrollArea className="h-[200px]">
								<div className="space-y-2">
									{Object.entries(execution.nodeStatuses).map(([nodeId, status]) => (
										<div
											key={nodeId}
											className="flex items-center justify-between p-2 rounded-md bg-muted/50"
										>
											<div className="flex items-center gap-2">
												<span className={cn(statusColors[status.status])}>
													{statusIcons[status.status]}
												</span>
												<span className="text-sm font-mono">{nodeId}</span>
											</div>
											{status.error && (
												<Badge variant="destructive" className="text-xs">
													{status.error}
												</Badge>
											)}
											{status.outputAssetIds.length > 0 && (
												<Badge variant="secondary" className="text-xs">
													{status.outputAssetIds.length} 个输出
												</Badge>
											)}
										</div>
									))}
								</div>
							</ScrollArea>
						</div>
					)}
				</CardContent>
			)}

			{error && (
				<CardContent>
					<div className="text-sm text-destructive">加载执行状态失败: {String(error)}</div>
				</CardContent>
			)}
		</Card>
	);
}
