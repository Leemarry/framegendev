import type { APIKeyProvider } from "@/domains/settings/api/settings";

export const apiKeyInputPlaceholder = (provider: APIKeyProvider, emptyText: string) =>
	provider.configured ? "输入新的 Key 以替换当前凭据" : emptyText;

export const maskCredentialValue = (value: string) => {
	if (value.includes("•") || value.includes("*")) return value;
	if (value.length <= 8) return "••••••••";
	return `${value.slice(0, 4)}••••••••${value.slice(-4)}`;
};

export const providerSavedCredentialLabel = (provider: APIKeyProvider) => {
	const credential = provider.masked?.trim();
	if (!credential) return "当前凭据";
	return maskCredentialValue(credential);
};

export type ProviderConfigVariant = "cli" | "custom" | "official" | "aggregator";

export const providerConfigVariantLabel = (variant: ProviderConfigVariant) => {
	switch (variant) {
		case "cli":
			return "本地 CLI";
		case "custom":
			return "自定义";
		case "aggregator":
			return "聚合平台";
		default:
			return "官方";
	}
};
