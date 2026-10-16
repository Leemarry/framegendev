import { LogOut, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import {
	type APIKeyLoginChallenge,
	type APIKeyProvider,
	apiKeysKey,
	beginProviderLogin,
	clearAPIKey,
	completeProviderLogin,
	getAPIKeys,
	getModelPlatforms,
	modelPlatformsKey,
	saveAPIKey,
} from "@/domains/settings/api/settings";
import { isAgentRuntimeConfigKey } from "@/domains/agent/api/agent";
import { generationModelsKey } from "@/domains/generation/api/generation";
import { useToast } from "@/hooks/useToast";
import { confirmDialog } from "@/shared/components/callable/ConfirmDialog";
import { openExternalUrl } from "@/shared/desktop/actions";
import { groupModelAccessProviders, type ModelAccessGroups } from "./model-access-providers";

const mediagoAPIKeyURL =
	import.meta.env.VITE_MEDIAGO_APIKEY_URL || "http://localhost:4321/account#apiKeys";
const customProvidersEnabled = import.meta.env.VITE_ENABLE_CUSTOM_PROVIDERS !== "false";

const withoutRecordKey = <TValue,>(values: Record<string, TValue>, key: string) => {
	const next = { ...values };
	delete next[key];
	return next;
};

export interface UseProviderCredentialsResult {
	groups: ModelAccessGroups;
	isLoading: boolean;
	apiKeys: Record<string, string>;
	savingID?: string;
	clearingID?: string;
	loggingInID?: string;
	checkingLoginID?: string;
	manualProviderID?: string;
	mediagoDialogOpen: boolean;
	loginChallenges: Record<string, APIKeyLoginChallenge>;
	updateAPIKey: (providerID: string, value: string) => void;
	confirmClear: (provider: APIKeyProvider) => void;
	login: (provider: APIKeyProvider) => Promise<void>;
	openLoginChallenge: (provider: APIKeyProvider) => Promise<void>;
	completeLogin: (provider: APIKeyProvider) => Promise<void>;
	openManualDialog: (provider: APIKeyProvider) => void;
	closeManualDialog: () => void;
	saveManualConfig: (provider: APIKeyProvider) => Promise<void>;
	openMediagoDialog: () => void;
	closeMediagoDialog: () => void;
	saveMediagoConfig: () => Promise<void>;
	openMediagoRegister: () => Promise<void>;
}

export const useProviderCredentials = (): UseProviderCredentialsResult => {
	const toast = useToast();
	const { mutate: mutateGlobal } = useSWRConfig();
	const { data, mutate, isLoading } = useSWR(apiKeysKey, getAPIKeys);
	const { data: modelPlatformsData, isLoading: isModelPlatformsLoading } = useSWR(
		modelPlatformsKey,
		getModelPlatforms,
	);
	const providers = data?.providers ?? [];
	const platforms = modelPlatformsData?.platforms ?? [];
	const groups = groupModelAccessProviders(providers, platforms, { customProvidersEnabled });

	const [mediagoDialogOpen, setMediagoDialogOpen] = useState(false);
	const [apiKeys, setAPIKeys] = useState<Record<string, string>>({});
	const [savingID, setSavingID] = useState<string>();
	const [clearingID, setClearingID] = useState<string>();
	const [loggingInID, setLoggingInID] = useState<string>();
	const [checkingLoginID, setCheckingLoginID] = useState<string>();
	const [manualProviderID, setManualProviderID] = useState<string>();
	const [loginChallenges, setLoginChallenges] = useState<Record<string, APIKeyLoginChallenge>>({});
	const hasPendingBrowserLogin = Object.values(loginChallenges).some(
		(challenge) => challenge.status === "pending" && Boolean(challenge.verificationUri),
	);

	const revalidateModelDependentCaches = useCallback(() => {
		void mutateGlobal(generationModelsKey, undefined, { revalidate: true });
		void mutateGlobal(isAgentRuntimeConfigKey, undefined, { revalidate: true });
	}, [mutateGlobal]);

	useEffect(() => {
		if (!hasPendingBrowserLogin) return;
		const intervalID = window.setInterval(() => {
			void mutate();
		}, 3000);
		return () => window.clearInterval(intervalID);
	}, [hasPendingBrowserLogin, mutate]);

	useEffect(() => {
		if (!data?.providers) return;
		const completedProviderIDs = data.providers
			.filter(
				(provider) =>
					provider.configured &&
					loginChallenges[provider.id]?.status === "pending" &&
					loggingInID !== provider.id &&
					checkingLoginID !== provider.id,
			)
			.map((provider) => provider.id);
		if (completedProviderIDs.length === 0) return;

		setLoginChallenges((current) => {
			const next = { ...current };
			for (const providerID of completedProviderIDs) delete next[providerID];
			return next;
		});
		revalidateModelDependentCaches();
	}, [
		checkingLoginID,
		data?.providers,
		loggingInID,
		loginChallenges,
		revalidateModelDependentCaches,
	]);

	const updateAPIKey = (providerID: string, value: string) => {
		setAPIKeys((current) => ({ ...current, [providerID]: value }));
	};

	const save = async (provider: APIKeyProvider) => {
		const apiKey = apiKeys[provider.id]?.trim() ?? "";
		if (!apiKey) return false;

		setSavingID(provider.id);
		try {
			const nextData = await saveAPIKey(provider.id, apiKey);
			await mutate(nextData, false);
			revalidateModelDependentCaches();
			setAPIKeys((current) => ({ ...current, [provider.id]: "" }));
			toast.success("API Key 已保存", { description: provider.label });
			return true;
		} catch (err) {
			const message = err instanceof Error ? err.message : "保存 API Key 失败。";
			toast.error("保存失败", { description: message });
			return false;
		} finally {
			setSavingID(undefined);
		}
	};

	const clear = async (provider: APIKeyProvider) => {
		const wasLoginPending = loginChallenges[provider.id]?.status === "pending";
		setClearingID(provider.id);
		try {
			const nextData = await clearAPIKey(provider.id);
			await mutate(nextData, false);
			revalidateModelDependentCaches();
			setAPIKeys((current) => ({ ...current, [provider.id]: "" }));
			setLoginChallenges((current) => withoutRecordKey(current, provider.id));
			toast.success(
				provider.credentialKind === "oauth"
					? wasLoginPending
						? "登录已取消"
						: "已退出登录"
					: "API Key 已清除",
				{ description: provider.label },
			);
			return true;
		} catch (err) {
			const message = err instanceof Error ? err.message : "清除 API Key 失败。";
			toast.error("清除失败", { description: message });
			return false;
		} finally {
			setClearingID(undefined);
		}
	};

	const confirmClear = (provider: APIKeyProvider) => {
		const isOAuthProvider = provider.credentialKind === "oauth";
		const isLoginPending = loginChallenges[provider.id]?.status === "pending";
		const actionLabel = isLoginPending ? "取消登录" : isOAuthProvider ? "退出登录" : "清除 API Key";
		const title = isLoginPending
			? `取消 ${provider.label} 登录？`
			: isOAuthProvider
				? `退出 ${provider.label} 登录？`
				: `清除 ${provider.label} API Key？`;
		const description = isLoginPending
			? "当前授权信息将被清除，之后可以重新发起登录。"
			: isOAuthProvider
				? "退出后将无法继续使用该账号，需要重新登录才能恢复。"
				: "清除后依赖此凭据的功能将不可用，需要重新配置才能恢复。";

		void confirmDialog({
			title,
			description,
			confirmLabel: actionLabel,
			confirmIcon: isOAuthProvider ? <LogOut /> : <Trash2 />,
			onConfirm: () => clear(provider),
		});
	};

	const login = async (provider: APIKeyProvider) => {
		setLoggingInID(provider.id);
		try {
			const nextData = await beginProviderLogin(provider.id, provider.configured);
			await mutate(nextData, false);
			if (nextData.login.status === "pending") {
				setLoginChallenges((current) => ({ ...current, [provider.id]: nextData.login }));
				if (nextData.login.verificationUri) {
					await openExternalUrl(nextData.login.verificationUri);
				}
				toast.info(`${provider.label}登录页已打开`, {
					description: nextData.login.userCode
						? `验证码：${nextData.login.userCode}`
						: provider.label,
				});
				return;
			}
			setLoginChallenges((current) => withoutRecordKey(current, provider.id));
			revalidateModelDependentCaches();
			toast.success("登录已完成", { description: provider.label });
		} catch (err) {
			const message = err instanceof Error ? err.message : "登录失败。";
			toast.error("登录失败", { description: message });
		} finally {
			setLoggingInID(undefined);
		}
	};

	const openLoginChallenge = async (provider: APIKeyProvider) => {
		const challenge = loginChallenges[provider.id];
		if (!challenge?.verificationUri) return;
		try {
			await openExternalUrl(challenge.verificationUri);
		} catch (err) {
			const message = err instanceof Error ? err.message : `打开${provider.label}授权页失败。`;
			toast.error("打开失败", { description: message });
		}
	};

	const completeLogin = async (provider: APIKeyProvider) => {
		const challenge = loginChallenges[provider.id];
		if (!challenge?.deviceCode) return;

		setCheckingLoginID(provider.id);
		try {
			const nextData = await completeProviderLogin(provider.id, challenge.deviceCode);
			await mutate(nextData, false);
			setLoginChallenges((current) => withoutRecordKey(current, provider.id));
			revalidateModelDependentCaches();
			toast.success("登录已完成", { description: provider.label });
		} catch (err) {
			const message = err instanceof Error ? err.message : "登录确认失败。";
			toast.error("确认失败", { description: message });
		} finally {
			setCheckingLoginID(undefined);
		}
	};

	const openManualDialog = (provider: APIKeyProvider) => setManualProviderID(provider.id);
	const closeManualDialog = () => setManualProviderID(undefined);

	const saveManualConfig = async (provider: APIKeyProvider) => {
		const saved = await save(provider);
		if (saved) setManualProviderID(undefined);
	};

	const openMediagoDialog = () => setMediagoDialogOpen(true);
	const closeMediagoDialog = () => setMediagoDialogOpen(false);

	const saveMediagoConfig = async () => {
		if (!groups.mediago) return;
		const saved = await save(groups.mediago);
		if (saved) setMediagoDialogOpen(false);
	};

	const openMediagoRegister = async () => {
		await openExternalUrl(mediagoAPIKeyURL);
	};

	return {
		groups,
		isLoading: isLoading || isModelPlatformsLoading,
		apiKeys,
		savingID,
		clearingID,
		loggingInID,
		checkingLoginID,
		manualProviderID,
		mediagoDialogOpen,
		loginChallenges,
		updateAPIKey,
		confirmClear,
		login,
		openLoginChallenge,
		completeLogin,
		openManualDialog,
		closeManualDialog,
		saveManualConfig,
		openMediagoDialog,
		closeMediagoDialog,
		saveMediagoConfig,
		openMediagoRegister,
	};
};
