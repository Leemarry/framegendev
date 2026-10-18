import { LogOut, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import {
	type APIKeyLoginChallenge,
	type APIKeyListResponse,
	type APIKeyProvider,
	apiKeysKey,
	beginProviderLogin,
	clearAPIKey,
	completeProviderLogin,
	generationProvidersKey,
	getGenerationProviders,
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
	const {
		data: generationData,
		mutate: mutateGeneration,
		isLoading: isGenerationLoading,
	} = useSWR(generationProvidersKey, getGenerationProviders);
	const { data: modelPlatformsData, isLoading: isModelPlatformsLoading } = useSWR(
		modelPlatformsKey,
		getModelPlatforms,
	);
	const providers = generationData?.providers ?? data?.providers ?? [];
	const platforms = generationData?.platforms ?? modelPlatformsData?.platforms ?? [];
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

	const revalidateGenerationProviders = useCallback(() => {
		void mutateGeneration(undefined, { revalidate: true });
	}, [mutateGeneration]);

	useEffect(() => {
		if (!hasPendingBrowserLogin) return;
		const intervalID = window.setInterval(() => {
			void mutate();
		}, 3000);
		return () => window.clearInterval(intervalID);
	}, [hasPendingBrowserLogin, mutate]);

	useEffect(() => {
		if (!data?.providers) return;
		const failed = data.providers.filter(
			(provider) =>
				provider.status === "loginFailed" && loginChallenges[provider.id]?.status === "pending",
		);
		if (failed.length > 0) {
			setLoginChallenges((current) => {
				const next = { ...current };
				for (const provider of failed) delete next[provider.id];
				return next;
			});
			for (const provider of failed)
				toast.error(`${provider.label}登录失败`, {
					description: provider.help || "凭据保存失败，请重新登录。",
				});
			revalidateGenerationProviders();
		}
		const completedProviderIDs = data.providers
			.filter(
				(provider) =>
					provider.configured &&
					provider.status !== "loginFailed" &&
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
		revalidateGenerationProviders();
		revalidateModelDependentCaches();
	}, [
		checkingLoginID,
		data?.providers,
		loggingInID,
		loginChallenges,
		revalidateGenerationProviders,
		revalidateModelDependentCaches,
		toast,
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
			revalidateGenerationProviders();
			revalidateModelDependentCaches();
			setAPIKeys((current) => ({ ...current, [provider.id]: "" }));
			toast.success("API Key 已保存", { description: provider.label });
			return true;
		} catch (err) {
			const message = credentialErrorMessage(err, "保存 API Key 失败。");
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
			revalidateGenerationProviders();
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
			const message = credentialErrorMessage(err, "清除 API Key 失败。");
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
			revalidateGenerationProviders();
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
			const message = credentialErrorMessage(err, "登录失败。");
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
			const message = credentialErrorMessage(err, `打开${provider.label}授权页失败。`);
			toast.error("打开失败", { description: message });
		}
	};

	const completeLogin = async (provider: APIKeyProvider) => {
		const challenge = loginChallenges[provider.id];
		if (!challenge || challenge.status !== "pending") return;

		setCheckingLoginID(provider.id);
		try {
			// LibTV's login process waits for the browser and persists its result on
			// exit. It has no device-code command; confirm by reading that result.
			const nextData: APIKeyListResponse & { login?: APIKeyLoginChallenge } = challenge.deviceCode
				? await completeProviderLogin(provider.id, challenge.deviceCode)
				: await getAPIKeys();
			await mutate(nextData, false);
			revalidateGenerationProviders();
			const updatedProvider = nextData.providers.find((item) => item.id === provider.id);
			if (nextData.login && nextData.login.status !== "completed") {
				if (nextData.login.status === "pending") {
					toast.info("等待授权", { description: nextData.login.message });
				} else {
					setLoginChallenges((current) => withoutRecordKey(current, provider.id));
					toast.error(nextData.login.status === "expired" ? "授权已过期" : "授权未完成", {
						description: nextData.login.message,
					});
				}
				return;
			}
			if (updatedProvider?.status === "loginFailed") return;
			if (!updatedProvider?.configured) {
				toast.info("尚未确认登录", {
					description: "请先在浏览器完成授权；如果授权已过期，请取消后重新登录。",
				});
				return;
			}
			setLoginChallenges((current) => withoutRecordKey(current, provider.id));
			revalidateModelDependentCaches();
			toast.success("登录已完成", { description: provider.label });
		} catch (err) {
			const message = credentialErrorMessage(err, "登录确认失败。");
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
		isLoading: isLoading || isGenerationLoading || isModelPlatformsLoading,
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

const credentialErrorMessage = (error: unknown, fallback: string) => {
	if (
		error &&
		typeof error === "object" &&
		"message" in error &&
		typeof error.message === "string" &&
		error.message.trim()
	)
		return error.message;
	return fallback;
};
