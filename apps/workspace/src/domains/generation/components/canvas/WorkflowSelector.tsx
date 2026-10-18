import { Plus, Copy, FileText, ChevronDown } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import type { WorkflowDocument } from "../../api/workflow";

interface WorkflowSelectorProps {
	workflows: WorkflowDocument[];
	currentWorkflowId: string | null;
	onSelectWorkflow: (workflowId: string) => void;
	onCreateWorkflow: (name: string, fromTemplate?: string) => void;
	onOpenTemplateLibrary: () => void;
}

/**
 * 工作流选择器（下拉菜单）
 * 显示当前工作流名称，点击展开列表
 */
export function WorkflowSelector({
	workflows,
	currentWorkflowId,
	onSelectWorkflow,
	onCreateWorkflow,
	onOpenTemplateLibrary,
}: WorkflowSelectorProps) {
	const currentWorkflow = workflows.find((w) => w.id === currentWorkflowId);
	const displayName = currentWorkflow?.name || "未命名工作流";

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className="h-8 px-3 gap-1">
					<span className="text-sm">{displayName}</span>
					<ChevronDown className="h-3.5 w-3.5" />
				</Button>
			</DropdownMenuTrigger>

			<DropdownMenuContent align="start" className="w-64">
				<div className="px-2 py-1.5 text-xs font-medium">工作流</div>
				<DropdownMenuSeparator />

				{/* 快捷操作 */}
				<DropdownMenuItem
					onClick={() => {
						const name = prompt("输入工作流名称：", `工作流 ${workflows.length + 1}`);
						if (name) onCreateWorkflow(name);
					}}
				>
					<Plus className="h-4 w-4 mr-2" />
					新建空白工作流
				</DropdownMenuItem>

				<DropdownMenuItem onClick={onOpenTemplateLibrary}>
					<FileText className="h-4 w-4 mr-2" />
					从模板创建...
				</DropdownMenuItem>

				{currentWorkflow && (
					<DropdownMenuItem
						onClick={() => {
							const name = prompt("输入副本名称：", `${currentWorkflow.name} - 副本`);
							if (name) onCreateWorkflow(name);
						}}
					>
						<Copy className="h-4 w-4 mr-2" />
						复制当前工作流
					</DropdownMenuItem>
				)}

				<DropdownMenuSeparator />

				{/* 工作流列表 */}
				{workflows.length === 0 ? (
					<div className="px-2 py-4 text-sm text-muted-foreground text-center">暂无工作流</div>
				) : (
					workflows.map((workflow) => (
						<DropdownMenuItem
							key={workflow.id}
							onClick={() => onSelectWorkflow(workflow.id)}
							className={currentWorkflowId === workflow.id ? "bg-accent" : ""}
						>
							<div className="flex-1 truncate">
								<div className="font-medium">{workflow.name}</div>
								<div className="text-xs text-muted-foreground">
									{workflow.graphData.nodes.length} 个节点
								</div>
							</div>
							{currentWorkflowId === workflow.id && (
								<div className="ml-2 h-2 w-2 rounded-full bg-primary" />
							)}
						</DropdownMenuItem>
					))
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
