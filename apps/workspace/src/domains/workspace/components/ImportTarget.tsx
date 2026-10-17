import { useEffect, useId } from "react";
import useSWR from "swr";
import {
	getWorkspaceDocumentResources,
	workspaceDocumentResourcesKey,
	type WorkspaceDocumentResource,
} from "../api/workspace";

export interface ImportTargetValue {
	documentId: string;
	sectionId: string;
}

export interface ImportTargetProps {
	disabled?: boolean;
	onChange: (value?: ImportTargetValue) => void;
	onValidity?: (valid: boolean) => void;
	projectId?: string;
	value?: ImportTargetValue;
}

const targetOptionKey = (value: ImportTargetValue) =>
	JSON.stringify([value.documentId, value.sectionId]);

const bindableResources = (
	resources: WorkspaceDocumentResource[] | undefined,
): WorkspaceDocumentResource[] =>
	(resources ?? []).filter((resource) => Boolean(resource.documentId && resource.sectionId));

const resourceTarget = (resource: WorkspaceDocumentResource): ImportTargetValue => ({
	documentId: resource.documentId,
	sectionId: resource.sectionId,
});

/**
 * Official `ImportTarget`: binds the assets being saved to one document section
 * so images and videos also join that section's candidate list.
 */
export function ImportTarget({
	disabled = false,
	onChange,
	onValidity,
	projectId,
	value,
}: ImportTargetProps) {
	const selectId = useId();
	const { data, error, isLoading } = useSWR(
		projectId ? workspaceDocumentResourcesKey(projectId) : null,
		() => getWorkspaceDocumentResources(projectId),
	);
	const options = bindableResources(data?.resources);
	const selectedKey = value ? targetOptionKey(value) : "";
	const valid =
		!value || options.some((option) => targetOptionKey(resourceTarget(option)) === selectedKey);

	useEffect(() => {
		onValidity?.(!projectId || valid);
	}, [onValidity, projectId, valid]);

	if (!projectId) return null;

	return (
		<div className="space-y-2">
			<label htmlFor={selectId} className="text-sm font-medium">
				关联文档 / 分镜（可选）
			</label>
			<select
				id={selectId}
				className="h-9 w-full rounded-sm border border-input bg-background px-3 text-xs"
				value={selectedKey}
				disabled={disabled}
				onChange={(event) => {
					const next = options.find(
						(option) => targetOptionKey(resourceTarget(option)) === event.target.value,
					);
					onChange(next ? resourceTarget(next) : undefined);
				}}
			>
				<option value="">仅保存到素材库</option>
				{value && !valid ? (
					<option value={selectedKey} disabled>
						{isLoading ? "正在核对上次关联…" : "上次关联已不可用，请重新选择"}
					</option>
				) : null}
				{options.map((option) => (
					<option
						key={targetOptionKey(resourceTarget(option))}
						value={targetOptionKey(resourceTarget(option))}
					>
						{option.documentTitle} · {option.title}
					</option>
				))}
			</select>
			<p className="text-xs leading-5 text-muted-foreground">
				图片和视频会加入该章节的创作素材列表，保留已有的选用结果。
			</p>
			{error ? (
				<p role="alert" className="text-xs text-error-foreground">
					读取关联目标失败，可以选择“仅保存到素材库”后继续。
				</p>
			) : null}
		</div>
	);
}
