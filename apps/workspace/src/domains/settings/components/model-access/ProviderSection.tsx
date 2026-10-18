import type React from "react";
import type { ModelPlatformModelGroup } from "@/domains/settings/api/settings";

export const ProviderSection: React.FC<{
	actions?: React.ReactNode;
	children: React.ReactNode;
	description: string;
	testid?: string;
	title: string;
}> = ({ actions, children, description, testid, title }) => (
	<section data-testid={testid} className="space-y-3">
		<div className="flex flex-wrap items-start justify-between gap-2">
			<div className="min-w-0">
				<h3 className="text-sm font-semibold text-foreground">{title}</h3>
				<p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
			</div>
			{actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
		</div>
		{children}
	</section>
);

/** 桌面端三列、中等宽度两列、窄屏一列的供应商卡片网格。 */
export const ProviderCardsGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
	<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{children}</div>
);

const maxVisibleModelChips = 8;
const pinnedMediagoModelChips = [
	"Wan 2.7 Image",
	"Wan 2.7 Image Pro",
	"HappyHorse 1.1 Text to Video",
	"HappyHorse 1.1 Reference to Video",
];

const visibleMediagoModelChips = (models: string[]) => {
	const visibleModels = models.slice(0, maxVisibleModelChips);
	const visibleSet = new Set(visibleModels);
	for (const pinnedModel of pinnedMediagoModelChips) {
		if (models.includes(pinnedModel) && !visibleSet.has(pinnedModel)) {
			visibleModels.push(pinnedModel);
			visibleSet.add(pinnedModel);
		}
	}
	return visibleModels;
};

export const MediaGoModelChips: React.FC<{ modelGroups?: ModelPlatformModelGroup[] }> = ({
	modelGroups,
}) => {
	const models = (modelGroups ?? []).flatMap((group) => group.models);
	if (models.length === 0) return null;
	const visibleModels = visibleMediagoModelChips(models);
	const hiddenCount = models.length - visibleModels.length;

	return (
		<div className="flex min-w-0 flex-wrap items-center gap-1.5 pt-1">
			<span className="mr-1 text-xs text-muted-foreground">支持模型</span>
			{visibleModels.map((model) => (
				<span
					key={model}
					className="max-w-full break-words rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
				>
					{model}
				</span>
			))}
			{hiddenCount > 0 ? (
				<span className="text-xs text-muted-foreground">等 {models.length} 个模型</span>
			) : null}
		</div>
	);
};
