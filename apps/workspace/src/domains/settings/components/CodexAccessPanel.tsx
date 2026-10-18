import { LogOut } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { isAgentRuntimeConfigKey } from "@/domains/agent/api/agent";
import {
	type CodexLoginAttempt,
	beginCodexAccountLogin,
	cancelCodexAccountLogin,
	codexAccountKey,
	getCodexAccount,
	getCodexAccountLogin,
	importLocalCodex,
	codexRelaySettingsKey,
	logoutCodexAccount,
} from "@/domains/settings/api/settings";
import { CodexRelayPanel } from "@/domains/settings/components/CodexRelayPanel";
import { useToast } from "@/hooks/useToast";
import { confirmDialog } from "@/shared/components/callable/ConfirmDialog";
import { Button } from "@/shared/components/ui/button";
import { openExternalUrl } from "@/shared/desktop/actions";

export const CodexAccessPanel: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
	const toast = useToast();
	const { mutate: mutateGlobal } = useSWRConfig();
	const {
		data: account,
		error: accountError,
		isLoading,
		mutate,
	} = useSWR(codexAccountKey, getCodexAccount);
	const [attempt, setAttempt] = useState<CodexLoginAttempt>();
	const [busy, setBusy] = useState("");

	const refreshAccount = useCallback(async () => {
		await mutate();
		void mutateGlobal(isAgentRuntimeConfigKey, undefined, { revalidate: true });
	}, [mutate, mutateGlobal]);

	useEffect(() => {
		if (!attempt || attempt.status !== "pending") return;
		let disposed = false;
		let checking = false;
		const check = async () => {
			if (checking || disposed) return;
			checking = true;
			try {
				const next = await getCodexAccountLogin(attempt.loginId);
				if (disposed) return;
				setAttempt((current) =>
					current?.loginId === attempt.loginId && current.status === "pending" ? next : current,
				);
				if (next.status === "completed") {
					await refreshAccount();
					toast.success("ChatGPT 登录成功", { description: "已保存到项目独立 Codex 目录。" });
				} else if (next.status !== "pending" && next.status !== "canceled") {
					toast.error("ChatGPT 登录失败", { description: next.error || "请重新发起登录。" });
				}
			} catch (error) {
				if (!disposed) {
					toast.error("检查登录状态失败", { description: errorMessage(error) });
					setAttempt(undefined);
				}
			} finally {
				checking = false;
			}
		};
		const interval = window.setInterval(() => void check(), 1500);
		void check();
		return () => {
			disposed = true;
			window.clearInterval(interval);
		};
	}, [attempt?.loginId, attempt?.status, refreshAccount, toast]);

	const connectLocal = async () => {
		setBusy("local");
		try {
			await importLocalCodex();
			await refreshAccount();
			await mutateGlobal(codexRelaySettingsKey);
			toast.success("已接入本地 Codex", {
				description: "已保存到项目独立运行目录，可返回对话选择模型。",
			});
		} catch (error) {
			toast.error("接入本地 Codex 失败", { description: errorMessage(error) });
		} finally {
			setBusy("");
		}
	};

	const startLogin = async (forceBrowser = false) => {
		setBusy("login");
		try {
			const next = await beginCodexAccountLogin(forceBrowser);
			setAttempt(next);
			if (next.authUrl) await openExternalUrl(next.authUrl);
			toast.info("ChatGPT 登录页已打开", { description: "请在浏览器中完成授权。" });
		} catch (error) {
			toast.error("无法开始登录", { description: errorMessage(error) });
		} finally {
			setBusy("");
		}
	};

	const reopenLogin = async () => {
		if (!attempt?.authUrl) return;
		try {
			await openExternalUrl(attempt.authUrl);
		} catch (error) {
			toast.error("打开登录页失败", { description: errorMessage(error) });
		}
	};

	const cancelLogin = async () => {
		if (!attempt) return;
		setBusy("cancel");
		try {
			const next = await cancelCodexAccountLogin(attempt.loginId);
			setAttempt(next);
			toast.info("登录已取消");
		} catch (error) {
			toast.error("取消失败", { description: errorMessage(error) });
		} finally {
			setBusy("");
		}
	};

	const logout = async () => {
		setBusy("logout");
		try {
			const next = await logoutCodexAccount();
			await mutate(next, false);
			toast.success("已退出项目 Codex 账号");
			return true;
		} catch (error) {
			toast.error("退出失败", { description: errorMessage(error) });
			return false;
		} finally {
			setBusy("");
		}
	};

	const confirmLogout = () => {
		void confirmDialog({
			title: "退出项目 Codex 账号？",
			description: "仅退出本项目的 ChatGPT 登录，桌面 Codex 账号不受影响。",
			confirmLabel: "退出账号",
			confirmIcon: <LogOut />,
			onConfirm: logout,
		});
	};

	const loggedIn = account?.status === "loggedIn";
	const pending = attempt?.status === "pending";
	const status = isLoading
		? ("loading" as const)
		: accountError || account?.status === "unavailable"
			? ("error" as const)
			: pending
				? ("pending" as const)
				: loggedIn
					? ("loggedIn" as const)
					: ("loggedOut" as const);

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
				<div>
					<p className="text-sm font-medium">本地 Codex</p>
					<p className="text-xs text-muted-foreground">
						读取本机中转配置或 ChatGPT 登录凭据，在项目独立目录运行。
					</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					disabled={!!busy || isLoading}
					onClick={() => void connectLocal()}
				>
					{busy === "local" ? "正在接入…" : "接入本地 Codex"}
				</Button>
			</div>
			<CodexRelayPanel
				embedded={embedded}
				title="Codex 接入"
				description="选择 ChatGPT 官方订阅，或通过中转平台接入 Codex。"
				officialChannel={{
					status,
					email: account?.email,
					detail: loggedIn ? `${planLabel(account.planType)} · ${account.codexHome}` : undefined,
					busy: busy !== "",
					onCancel: () => void cancelLogin(),
					onLogin: () => void startLogin(),
					onLogout: confirmLogout,
					onReopen: () => void reopenLogin(),
					onSwitchAccount: () => void startLogin(true),
				}}
			/>
		</div>
	);
};

const planLabel = (value?: string) => {
	if (!value) return "ChatGPT 订阅";
	return `ChatGPT ${value.charAt(0).toUpperCase()}${value.slice(1)}`;
};

const errorMessage = (error: unknown) =>
	typeof error === "object" &&
	error !== null &&
	"message" in error &&
	typeof error.message === "string"
		? error.message
		: "操作失败，请重试。";
