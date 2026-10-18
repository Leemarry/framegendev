import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KeyRound } from "lucide-react";
import type { APIKeyProvider } from "@/domains/settings/api/settings";
import { ProviderCard } from "./ProviderCard";

const comingSoonProvider: APIKeyProvider = {
	id: "kling",
	label: "AI 可灵",
	description: "AI 可灵接入待接入。",
	configured: false,
	source: "none",
	credentialKind: "apiKey",
	status: "comingSoon",
};

describe("ProviderCard", () => {
	afterEach(cleanup);
	it("shows failed authorization and allows retry", () => {
		const onLogin = vi.fn();
		render(
			<ProviderCard
				provider={{
					...comingSoonProvider,
					id: "libtv",
					label: "LibTV",
					credentialKind: "oauth",
					status: "loginFailed",
				}}
				icon={KeyRound}
				onLogin={onLogin}
				onConfirmLogin={vi.fn()}
				onOpenLogin={vi.fn()}
				onClear={vi.fn()}
				onConfigure={vi.fn()}
			/>,
		);
		expect(screen.getByText("登录失败")).toBeInTheDocument();
		expect(screen.queryByText("等待授权")).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "登录" }));
		expect(onLogin).toHaveBeenCalledOnce();
	});
	it("opens advanced settings for an uninstalled CLI and keeps login disabled", async () => {
		const onAdvancedSettings = vi.fn();
		render(
			<ProviderCard
				provider={{
					...comingSoonProvider,
					id: "libtv",
					label: "LibTV",
					credentialKind: "oauth",
					status: "loggedOut",
					runtime: { available: false, binaryPath: "", source: "" },
				}}
				icon={KeyRound}
				onLogin={vi.fn()}
				onConfirmLogin={vi.fn()}
				onOpenLogin={vi.fn()}
				onClear={vi.fn()}
				onConfigure={vi.fn()}
				onAdvancedSettings={onAdvancedSettings}
			/>,
		);
		expect(screen.getByText("CLI 不可用")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "登录" })).toBeDisabled();
		fireEvent.click(screen.getByRole("button", { name: "LibTV 更多操作" }));
		fireEvent.click(await screen.findByRole("menuitem", { name: "高级设置" }));
		expect(onAdvancedSettings).toHaveBeenCalledOnce();
	});

	it("offers open and confirm for LibTV browser authorization without a device code", () => {
		const onOpenLogin = vi.fn(),
			onConfirmLogin = vi.fn();
		render(
			<ProviderCard
				provider={{
					...comingSoonProvider,
					id: "libtv",
					label: "LibTV",
					credentialKind: "oauth",
					status: "loggedOut",
				}}
				loginChallenge={{ status: "pending", verificationUri: "https://example.test/login" }}
				icon={KeyRound}
				onLogin={vi.fn()}
				onConfirmLogin={onConfirmLogin}
				onOpenLogin={onOpenLogin}
				onClear={vi.fn()}
				onConfigure={vi.fn()}
			/>,
		);
		expect(screen.getByText("等待授权")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "打开" }));
		fireEvent.click(screen.getByRole("button", { name: "确认" }));
		expect(onOpenLogin).toHaveBeenCalledOnce();
		expect(onConfirmLogin).toHaveBeenCalledOnce();
	});
	it("distinguishes OAuth login from verified creation access", () => {
		render(
			<ProviderCard
				provider={{
					...comingSoonProvider,
					id: "jimeng",
					label: "即梦",
					credentialKind: "oauth",
					configured: true,
					status: "partial",
				}}
				icon={KeyRound}
				onLogin={vi.fn()}
				onConfirmLogin={vi.fn()}
				onOpenLogin={vi.fn()}
				onClear={vi.fn()}
				onConfigure={vi.fn()}
			/>,
		);
		expect(screen.getByText("已登录 · 权限待确认")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "重新登录" })).toBeEnabled();
	});

	it("renders coming soon providers without an actionable configuration control", () => {
		const onConfigure = vi.fn();
		const onClear = vi.fn();

		render(
			<ProviderCard
				provider={comingSoonProvider}
				icon={KeyRound}
				onLogin={vi.fn()}
				onConfirmLogin={vi.fn()}
				onOpenLogin={vi.fn()}
				onClear={onClear}
				onConfigure={onConfigure}
			/>,
		);

		expect(screen.getByText("AI 可灵")).toBeInTheDocument();
		expect(screen.getAllByText("待接入")).toHaveLength(2);
		expect(screen.getByRole("button", { name: "配置 AI 可灵" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "AI 可灵 更多操作" })).toBeDisabled();
		expect(onConfigure).not.toHaveBeenCalled();
		expect(onClear).not.toHaveBeenCalled();
	});
});
