import { KeyRound, Loader2 } from "lucide-react";
import type React from "react";
import useSWR from "swr";
import type { APIKeyProvider } from "@/domains/settings/api/settings";
import { agentBackendsKey, getAgentBackends } from "@/domains/agent/api/agent";
import { SettingsPanelLayout } from "@/domains/settings/components/SettingsPanelLayout";
import { CodexAccessPanel } from "@/domains/settings/components/CodexAccessPanel";
import { ProviderCard } from "./ProviderCard";
import { MediaGoConfigDialog, ProviderConfigDialog } from "./ProviderConfigDialog";
import { ProviderCardsGrid, MediaGoModelChips, ProviderSection } from "./ProviderSection";
import { cliProviderHint, mediagoProviderID, providerIconFor } from "./model-access-providers";
import type { ProviderConfigVariant } from "./provider-credential-utils";
import { useProviderCredentials } from "./useProviderCredentials";

export const ModelAccessPanel: React.FC = () => {
	const creds = useProviderCredentials();
	const { data: agentBackends } = useSWR(agentBackendsKey, getAgentBackends);
	const isCodexBackend = (agentBackends?.activeId ?? "codex") === "codex";
	const { groups } = creds;
	const allProviders: APIKeyProvider[] = [
		...groups.cli,
		...groups.official,
		...groups.aggregator,
		...(groups.mediago ? [groups.mediago] : []),
	];
	const providerByID = new Map(allProviders.map((provider) => [provider.id, provider]));
	const cliIDs = new Set(groups.cli.map((provider) => provider.id));
	const officialIDs = new Set(groups.official.map((provider) => provider.id));

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
			/>
		);
	};

	const manualProvider = creds.manualProviderID
		? providerByID.get(creds.manualProviderID)
		: undefined;

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
			{groups.official.length > 0 ? (
				<ProviderSection
					testid="official-api-section"
					title="官方 API 接入"
					description="直接接入模型官方服务，使用对应官方平台的 API Key 和额度。"
				>
					<ProviderCardsGrid>{groups.official.map(renderCard)}</ProviderCardsGrid>
				</ProviderSection>
			) : null}

			{/* 4. 聚合平台接入 */}
			{groups.mediago || groups.aggregator.length > 0 ? (
				<ProviderSection
					testid="aggregator-section"
					title="聚合平台接入"
					description="通过聚合平台使用多个模型，使用对应平台的 API Key 和额度。"
				>
					<ProviderCardsGrid>
						{groups.mediago ? (
							<div key={groups.mediago.id} className="contents">
								{renderCard(groups.mediago)}
								<MediaGoModelChips modelGroups={groups.mediagoModelGroups} />
							</div>
						) : null}
						{groups.aggregator.map(renderCard)}
					</ProviderCardsGrid>
				</ProviderSection>
			) : null}

			{/* 通用 API Key / Access Key 配置弹窗 */}
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
