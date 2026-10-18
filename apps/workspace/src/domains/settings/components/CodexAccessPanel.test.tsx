import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	beginCodexAccountLogin,
	cancelCodexAccountLogin,
	getCodexAccount,
	getCodexAccountLogin,
	getCodexRelaySettings,
	importLocalCodex,
} from "@/domains/settings/api/settings";
import { openExternalUrl } from "@/shared/desktop/actions";
import { CodexAccessPanel } from "./CodexAccessPanel";

vi.mock("@/domains/settings/api/settings", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/domains/settings/api/settings")>();
	return {
		...actual,
		beginCodexAccountLogin: vi.fn(),
		cancelCodexAccountLogin: vi.fn(),
		getCodexAccount: vi.fn(),
		getCodexAccountLogin: vi.fn(),
		getCodexRelaySettings: vi.fn(),
		importLocalCodex: vi.fn(),
		logoutCodexAccount: vi.fn(),
		saveCodexRelaySettings: vi.fn(),
	};
});

vi.mock("@/domains/settings/components/CodexRelayPanel", () => ({
	CodexRelayPanel: ({
		officialChannel,
		title,
	}: {
		officialChannel?: {
			busy: boolean;
			detail?: string;
			email?: string;
			onLogin: () => void;
			onCancel: () => void;
			onLogout: () => void;
			onReopen: () => void;
			onSwitchAccount: () => void;
			status: string;
		};
		title?: unknown;
	}) => (
		<div>
			<h2>{String(title)}</h2>
			<p>{officialChannel?.email}</p>
			<p>{officialChannel?.detail}</p>
			{officialChannel?.status === "loggedIn" ? (
				<>
					<button type="button" onClick={officialChannel.onSwitchAccount}>
						切换全局账号
					</button>
					<button type="button" onClick={officialChannel.onLogout}>
						退出全局账号
					</button>
				</>
			) : null}
			{officialChannel?.status === "loggedOut" ? (
				<button type="button" onClick={officialChannel.onLogin}>
					使用 ChatGPT 登录
				</button>
			) : null}
			{officialChannel?.status === "pending" ? (
				<>
					<button type="button" onClick={officialChannel.onReopen}>
						重新打开浏览器
					</button>
					<button type="button" onClick={officialChannel.onCancel}>
						取消登录
					</button>
				</>
			) : null}
		</div>
	),
}));

vi.mock("@/shared/desktop/actions", () => ({ openExternalUrl: vi.fn() }));

const toast = vi.hoisted(() => ({
	error: vi.fn(),
	info: vi.fn(),
	success: vi.fn(),
	warning: vi.fn(),
}));
vi.mock("@/hooks/useToast", () => ({ useToast: () => toast }));

describe("CodexAccessPanel", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getCodexRelaySettings).mockResolvedValue({
			enabled: false,
			activeProfileId: "",
			profiles: [],
		});
	});

	afterEach(() => {
		cleanup();
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it("clears pending polling and ignores a late completion after unmount", async () => {
		vi.mocked(getCodexAccount).mockResolvedValue({
			status: "notLoggedIn",
			codexHome: "/test",
			shared: true,
		});
		vi.mocked(beginCodexAccountLogin).mockResolvedValue({ loginId: "pending", status: "pending" });
		let complete!: (value: Awaited<ReturnType<typeof getCodexAccountLogin>>) => void;
		vi.mocked(getCodexAccountLogin).mockImplementation(
			() =>
				new Promise((resolve) => {
					complete = resolve;
				}),
		);
		const clearTimer = vi.spyOn(window, "clearInterval");
		const view = renderPanel();
		fireEvent.click(await screen.findByRole("button", { name: "使用 ChatGPT 登录" }));
		await waitFor(() => expect(getCodexAccountLogin).toHaveBeenCalledTimes(1));
		view.unmount();
		expect(clearTimer).toHaveBeenCalled();
		await act(async () => complete({ loginId: "pending", status: "completed" }));
		expect(getCodexAccount).toHaveBeenCalledTimes(1);
		expect(toast.success).not.toHaveBeenCalled();
	});

	it("imports local Codex and surfaces backend failures without claiming connection", async () => {
		vi.mocked(getCodexAccount).mockResolvedValue({
			status: "notLoggedIn",
			codexHome: "/isolated",
			shared: false,
		});
		vi.mocked(importLocalCodex).mockRejectedValueOnce({ message: "本地中转没有可读取的 API Key" });
		renderPanel();
		await waitFor(() =>
			expect(screen.getByRole("button", { name: "接入本地 Codex" })).toBeEnabled(),
		);
		fireEvent.click(screen.getByRole("button", { name: "接入本地 Codex" }));
		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith("接入本地 Codex 失败", {
				description: "本地中转没有可读取的 API Key",
			}),
		);
		expect(toast.success).not.toHaveBeenCalled();
		vi.mocked(importLocalCodex).mockResolvedValueOnce({ enabled: true, profiles: [] });
		fireEvent.click(screen.getByRole("button", { name: "接入本地 Codex" }));
		await waitFor(() =>
			expect(toast.success).toHaveBeenCalledWith("已接入本地 Codex", expect.anything()),
		);
		expect(getCodexAccount).toHaveBeenCalledTimes(2);
	});

	it("returns to logged out after canceling a pending attempt", async () => {
		vi.mocked(getCodexAccount).mockResolvedValue({
			status: "notLoggedIn",
			codexHome: "/test",
			shared: true,
		});
		vi.mocked(beginCodexAccountLogin).mockResolvedValue({ loginId: "pending", status: "pending" });
		vi.mocked(getCodexAccountLogin).mockResolvedValue({ loginId: "pending", status: "pending" });
		vi.mocked(cancelCodexAccountLogin).mockResolvedValue({
			loginId: "pending",
			status: "canceled",
		});
		renderPanel();
		fireEvent.click(await screen.findByRole("button", { name: "使用 ChatGPT 登录" }));
		fireEvent.click(await screen.findByRole("button", { name: "取消登录" }));
		expect(await screen.findByRole("button", { name: "使用 ChatGPT 登录" })).toBeInTheDocument();
		expect(cancelCodexAccountLogin).toHaveBeenCalledWith("pending");
	});

	it("reuses and displays the shared global Codex account", async () => {
		vi.mocked(getCodexAccount).mockResolvedValue({
			status: "loggedIn",
			email: "user@example.com",
			planType: "plus",
			codexHome: "/Users/test/.codex",
			shared: true,
		});

		renderPanel();

		expect(await screen.findByText("user@example.com")).toBeInTheDocument();
		expect(screen.getByText("ChatGPT Plus · /Users/test/.codex")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "退出全局账号" })).toBeInTheDocument();
		expect(beginCodexAccountLogin).not.toHaveBeenCalled();
	});

	it("opens the browser URL returned by bundled Codex", async () => {
		vi.mocked(getCodexAccount).mockResolvedValue({
			status: "notLoggedIn",
			codexHome: "/Users/test/.codex",
			shared: true,
		});
		vi.mocked(beginCodexAccountLogin).mockResolvedValue({
			loginId: "login-123",
			authUrl: "https://chatgpt.com/auth/test",
			status: "pending",
		});
		vi.mocked(getCodexAccountLogin).mockResolvedValue({
			loginId: "login-123",
			authUrl: "https://chatgpt.com/auth/test",
			status: "pending",
		});

		renderPanel();
		fireEvent.click(await screen.findByRole("button", { name: "使用 ChatGPT 登录" }));

		await waitFor(() =>
			expect(openExternalUrl).toHaveBeenCalledWith("https://chatgpt.com/auth/test"),
		);
		expect(await screen.findByRole("button", { name: "重新打开浏览器" })).toBeInTheDocument();
	});

	it("forces browser account selection when switching from a logged in account", async () => {
		vi.mocked(getCodexAccount).mockResolvedValue({
			status: "loggedIn",
			email: "user@example.com",
			codexHome: "/Users/test/.codex",
			shared: true,
		});
		vi.mocked(beginCodexAccountLogin).mockResolvedValue({
			loginId: "login-switch",
			authUrl: "https://chatgpt.com/auth/switch",
			status: "pending",
		});

		vi.mocked(getCodexAccountLogin).mockResolvedValue({
			loginId: "login-switch",
			status: "pending",
		});
		renderPanel();
		fireEvent.click(await screen.findByRole("button", { name: "切换全局账号" }));

		await waitFor(() => expect(beginCodexAccountLogin).toHaveBeenCalledWith(true));
		expect(await screen.findByRole("button", { name: "重新打开浏览器" })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "切换全局账号" })).not.toBeInTheDocument();
	});
});

const renderPanel = () =>
	render(
		<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
			<CodexAccessPanel />
		</SWRConfig>,
	);
