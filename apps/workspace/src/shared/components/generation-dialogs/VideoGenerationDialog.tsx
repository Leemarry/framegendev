import type React from "react";
import { useEffect, useState } from "react";
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
	targets?: Array<{ id: string; title: string; thumbnailUrl?: string }>;
	activeTargetId?: string;
	onSelectTarget?: (id: string) => void;
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
	targets,
	activeTargetId,
	onSelectTarget,
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
	const sectionKey = activeSection
		? `${activeSection.documentId}:${activeSection.blockId}`
		: workspaceProps?.historyScopeId;
	useEffect(() => setMaterialLibraryOpen(false), [sectionKey]);
	const resourceTargets =
		targets ?? (activeSection ? [{ id: sectionKey!, title: activeSection.headingText }] : []);
	const rightPane =
		resourceTargets.length > 0 ? (
			<div
				role="region"
				aria-label="生成素材"
				data-testid="media-generation-target-rail"
				className="space-y-1 p-2"
			>
				{resourceTargets.map((target) => {
					const active = target.id === (activeTargetId ?? sectionKey);
					return (
						<button
							key={target.id}
							type="button"
							aria-label={`切换到素材：${target.title}`}
							aria-current={active ? "true" : undefined}
							onClick={() => onSelectTarget?.(target.id)}
							className={`relative flex h-16 w-full items-center justify-between gap-2 overflow-hidden rounded-md border border-border px-3 text-left text-sm focus-visible:outline-2 focus-visible:outline-ring ${active ? "bg-primary/5 font-semibold ring-2 ring-inset ring-primary" : "hover:bg-muted"}`}
						>
							<span className="truncate">{target.title}</span>
							{target.thumbnailUrl && (
								<img alt="" src={target.thumbnailUrl} className="h-full w-20 object-cover" />
							)}
						</button>
					);
				})}
			</div>
		) : null;
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
				rightPane={rightPane}
				titleAside={
					<div className="flex items-center gap-2">
						<GlobalToolboxButton
							kind="video"
							label="视频工作台"
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
					<MediaGenerationWorkspace
						key={workspaceProps.historyScopeId}
						{...workspaceProps}
						kind="video"
						viewMode="history"
						materialLibraryImportOpen={materialLibraryOpen}
						onMaterialLibraryImportOpenChange={setMaterialLibraryOpen}
						showMaterialLibraryImportCard
					/>
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
			rightPane={rightPane}
			titleAside={
				<div className="flex items-center gap-2">
					<GlobalToolboxButton
						label="视频工作台"
						kind="video"
						projectId={projectId}
						variant="inline"
					/>
				</div>
			}
			onOpenChange={onOpenChange}
		>
			{workflowOpen ? (
				<WorkflowGenerationSurface projectId={projectId} section={activeSection} />
			) : (
				<DocumentSectionGenerator
					key={sectionKey}
					showMaterialLibraryImportCard
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
