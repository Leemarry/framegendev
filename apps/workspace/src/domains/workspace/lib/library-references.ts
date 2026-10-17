import type { MediaAssetReference } from "@/domains/workspace/api/media";
import { agentProjectPath } from "@/domains/workspace/lib/workbench-route";

/**
 * Official `assetHub.useKinds.*` labels. Unknown kinds fall back to
 * `assetHub.projectUse` (项目引用), exactly like the reference build.
 */
const useKindLabels: Record<string, string> = {
	"document-binding": "文档使用",
	"generation-input": "生成参考",
	"generation-list": "生成历史",
	"generation-output": "生成结果",
	"project-reference": "项目参考",
	"selected-resource": "已选资源",
};

export const mediaReferenceKindLabel = (kind?: string) =>
	(kind ? useKindLabels[kind] : undefined) ?? "项目引用";

/** Title priority mirrors the official `label || resourceTitle || document title`. */
export const mediaReferenceTitle = (
	reference: Pick<MediaAssetReference, "label" | "projectId" | "resourceTitle"> & {
		projectName?: string;
	},
) => reference.label || reference.resourceTitle || reference.projectName || reference.projectId;

/** Only live usages that point at a document are linkable. */
export const mediaReferencePath = (
	reference: Pick<MediaAssetReference, "documentId" | "projectId" | "removed">,
) => {
	if (reference.removed || !reference.projectId.trim()) return null;
	const documentId = reference.documentId?.trim();
	if (!documentId) return null;
	return agentProjectPath(reference.projectId, { documentId });
};
