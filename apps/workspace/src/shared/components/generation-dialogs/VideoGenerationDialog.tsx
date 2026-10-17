import type React from "react";
import { useEffect, useState } from "react";
import { Images } from "lucide-react";
import type { GenerationAsset, SelectedGenerationAsset } from "@/domains/generation/api/generation";
import { GenerationModalShell } from "@/domains/documents/components/GenerationModalShell";
import { DocumentSectionGenerator } from "@/domains/documents/components/DocumentSectionGenerator";
import type { MarkdownSectionContext } from "@/domains/documents/components/MarkdownHybridEditor";
import {
	MediaGenerationWorkspace,
	type MediaGenerationWorkspaceProps,
} from "@/domains/generation/components/MediaGenerationWorkspace";
import { GlobalToolboxButton } from "@/domains/workspace/components/GlobalToolboxDrawer";
import { Button } from "@/shared/components/ui/button";
import { WorkflowGenerationSurface } from "@/domains/generation/components/WorkflowGenerationSurface";

type VideoWorkspaceProps = Omit<MediaGenerationWorkspaceProps, "kind">;

const noop = () => undefined;

interface VideoGenerationDialogProps {
	onAssetSelectionPersisted?: () => void;
	onGenerationComplete?: (
		pendingId: string,
		assets: GenerationAsset[],
		sourceTaskId: string,
	) => void;
	onGenerationError?: (pendingId: string) => void;
	onGenerationStart?: (pendingId: string, prompt: string) => void;
	onOpenChange: (open: boolean) => void;
	onOpenReferenceGeneration?: (section: MarkdownSectionContext) => void;
	onToggleAsset?: (asset: GenerationAsset, selected: boolean) => void;
	open: boolean;
	projectId?: string;
	resolveLatestSection?: boolean;
	selectedAssetKeys?: string[];
	selectedGenerationAssets?: SelectedGenerationAsset[];
	section?: MarkdownSectionContext | null;
	title?: string;
	titleId?: string;
	workspaceProps?: VideoWorkspaceProps;
}

const defaultVideoTitleId = "video-generation-title";

export const VideoGenerationDialog: React.FC<VideoGenerationDialogProps> = ({
	onAssetSelectionPersisted,
	onGenerationComplete,
	onGenerationError,
	onGenerationStart,
	onOpenChange,
	onOpenReferenceGeneration,
	onToggleAsset,
	open,
	projectId,
	resolveLatestSection,
	selectedAssetKeys,
	selectedGenerationAssets,
	section,
	title,
	titleId = defaultVideoTitleId,
	workspaceProps,
}) => {
	const [lastSection, setLastSection] = useState<MarkdownSectionContext | null>(section ?? null);
	const [materialLibraryOpen, setMaterialLibraryOpen] = useState(false);
	const [workflowOpen, setWorkflowOpen] = useState(false);

	useEffect(() => {
		if (section) setLastSection(section);
	}, [section]);

	useEffect(() => {
		if (!open) setMaterialLibraryOpen(false);
		if (!open) setWorkflowOpen(false);
	}, [open]);

	const activeSection = section ?? workspaceProps?.notificationTarget?.section ?? lastSection;
	const workflowToggle = activeSection ? (
		<Button
			type="button"
			variant="ghost"
			size="sm"
			className="h-8 shrink-0 px-2.5 text-xs"
			onClick={() => setWorkflowOpen((value) => !value)}
			role="switch"
			aria-checked={workflowOpen}
		>
			<span>工作流</span>
			<span
				aria-hidden="true"
				className={`flex h-5 w-9 items-center rounded-full p-0.5 ${workflowOpen ? "justify-end bg-primary" : "bg-muted"}`}
			>
				<span className="size-4 rounded-full bg-foreground" />
			</span>
		</Button>
	) : null;

	if (workspaceProps) {
		return (
			<GenerationModalShell
				open={open}
				title={title ?? "生成视频"}
				titleId={titleId}
				headerActions={workflowToggle}
				titleAside={
					<div className="flex items-center gap-2">
						<GlobalToolboxButton
							kind="video"
							projectId={projectId ?? workspaceProps.projectId}
							variant="inline"
						/>
					</div>
				}
				onOpenChange={onOpenChange}
			>
				{workflowOpen && activeSection ? (
					<WorkflowGenerationSurface
						projectId={projectId ?? workspaceProps.projectId}
						section={activeSection}
					/>
				) : (
					<MediaGenerationWorkspace {...workspaceProps} kind="video" />
				)}
			</GenerationModalShell>
		);
	}

	if (!activeSection) return null;

	return (
		<GenerationModalShell
			open={open}
			title={title ?? `生成视频素材 · ${activeSection.headingText}`}
			titleId={titleId}
			headerActions={workflowToggle}
			titleAside={
				<div className="flex items-center gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-8 shrink-0 rounded-md px-2.5 text-xs active:border-primary focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
						onClick={() => setMaterialLibraryOpen(true)}
					>
						<Images className="size-4" />
						<span>从素材库中选择</span>
					</Button>
					<GlobalToolboxButton kind="video" projectId={projectId} variant="inline" />
				</div>
			}
			onOpenChange={onOpenChange}
		>
			{workflowOpen ? (
				<WorkflowGenerationSurface projectId={projectId} section={activeSection} />
			) : (
				<DocumentSectionGenerator
					kind="video"
					materialLibraryImportOpen={materialLibraryOpen}
					projectId={projectId}
					resolveLatestSection={resolveLatestSection}
					section={activeSection}
					selectedAssetKeys={selectedAssetKeys}
					selectedGenerationAssets={selectedGenerationAssets}
					viewMode="history"
					onAssetSelectionPersisted={onAssetSelectionPersisted}
					onGenerationComplete={onGenerationComplete ?? noop}
					onGenerationError={onGenerationError ?? noop}
					onGenerationStart={onGenerationStart ?? noop}
					onMaterialLibraryImportOpenChange={setMaterialLibraryOpen}
					onOpenReferenceGeneration={onOpenReferenceGeneration}
					onToggleAsset={onToggleAsset}
				/>
			)}
		</GenerationModalShell>
	);
};
