import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";
import type { WorkflowTemplateResponse } from "../../api/workflow";

interface WorkflowCreateDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	templates: WorkflowTemplateResponse["templates"];
	onConfirm: (params: {
		name: string;
		description: string;
		templateRef: string | null;
	}) => Promise<boolean>;
}

/**
 * 新建工作流对话框
 *
 * 支持从空白画布或模板创建工作流实例。
 */
export function WorkflowCreateDialog({
	open,
	onOpenChange,
	templates,
	onConfirm,
}: WorkflowCreateDialogProps) {
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [templateRef, setTemplateRef] = useState<string | null>(null);

	const [submitting, setSubmitting] = useState(false);

	const handleConfirm = async () => {
		if (!name.trim() || submitting) return;
		setSubmitting(true);
		try {
			if (!(await onConfirm({ name: name.trim(), description: description.trim(), templateRef })))
				return;
			setName("");
			setDescription("");
			setTemplateRef(null);
			onOpenChange(false);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<AlertDialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!submitting) onOpenChange(nextOpen);
			}}
		>
			<AlertDialogContent className="max-w-md">
				<AlertDialogHeader>
					<AlertDialogTitle>新建工作流</AlertDialogTitle>
					<AlertDialogDescription>
						为当前分镜创建一个新的工作流实例，可以从空白画布或模板开始。
					</AlertDialogDescription>
				</AlertDialogHeader>

				<div className="space-y-4 py-4">
					{/* 工作流名称 */}
					<div className="space-y-2">
						<Label htmlFor="workflow-name">工作流名称</Label>
						<Input
							id="workflow-name"
							placeholder="例如：方案A、快速生成、精细控制"
							value={name}
							onChange={(e) => setName(e.target.value)}
							autoFocus
						/>
					</div>

					{/* 工作流描述 */}
					<div className="space-y-2">
						<Label htmlFor="workflow-description">描述（可选）</Label>
						<Textarea
							id="workflow-description"
							placeholder="简要说明这个工作流的用途或特点"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							rows={3}
						/>
					</div>

					{/* 选择模板 */}
					<div className="space-y-2">
						<Label htmlFor="workflow-template">起始模板</Label>
						<Select
							value={templateRef || "blank"}
							onValueChange={(v) => setTemplateRef(v === "blank" ? null : v)}
						>
							<SelectTrigger id="workflow-template">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="blank">空白画布</SelectItem>
								{templates
									.filter((t) => t.category === "builtin")
									.map((template) => (
										<SelectItem key={template.id} value={template.id}>
											{template.name}
											{template.description && (
												<span className="text-xs text-muted-foreground ml-2">
													— {template.description}
												</span>
											)}
										</SelectItem>
									))}
							</SelectContent>
						</Select>
						<p className="text-xs text-muted-foreground">
							从模板创建会复制模板的节点和连线，你可以自由修改。
						</p>
					</div>
				</div>

				<AlertDialogFooter>
					<Button variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>
						取消
					</Button>
					<Button onClick={handleConfirm} disabled={!name.trim() || submitting}>
						{submitting ? "创建中..." : "创建"}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
