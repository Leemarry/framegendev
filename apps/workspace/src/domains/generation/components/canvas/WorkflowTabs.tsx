import { Plus, MoreVertical } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { cn } from "@/shared/lib/utils";
import type { ListWorkflowsResponse } from "../../api/workflow";

interface WorkflowTabsProps {
	workflows: ListWorkflowsResponse["workflows"];
	activeWorkflowId: string | null;
	onSelectWorkflow: (workflowId: string) => void;
	onCreateWorkflow: () => void;
	onRenameWorkflow: (workflowId: string) => void;
	onDeleteWorkflow: (workflowId: string) => void;
	className?: string;
}

/**
 * 工作流标签页组件
 *
 * 展示一个分镜的所有工作流实例，支持切换、新建、重命名、删除。
 */
export function WorkflowTabs({
	workflows,
	activeWorkflowId,
	onSelectWorkflow,
	onCreateWorkflow,
	onRenameWorkflow,
	onDeleteWorkflow,
	className,
}: WorkflowTabsProps) {
	return (
		<div className={cn("flex items-center gap-1 border-b border-border bg-card", className)}>
			{/* 工作流标签列表 */}
			<div className="flex-1 flex items-center gap-1 overflow-x-auto px-2">
				{workflows.map((workflow) => {
					const isActive = workflow.id === activeWorkflowId;
					return (
						<div
							key={workflow.id}
							className={cn(
								"group flex items-center gap-1.5 px-3 py-2 rounded-t-md border border-b-0 transition-colors",
								isActive
									? "bg-background border-border"
									: "bg-card border-transparent hover:bg-muted",
							)}
						>
							{/* 标签名称 */}
							<button
								type="button"
								aria-pressed={isActive}
								onClick={() => onSelectWorkflow(workflow.id)}
								className="text-sm font-medium truncate max-w-[160px]"
							>
								{workflow.name}
							</button>

							{/* 操作菜单 */}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										aria-label={`工作流操作：${workflow.name}`}
										className="h-5 w-5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
									>
										<MoreVertical className="h-3.5 w-3.5" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="start">
									<DropdownMenuItem onClick={() => onRenameWorkflow(workflow.id)}>
										重命名
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										onClick={() => onDeleteWorkflow(workflow.id)}
										className="text-destructive"
									>
										删除工作流
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					);
				})}
			</div>

			{/* 新建工作流按钮 */}
			<Button variant="ghost" size="sm" onClick={onCreateWorkflow} className="shrink-0 mr-2">
				<Plus className="h-4 w-4 mr-1" />
				新建工作流
			</Button>
		</div>
	);
}
