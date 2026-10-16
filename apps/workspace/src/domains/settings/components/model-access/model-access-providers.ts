import {
	AudioLines,
	Bot,
	Boxes,
	Cloud,
	Flame,
	KeyRound,
	Network,
	Sparkle,
	Sparkles,
	Tv,
	type LucideIcon,
} from "lucide-react";
import type {
	APIKeyProvider,
	ModelPlatform,
	ModelPlatformModelGroup,
} from "@/domains/settings/api/settings";

export const mediagoProviderID = "mediago";
export const fallbackCLIProviderIDs = new Set(["jimeng", "libtv", "xiaoyunque"]);
export const knownAggregatorProviderIDs = new Set(["mediago", "openrouter", "dmx"]);

export const cliProviderOrder = ["jimeng", "libtv", "xiaoyunque"];
export const officialProviderOrder = [
	"volcengine",
	"openai",
	"google",
	"deepseek",
	"aliyun",
	"minimax",
];
export const aggregatorProviderOrder = ["mediago", "openrouter", "dmx"];

export const cliProviderHints: Record<string, string> = {
	jimeng: "已开通即梦高级会员？可直接登录即梦账号接入，无需 API Key。",
	libtv: "已开通 LibTV 会员？可直接登录 LibTV 账号接入本地 CLI。",
};

/**
 * 首项使用 Lucide 通用图标占位，不引入未授权的品牌 logo 资产。
 * 品牌图标的视觉精修属于 TASK-010 单项 2。
 */
export const providerIcons: Record<string, LucideIcon> = {
	// 会员 CLI
	jimeng: Sparkles,
	libtv: Tv,
	xiaoyunque: Cloud,
	// 官方 API
	volcengine: Flame,
	openai: Sparkle,
	google: Sparkle,
	deepseek: Bot,
	aliyun: Cloud,
	minimax: AudioLines,
	// 聚合平台
	mediago: Sparkles,
	openrouter: Network,
	dmx: Boxes,
};

export const providerIconFor = (id: string): LucideIcon => providerIcons[id] ?? KeyRound;

export const cliProviderHint = (provider: APIKeyProvider): string | undefined => {
	if (provider.id === "xiaoyunque") return undefined;
	return cliProviderHints[provider.id] ?? provider.help;
};

const platformProvider = (
	platforms: ModelPlatform[],
	providersByID: Map<string, APIKeyProvider>,
	platformID: string,
): APIKeyProvider | undefined => {
	const platform = platforms.find((item) => item.id === platformID);
	if (!platform) return undefined;
	const provider = providersByID.get(platform.apiKeyProviderId);
	if (!provider) return undefined;
	return {
		...provider,
		label: platform.label || provider.label,
		description: platform.description || provider.description,
		credentialLabel: undefined,
		help: undefined,
		placeholder: undefined,
	};
};

const platformProviders = (
	platforms: ModelPlatform[],
	providersByID: Map<string, APIKeyProvider>,
	kind: string,
): APIKeyProvider[] =>
	platforms
		.filter((platform) => platform.kind === kind)
		.flatMap((platform) => {
			const provider = providersByID.get(platform.apiKeyProviderId);
			if (!provider) return [];
			return [
				{
					...provider,
					label: platform.label || provider.label,
					description: platform.description || provider.description,
					...(kind === "cli"
						? {}
						: {
								credentialLabel: undefined,
								help: undefined,
								placeholder: undefined,
							}),
				},
			];
		});

const officialAPIKeyProviders = (
	providers: APIKeyProvider[],
	platforms: ModelPlatform[],
): APIKeyProvider[] => {
	if (platforms.length === 0) {
		return providers.filter(
			(provider) =>
				!knownAggregatorProviderIDs.has(provider.id) && !fallbackCLIProviderIDs.has(provider.id),
		);
	}
	const platformProviderIDs = new Set(platforms.map((platform) => platform.apiKeyProviderId));
	// 已知 CLI 即未被平台元数据声明，也不允许泄漏到官方 API 区。
	return providers.filter(
		(provider) =>
			!knownAggregatorProviderIDs.has(provider.id) &&
			!fallbackCLIProviderIDs.has(provider.id) &&
			!platformProviderIDs.has(provider.id),
	);
};

const sortByOrder = (providers: APIKeyProvider[], order: string[]): APIKeyProvider[] => {
	const rank = (id: string) => {
		const index = order.indexOf(id);
		return index === -1 ? Number.MAX_SAFE_INTEGER : index;
	};
	return [...providers].sort((a, b) => {
		const ra = rank(a.id);
		const rb = rank(b.id);
		if (ra !== rb) return ra - rb;
		return a.label.localeCompare(b.label, "zh-Hans-CN");
	});
};

export interface ModelAccessGroups {
	cli: APIKeyProvider[];
	official: APIKeyProvider[];
	aggregator: APIKeyProvider[];
	mediago?: APIKeyProvider;
	mediagoModelGroups: ModelPlatformModelGroup[];
}

export interface GroupModelAccessOptions {
	customProvidersEnabled: boolean;
}

export const groupModelAccessProviders = (
	providers: APIKeyProvider[],
	platforms: ModelPlatform[],
	options: GroupModelAccessOptions,
): ModelAccessGroups => {
	const providersByID = new Map(providers.map((provider) => [provider.id, provider]));

	const mediago = platformProvider(platforms, providersByID, mediagoProviderID);
	const mediagoModelGroups =
		platforms.find((platform) => platform.id === mediagoProviderID)?.modelGroups ?? [];

	const cliProviders =
		platforms.length > 0
			? platformProviders(platforms, providersByID, "cli")
			: providers.filter((provider) => fallbackCLIProviderIDs.has(provider.id));

	const customProviders = options.customProvidersEnabled
		? platformProviders(platforms, providersByID, "custom")
		: [];
	const unifiedProviders = platformProviders(platforms, providersByID, "unified").filter(
		(provider) => provider.id !== mediagoProviderID,
	);

	const aggregator = sortByOrder(
		[...unifiedProviders, ...customProviders],
		aggregatorProviderOrder,
	);

	return {
		cli: sortByOrder(cliProviders, cliProviderOrder),
		official: sortByOrder(officialAPIKeyProviders(providers, platforms), officialProviderOrder),
		aggregator,
		mediago,
		mediagoModelGroups,
	};
};
