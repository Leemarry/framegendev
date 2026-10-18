import { useContext, useState } from "react";
import { NodeResizer, type NodeProps } from "@xyflow/react";
import { NodeConfigContext, type CanvasNode } from "./WorkflowNodeView";
import { cn } from "@/shared/lib/utils";

export function WorkflowGroupView({ data, selected }: NodeProps<CanvasNode>) {
	const context = useContext(NodeConfigContext)!;
	const [editing, setEditing] = useState(false);
	return (
		<div
			className={cn(
				"h-full w-full rounded-xl border-2 bg-muted/30",
				selected ? "border-primary" : "border-border",
			)}
		>
			<NodeResizer isVisible={selected} minWidth={120} minHeight={80} />
			{editing ? (
				<input
					autoFocus
					aria-label="分组名称"
					defaultValue={data.node.data.label}
					className="nodrag nopan m-2 rounded border border-input bg-card px-2 text-sm"
					onBlur={(event) => {
						if (event.target.value.trim())
							context.update(data.node.id, { label: event.target.value.trim() });
						setEditing(false);
					}}
					onKeyDown={(event) => {
						event.stopPropagation();
						if (event.key === "Enter") event.currentTarget.blur();
						if (event.key === "Escape") setEditing(false);
					}}
				/>
			) : (
				<button
					className="nodrag nopan m-2 text-sm text-muted-foreground"
					title="双击编辑分组名称"
					onDoubleClick={() => setEditing(true)}
				>
					{data.node.data.label}
				</button>
			)}
		</div>
	);
}
