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
	jimeng: "即梦 CLI 仅支持高级会员及以上账号；登录后会自动检测使用权限，无需 API Key。",
	libtv: "已开通 LibTV 会员？可直接登录 LibTV 账号接入本地 CLI。",
};

/**
 * The server catalog can be reduced by feature flags or an older backend. Keep
 * the official 0.1.17 model-access surface visible while still using the real
 * API endpoints for every action. Backend entries always win, so configured
 * state and masked credentials are never replaced by these display defaults.
 */
const fallbackProviderCatalog: APIKeyProvider[] = [
	{
		id: "jimeng",
		label: "即梦",
		description: "登录即梦会员 CLI 接入，无需 API Key。",
		configured: false,
		source: "none",
		credentialKind: "oauth",
	},
	{
		id: "libtv",
		label: "LibTV",
		description: "登录 LibTV 会员 CLI 接入本地生成服务。",
		configured: false,
		source: "none",
		credentialKind: "oauth",
	},
	{
		id: "xiaoyunque",
		label: "小云雀",
		description: "配置小云雀 Access Key 接入会员 CLI。",
		configured: false,
		source: "none",
		credentialKind: "apiKey",
	},
	{
		id: "volcengine",
		label: "火山引擎",
		description: "配置火山引擎 Ark API Key。",
		configured: false,
		source: "none",
		credentialKind: "apiKey",
	},
	{
		id: "openai",
		label: "OpenAI",
		description: "配置 OpenAI API Key。",
		configured: false,
		source: "none",
		credentialKind: "apiKey",
	},
	{
		id: "google",
		label: "Google Gemini",
		description: "配置 Google Gemini API Key。",
		configured: false,
		source: "none",
		credentialKind: "apiKey",
	},
	{
		id: "deepseek",
		label: "DeepSeek",
		description: "配置 DeepSeek API Key。",
		configured: false,
		source: "none",
		credentialKind: "apiKey",
	},
	{
		id: "aliyun",
		label: "阿里云百炼",
		description: "配置阿里云百炼 API Key。",
		configured: false,
		source: "none",
		credentialKind: "apiKey",
	},
	{
		id: "minimax",
		label: "MiniMax 国内",
		description: "配置 MiniMax 国内 API Key。",
		configured: false,
		source: "none",
		credentialKind: "apiKey",
	},
	{
		id: "mediago",
		label: "MediaGo",
		description: "使用 MediaGo 聚合平台 API Key。",
		configured: false,
		source: "none",
		credentialKind: "apiKey",
	},
	{
		id: "openrouter",
		label: "OpenRouter",
		description: "使用 OpenRouter 聚合平台 API Key。",
		configured: false,
		source: "none",
		credentialKind: "apiKey",
	},
	{
		id: "dmx",
		label: "DMXAPI",
		description: "使用 DMXAPI 聚合平台 API Key。",
		configured: false,
		source: "none",
		credentialKind: "apiKey",
	},
];

const withFallbackProviderCatalog = (providers: APIKeyProvider[]) => {
	const existing = new Map(providers.map((provider) => [provider.id, provider]));
	for (const fallback of fallbackProviderCatalog) {
		if (!existing.has(fallback.id)) {
			existing.set(fallback.id, {
				...fallback,
				status: "unavailable",
				description: `${fallback.label} 当前未在服务端启用。`,
			});
		}
	}
	return [...existing.values()];
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
	kling: Sparkles,
	// 聚合平台
	mediago: Sparkles,
	openrouter: Network,
	dmx: Boxes,
};

/** 页面展示用的商业 provider 占位，不进入后端可调用 provider catalog。 */
export const comingSoonProviders = [
	{
		id: "kling",
		label: "AI 可灵",
		description: "AI 可灵接入待接入。",
		configured: false,
		source: "none",
		credentialKind: "apiKey",
		status: "comingSoon",
	},
] satisfies APIKeyProvider[];

const unavailableCLIProviders = [
	{
		id: "jimeng",
		label: "即梦",
		description: "即梦 CLI 接入当前未在服务端启用。",
		configured: false,
		source: "none",
		credentialKind: "oauth",
		status: "unavailable",
	},
	{
		id: "libtv",
		label: "LibTV",
		description: "LibTV CLI 接入当前未在服务端启用。",
		configured: false,
		source: "none",
		credentialKind: "oauth",
		status: "unavailable",
	},
	{
		id: "xiaoyunque",
		label: "小云雀",
		description: "小云雀 CLI 接入当前未在服务端启用。",
		configured: false,
		source: "none",
		credentialKind: "apiKey",
		status: "unavailable",
	},
] satisfies APIKeyProvider[];

export const providerIconFor = (id: string): LucideIcon => providerIcons[id] ?? KeyRound;

export const cliProviderHint = (provider: APIKeyProvider): string | undefined => {
	if ((provider.status === "partial" || provider.status === "loginFailed") && provider.help)
		return provider.help;
	if (provider.status === "unavailable") return provider.description;
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
	// User-defined connections have their own editable cards in CustomProvidersSection.
	const catalog = withFallbackProviderCatalog(
		providers.filter((provider) => !provider.id.startsWith("custom-")),
	);
	const providersByID = new Map(catalog.map((provider) => [provider.id, provider]));

	const mediago =
		platformProvider(platforms, providersByID, mediagoProviderID) ??
		providersByID.get(mediagoProviderID);
	const mediagoModelGroups =
		platforms.find((platform) => platform.id === mediagoProviderID)?.modelGroups ?? [];

	const cliProviders =
		platforms.length > 0
			? [
					...platformProviders(platforms, providersByID, "cli"),
					...catalog.filter(
						(provider) =>
							fallbackCLIProviderIDs.has(provider.id) &&
							!platforms.some((platform) => platform.apiKeyProviderId === provider.id),
					),
				]
			: catalog.filter((provider) => fallbackCLIProviderIDs.has(provider.id));
	const visibleCLIProviders = [
		...cliProviders,
		...unavailableCLIProviders.filter(
			(provider) => !cliProviders.some((visible) => visible.id === provider.id),
		),
	];

	const customProviders = options.customProvidersEnabled
		? platformProviders(platforms, providersByID, "custom")
		: [];
	const unifiedProviders = platformProviders(platforms, providersByID, "unified").filter(
		(provider) => provider.id !== mediagoProviderID,
	);

	const fallbackAggregators = options.customProvidersEnabled
		? catalog.filter(
				(provider) =>
					knownAggregatorProviderIDs.has(provider.id) &&
					provider.id !== mediagoProviderID &&
					!unifiedProviders.some((item) => item.id === provider.id) &&
					!customProviders.some((item) => item.id === provider.id),
			)
		: [];
	const aggregator = sortByOrder(
		[...unifiedProviders, ...customProviders, ...fallbackAggregators],
		aggregatorProviderOrder,
	);

	return {
		cli: sortByOrder(visibleCLIProviders, cliProviderOrder),
		official: sortByOrder(officialAPIKeyProviders(catalog, platforms), officialProviderOrder),
		aggregator,
		mediago,
		mediagoModelGroups,
	};
};
