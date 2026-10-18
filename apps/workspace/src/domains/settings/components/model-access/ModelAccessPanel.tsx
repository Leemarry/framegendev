import { KeyRound, Loader2 } from "lucide-react";
import type React from "react";
import useSWR from "swr";
import type { APIKeyProvider } from "@/domains/settings/api/settings";
import { agentBackendsKey, getAgentBackends } from "@/domains/agent/api/agent";
import { SettingsPanelLayout } from "@/domains/settings/components/SettingsPanelLayout";
import { CodexAccessPanel } from "@/domains/settings/components/CodexAccessPanel";
import { ProviderCard } from "./ProviderCard";
import { CustomProvidersSection } from "./CustomProvidersSection";
import { useState } from "react";
import { CLIRuntimeSettingsDialog } from "./CLIRuntimeSettingsDialog";
import { MediaGoConfigDialog, ProviderConfigDialog } from "./ProviderConfigDialog";
import { ProviderCardsGrid, MediaGoModelChips, ProviderSection } from "./ProviderSection";
import {
	cliProviderHint,
	comingSoonProviders,
	mediagoProviderID,
	providerIconFor,
} from "./model-access-providers";
import type { ProviderConfigVariant } from "./provider-credential-utils";
import { useProviderCredentials } from "./useProviderCredentials";

export const ModelAccessPanel: React.FC = () => {
	const creds = useProviderCredentials();
	const [advancedProviderID, setAdvancedProviderID] = useState<string>();
	const { data: agentBackends } = useSWR(agentBackendsKey, getAgentBackends);
	const isCodexBackend = (agentBackends?.activeId ?? "codex") === "codex";
	const { groups } = creds;
	const officialProviders = [...groups.official, ...comingSoonProviders];
	const allProviders: APIKeyProvider[] = [
		...groups.cli,
		...officialProviders,
		...groups.aggregator,
		...(groups.mediago ? [groups.mediago] : []),
	];
	const providerByID = new Map(allProviders.map((provider) => [provider.id, provider]));
	const cliIDs = new Set(groups.cli.map((provider) => provider.id));
	const officialIDs = new Set(officialProviders.map((provider) => provider.id));

	const variantFor = (id: string): ProviderConfigVariant => {
		if (cliIDs.has(id)) return "cli";
		if (officialIDs.has(id)) return "official";
		if (id === mediagoProviderID) return "aggregator";
		return "custom";
	};

	const renderCard = (provider: APIKeyProvider) => {
		const isMediago = provider.id === mediagoProviderID;
		return (
			<ProviderCard
				key={provider.id}
				provider={provider}
				icon={providerIconFor(provider.id)}
				hint={cliProviderHint(provider)}
				loginChallenge={creds.loginChallenges[provider.id]}
				isSaving={creds.savingID === provider.id}
				isClearing={creds.clearingID === provider.id}
				isLoggingIn={creds.loggingInID === provider.id}
				isCheckingLogin={creds.checkingLoginID === provider.id}
				onLogin={() => void creds.login(provider)}
				onConfirmLogin={() => void creds.completeLogin(provider)}
				onOpenLogin={() => void creds.openLoginChallenge(provider)}
				onClear={() => creds.confirmClear(provider)}
				onConfigure={() =>
					isMediago ? creds.openMediagoDialog() : creds.openManualDialog(provider)
				}
				onAdvancedSettings={
					cliIDs.has(provider.id)
						? () =>
								provider.credentialKind === "oauth"
									? setAdvancedProviderID(provider.id)
									: creds.openManualDialog(provider)
						: undefined
				}
			>
				{isMediago ? <MediaGoModelChips modelGroups={groups.mediagoModelGroups} /> : null}
			</ProviderCard>
		);
	};

	const manualProvider = creds.manualProviderID
		? providerByID.get(creds.manualProviderID)
		: undefined;
	const advancedProvider = advancedProviderID ? providerByID.get(advancedProviderID) : undefined;

	return (
		<SettingsPanelLayout
			title="模型接入"
			description="集中管理 Codex、会员 CLI、官方 API 与聚合平台的接入方式。"
			icon={<KeyRound className="size-4" />}
			contentClassName="space-y-10"
		>
			{creds.isLoading && allProviders.length === 0 ? (
				<div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
					<Loader2 className="size-4 animate-spin" />
					<span>正在加载接入方式</span>
				</div>
			) : null}

			{/* 1. Codex 接入（仅 Codex 后端启用） */}
			{isCodexBackend ? <CodexAccessPanel embedded /> : null}

			{/* 2. 会员 CLI 接入 */}
			{groups.cli.length > 0 ? (
				<ProviderSection
					testid="cli-access-section"
					title="会员 CLI 接入"
					description="使用本地 CLI 登录或配置对应 Access Key 接入。"
				>
					<ProviderCardsGrid>{groups.cli.map(renderCard)}</ProviderCardsGrid>
				</ProviderSection>
			) : null}

			{/* 3. 官方 API 接入 */}
			{officialProviders.length > 0 ? (
				<ProviderSection
					testid="official-api-section"
					title="官方 API 接入"
					description="直接接入模型官方服务，使用对应官方平台的 API Key 和额度。"
				>
					<ProviderCardsGrid>{officialProviders.map(renderCard)}</ProviderCardsGrid>
				</ProviderSection>
			) : null}

			{/* 4. 聚合平台接入 */}
			<CustomProvidersSection>
				{groups.mediago ? renderCard(groups.mediago) : null}
				{groups.aggregator.map(renderCard)}
			</CustomProvidersSection>

			{/* 通用 API Key / Access Key 配置弹窗 */}
			{advancedProvider ? (
				<CLIRuntimeSettingsDialog
					provider={advancedProvider}
					pending={creds.loginChallenges[advancedProvider.id]?.status === "pending"}
					onClose={() => setAdvancedProviderID(undefined)}
				/>
			) : null}
			{manualProvider ? (
				<ProviderConfigDialog
					provider={manualProvider}
					variant={variantFor(manualProvider.id)}
					open={creds.manualProviderID === manualProvider.id}
					apiKey={creds.apiKeys[manualProvider.id] ?? ""}
					isSaving={creds.savingID === manualProvider.id}
					isClearing={creds.clearingID === manualProvider.id}
					onAPIKeyChange={(value) => creds.updateAPIKey(manualProvider.id, value)}
					onClear={() => creds.confirmClear(manualProvider)}
					onOpenChange={(open) => {
						if (!open) creds.closeManualDialog();
					}}
					onSave={() => void creds.saveManualConfig(manualProvider)}
				/>
			) : null}

			{/* MediaGo 专用配置弹窗 */}
			{groups.mediago ? (
				<MediaGoConfigDialog
					provider={groups.mediago}
					open={creds.mediagoDialogOpen}
					apiKey={creds.apiKeys[groups.mediago.id] ?? ""}
					isSaving={creds.savingID === groups.mediago.id}
					isClearing={creds.clearingID === groups.mediago.id}
					onAPIKeyChange={(value) => creds.updateAPIKey(groups.mediago!.id, value)}
					onClear={() => creds.confirmClear(groups.mediago!)}
					onOpenChange={(open) => {
						if (!open) creds.closeMediagoDialog();
					}}
					onRegister={() => void creds.openMediagoRegister()}
					onSave={() => void creds.saveMediagoConfig()}
				/>
			) : null}
		</SettingsPanelLayout>
	);
};
