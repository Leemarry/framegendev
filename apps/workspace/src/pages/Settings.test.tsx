import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	beginProviderLogin,
	clearAPIKey,
	completeProviderLogin,
	getAPIKeys,
	getModelPlatforms,
	saveAPIKey,
	type APIKeyLoginChallenge,
	type APIKeyListResponse,
	type ModelPlatformsResponse,
} from "@/domains/settings/api/settings";
import { agentBackendsKey, isAgentRuntimeConfigKey } from "@/domains/agent/api/agent";
import { generationModelsKey } from "@/domains/generation/api/generation";
import { openExternalUrl } from "@/shared/desktop/actions";
import { useSettingsNavigationStore } from "@/lib/stores/settings";
import { ConfirmDialog } from "@/shared/components/callable/ConfirmDialog";
import { Settings } from "./Settings";

const swrMocks = vi.hoisted(() => ({
	mutate: vi.fn(),
}));

vi.mock("swr", async (importOriginal) => {
	const actual = await importOriginal<typeof import("swr")>();
	return {
		...actual,
		useSWRConfig: () => ({ mutate: swrMocks.mutate }),
	};
});

vi.mock("@/domains/settings/api/settings", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/domains/settings/api/settings")>();
	return {
		...actual,
		beginProviderLogin: vi.fn(),
		clearAPIKey: vi.fn(),
		completeProviderLogin: vi.fn(),
		getAPIKeys: vi.fn(),
		getJianyingDraftSettings: vi.fn(),
		getModelPlatforms: vi.fn(),
		saveAPIKey: vi.fn(),
		saveJianyingDraftSettings: vi.fn(),
	};
});

vi.mock("@/hooks/useToast", () => ({
	useToast: () => ({
		error: vi.fn(),
		info: vi.fn(),
		success: vi.fn(),
		warning: vi.fn(),
	}),
}));

vi.mock("@/domains/settings/components/CodexSkillsPanel", () => ({
	CodexSkillsPanel: () => <h2>Codex 全局技能</h2>,
}));

// Debug 面板依赖 tiptap 编辑器，与本页无关，桩掉以隔离第三方编辑器加载。
vi.mock("@/pages/Debug", () => ({
	debugTabs: [
		{ value: "instructions", label: "智能体指令", description: "", icon: () => null },
		{ value: "prompt-packs", label: "技能包", description: "", icon: () => null },
	],
	DebugTabPanel: () => <h2>调试面板</h2>,
}));

// Codex 接入区块有独立的 SWR 与组件测试，这里用桩隔离，避免噪音并聚焦整合页布局。
vi.mock("@/domains/settings/components/CodexAccessPanel", () => ({
	CodexAccessPanel: () => (
		<section data-testid="codex-access-section">
			<h3>Codex 接入</h3>
		</section>
	),
}));

vi.mock("@/shared/desktop/actions", () => ({
	getDesktopCacheStatistics: vi.fn(),
	openExternalUrl: vi.fn(),
	pickDesktopDirectory: vi.fn(),
}));

describe("Settings model access page", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		useSettingsNavigationStore.setState({ activeTab: "model-access" });
		vi.mocked(getAPIKeys).mockResolvedValue(apiKeysResponse({}));
		vi.mocked(getModelPlatforms).mockResolvedValue(modelPlatformsResponse());
		vi.mocked(saveAPIKey).mockResolvedValue(apiKeysResponse({ mediagoConfigured: true }));
	});

	afterEach(() => {
		cleanup();
	});

	it.each([
		"account",
		"browser",
		"comfyui-local",
		"comfyui-cloud",
		"mg-animation",
		"installation",
		"extensions",
		"feishu-agent",
		"drami-motion",
	])("opens %s with honest capability status", (tab) => {
		useSettingsNavigationStore.setState({ activeTab: tab });
		render(
			<MemoryRouter>
				<SWRConfig value={{ provider: () => new Map() }}>
					<Settings />
				</SWRConfig>
			</MemoryRouter>,
		);
		expect(screen.getAllByText(/【待(开发|接入)】/).length).toBeGreaterThan(0);
		expect(screen.queryByRole("button", { name: "保存" })).toBeNull();
	});

	it("renders the four consolidated sections and no review placeholder", async () => {
		renderSettings();

		expect(await screen.findByRole("heading", { name: "模型接入" })).toBeInTheDocument();
		expect(screen.queryByText("【待评审】")).not.toBeInTheDocument();
		expect(screen.getByTestId("codex-access-section")).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "Codex 接入" })).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "会员 CLI 接入" })).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "官方 API 接入" })).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "聚合平台接入" })).toBeInTheDocument();
	});

	it.each(["api-keys", "codex-access", "codex-relay", "agent-model-profiles"])(
		"normalizes legacy route %s to the model access page",
		async (tab) => {
			useSettingsNavigationStore.setState({ activeTab: tab });
			renderSettings();
			expect(await screen.findByRole("heading", { name: "模型接入" })).toBeInTheDocument();
		},
	);

	it("shows official API providers by default and marks Kling as coming soon", async () => {
		renderSettings();

		const officialSection = (await screen.findByRole("heading", { name: "官方 API 接入" })).closest(
			"section",
		);
		expect(officialSection).toBeTruthy();
		expect(within(officialSection as HTMLElement).getByText("火山引擎")).toBeInTheDocument();
		expect(within(officialSection as HTMLElement).getByText("AI 可灵")).toBeInTheDocument();
		expect(
			within(officialSection as HTMLElement).getByRole("button", { name: "配置 AI 可灵" }),
		).toBeDisabled();
	});

	it("hides the Codex section but keeps other sections on a non-codex backend", async () => {
		render(
			<MemoryRouter>
				<SWRConfig
					value={{
						fallback: { [agentBackendsKey]: { activeId: "opencode", backends: [] } },
						provider: () => new Map(),
					}}
				>
					<Settings />
					<ConfirmDialog />
				</SWRConfig>
			</MemoryRouter>,
		);

		expect(await screen.findByRole("heading", { name: "会员 CLI 接入" })).toBeInTheDocument();
		expect(screen.queryByTestId("codex-access-section")).not.toBeInTheDocument();
	});

	it("renders CLI cards with the jimeng hint and login action", async () => {
		renderSettings();

		const cliSection = (await screen.findByRole("heading", { name: "会员 CLI 接入" })).closest(
			"section",
		);
		expect(cliSection).toBeTruthy();
		expect(within(cliSection as HTMLElement).getByText("即梦")).toBeInTheDocument();
		expect(within(cliSection as HTMLElement).getByText("未登录")).toBeInTheDocument();
		expect(
			within(cliSection as HTMLElement)
				.getByTestId("provider-card-jimeng")
				.querySelector("button:not([aria-label])"),
		).toBeInTheDocument();
		// 会员 CLI 区不应泄漏原始 provider id。
		expect(screen.queryByText("jimeng")).not.toBeInTheDocument();
	});

	it("renders MediaGo as an aggregator card with model chips", async () => {
		renderSettings();

		expect(await screen.findByTestId("provider-card-mediago")).toBeInTheDocument();
		expect(screen.getByText("支持模型")).toBeInTheDocument();
		expect(screen.getByText("MiniMax M3")).toBeInTheDocument();
		expect(screen.getByText("GLM 4.7")).toBeInTheDocument();
	});

	it("keeps Wan and supported HappyHorse variants visible after the model chip limit", async () => {
		vi.mocked(getModelPlatforms).mockResolvedValue(
			modelPlatformsResponse({
				mediagoModels: [
					"GPT Image 2",
					"Gemini 2.5 Flash Image",
					"Gemini 3.1 Flash Lite Image",
					"Gemini 3 Pro Image",
					"Gemini 2.5 Flash",
					"Gemini 3.1 Flash Image",
					"Gemini 3.5 Flash",
					"Gemini 3.1 Pro Preview",
					"Wan 2.7 Image",
					"Wan 2.7 Image Pro",
					"HappyHorse 1.1 Text to Video",
					"HappyHorse 1.1 Image to Video",
					"HappyHorse 1.1 Reference to Video",
				],
			}),
		);

		renderSettings();

		expect(await screen.findByText("Wan 2.7 Image")).toBeInTheDocument();
		expect(screen.getByText("Wan 2.7 Image Pro")).toBeInTheDocument();
		expect(screen.getByText("HappyHorse 1.1 Text to Video")).toBeInTheDocument();
		expect(screen.getByText("HappyHorse 1.1 Reference to Video")).toBeInTheDocument();
		expect(screen.queryByText("HappyHorse 1.1 Image to Video")).not.toBeInTheDocument();
		expect(screen.getByText("等 13 个模型")).toBeInTheDocument();
	});

	it("keeps configured aggregators visible without platform metadata", async () => {
		vi.mocked(getAPIKeys).mockResolvedValue(
			apiKeysResponse({ mediagoConfigured: true, openrouterConfigured: true }),
		);
		vi.mocked(getModelPlatforms).mockResolvedValue({ platforms: [] });

		renderSettings();

		await screen.findByRole("heading", { name: "会员 CLI 接入" });
		expect(screen.getByTestId("aggregator-section")).toBeInTheDocument();
		expect(screen.getByText("OpenRouter")).toBeInTheDocument();
	});

	it("opens the MediaGo registration page from its config dialog", async () => {
		renderSettings();

		fireEvent.click(await screen.findByRole("button", { name: "配置 MediaGo聚合平台" }));
		fireEvent.click(await screen.findByRole("button", { name: /免费注册获取/ }));

		expect(openExternalUrl).toHaveBeenCalledWith(expect.stringContaining("apiKeys"));
	});

	it("saves the MediaGo key from the config dialog", async () => {
		renderSettings();

		fireEvent.click(await screen.findByRole("button", { name: "配置 MediaGo聚合平台" }));
		const dialog = await screen.findByRole("dialog", { name: "配置 MediaGo API Key" });
		const input = within(dialog).getByLabelText("MediaGo API Key") as HTMLInputElement;
		fireEvent.change(input, { target: { value: "sk-mediago-123456" } });

		expect(screen.getByText("API Key 已输入，可以点击一键配置完成保存。")).toBeInTheDocument();
		fireEvent.click(within(dialog).getByRole("button", { name: "一键配置" }));

		await waitFor(() => expect(saveAPIKey).toHaveBeenCalledWith("mediago", "sk-mediago-123456"));
		expectModelDependentCachesRevalidated();
	});

	it("refreshes model-dependent caches after clearing the MediaGo credential", async () => {
		vi.mocked(getAPIKeys).mockResolvedValue(apiKeysResponse({ mediagoConfigured: true }));
		vi.mocked(clearAPIKey).mockResolvedValue(apiKeysResponse({}));
		renderSettings();

		fireEvent.click(await screen.findByRole("button", { name: "MediaGo聚合平台 更多操作" }));
		fireEvent.click(await screen.findByRole("menuitem", { name: "清除 API Key" }));
		expect(clearAPIKey).not.toHaveBeenCalled();
		fireEvent.click(await screen.findByRole("button", { name: "清除 API Key" }));

		await waitFor(() => expect(clearAPIKey).toHaveBeenCalledWith("mediago"));
		expectModelDependentCachesRevalidated();
	});

	it("clears a configured OpenRouter key from the card menu only after confirmation", async () => {
		vi.mocked(getAPIKeys).mockResolvedValue(apiKeysResponse({ openrouterConfigured: true }));
		vi.mocked(clearAPIKey).mockResolvedValue(apiKeysResponse({}));
		renderSettings();

		fireEvent.click(await screen.findByRole("button", { name: "OpenRouter 更多操作" }));
		fireEvent.click(await screen.findByRole("menuitem", { name: "清除 API Key" }));

		expect(clearAPIKey).not.toHaveBeenCalled();
		expect(
			await screen.findByRole("alertdialog", { name: "清除 OpenRouter API Key？" }),
		).toBeVisible();
		fireEvent.click(screen.getByRole("button", { name: "取消" }));
		await waitFor(() =>
			expect(
				screen.queryByRole("alertdialog", { name: "清除 OpenRouter API Key？" }),
			).not.toBeInTheDocument(),
		);
		expect(clearAPIKey).not.toHaveBeenCalled();

		fireEvent.click(screen.getByRole("button", { name: "OpenRouter 更多操作" }));
		fireEvent.click(await screen.findByRole("menuitem", { name: "清除 API Key" }));
		fireEvent.click(screen.getByRole("button", { name: "清除 API Key" }));

		await waitFor(() => expect(clearAPIKey).toHaveBeenCalledWith("openrouter"));
	});

	it("does not render non-editable routing metadata as form inputs", async () => {
		renderSettings();

		fireEvent.click(await screen.findByRole("button", { name: "配置 OpenRouter" }));

		const dialog = await screen.findByRole("dialog", { name: "配置 OpenRouter" });
		expect(dialog).toBeInTheDocument();
		expect(screen.getByLabelText("OpenRouter API Key")).toBeInTheDocument();
		expect(screen.queryByLabelText("供应商 ID")).not.toBeInTheDocument();
		expect(screen.queryByLabelText("端点策略")).not.toBeInTheDocument();
		expect(screen.queryByLabelText("模型路由")).not.toBeInTheDocument();
		expect(screen.queryByLabelText("能力范围")).not.toBeInTheDocument();
	});

	it("clears a pending jimeng login so it can be retried", async () => {
		vi.mocked(beginProviderLogin).mockResolvedValue({
			...apiKeysResponse({}),
			login: {
				status: "pending",
				verificationUri: "https://jimeng.example.test/device",
				userCode: "JIM-ENG",
				deviceCode: "jimeng-device-code",
			},
		});
		vi.mocked(clearAPIKey).mockResolvedValue(apiKeysResponse({}));
		renderSettings();

		fireEvent.click(await screen.findByRole("button", { name: "登录" }));

		expect(await screen.findByRole("button", { name: "确认" })).toBeEnabled();
		fireEvent.click(screen.getByRole("button", { name: "即梦 更多操作" }));
		fireEvent.click(await screen.findByRole("menuitem", { name: "取消登录" }));
		expect(clearAPIKey).not.toHaveBeenCalled();
		fireEvent.click(await screen.findByRole("button", { name: "取消登录" }));

		await waitFor(() => expect(clearAPIKey).toHaveBeenCalledWith("jimeng"));
		await waitFor(() => expect(screen.queryByText("等待浏览器授权")).not.toBeInTheDocument());
		expect(await screen.findByRole("button", { name: "登录" })).toBeEnabled();
	});

	it("renders LibTV and Xiaoyunque CLI providers from platform data", async () => {
		vi.mocked(getAPIKeys).mockResolvedValue(apiKeysResponse({ includeExtraCLI: true }));
		vi.mocked(getModelPlatforms).mockResolvedValue(
			modelPlatformsResponse({ cliProviderIDs: ["libtv", "xiaoyunque"] }),
		);

		renderSettings();

		const cliSection = (await screen.findByRole("heading", { name: "会员 CLI 接入" })).closest(
			"section",
		);
		expect(cliSection).toBeTruthy();
		expect(within(cliSection as HTMLElement).getByText("LibTV")).toBeInTheDocument();
		expect(within(cliSection as HTMLElement).getByText("小云雀")).toBeInTheDocument();
		expect(
			within(cliSection as HTMLElement).getAllByRole("button", { name: "登录" }).length,
		).toBeGreaterThan(0);
		expect(
			screen.queryByText("已有小云雀 Access Key？可通过本地 Pippit CLI 接入。"),
		).not.toBeInTheDocument();
		expect(
			within(cliSection as HTMLElement).queryByLabelText("小云雀 API Key"),
		).not.toBeInTheDocument();
		fireEvent.click(within(cliSection as HTMLElement).getByRole("button", { name: "配置 小云雀" }));
		const dialog = await screen.findByRole("dialog", { name: "配置 小云雀" });
		expect(within(dialog).getByLabelText("小云雀 API Key")).toBeInTheDocument();
		expect(within(cliSection as HTMLElement).getByText("即梦")).toBeInTheDocument();
	});

	it("saves the Xiaoyunque key from a CLI config dialog", async () => {
		vi.mocked(getAPIKeys).mockResolvedValue(apiKeysResponse({ includeExtraCLI: true }));
		vi.mocked(getModelPlatforms).mockResolvedValue(
			modelPlatformsResponse({ cliProviderIDs: ["xiaoyunque"] }),
		);

		renderSettings();

		const cliSection = (await screen.findByRole("heading", { name: "会员 CLI 接入" })).closest(
			"section",
		);
		expect(cliSection).toBeTruthy();
		fireEvent.click(within(cliSection as HTMLElement).getByRole("button", { name: "配置 小云雀" }));
		const dialog = await screen.findByRole("dialog", { name: "配置 小云雀" });
		fireEvent.change(within(dialog).getByLabelText("小云雀 API Key"), {
			target: { value: "xyq-access-key-123456" },
		});
		fireEvent.click(within(dialog).getByRole("button", { name: "保存" }));

		await waitFor(() =>
			expect(saveAPIKey).toHaveBeenCalledWith("xiaoyunque", "xyq-access-key-123456"),
		);
	});

	it("shows read-only CLI package metadata and preserves the key after a failed save", async () => {
		const data = apiKeysResponse({ includeExtraCLI: true });
		for (const provider of data.providers) {
			if (provider.id === "xiaoyunque")
				provider.runtime = {
					available: true,
					binaryPath: "E:/tools/pippit/replacement.exe",
					version: "2.0",
					source: "packaged",
				};
		}
		vi.mocked(getAPIKeys).mockResolvedValue(data);
		vi.mocked(saveAPIKey).mockRejectedValue({ message: "凭据保存服务不可用" });
		renderSettings();
		fireEvent.click(await screen.findByRole("button", { name: "配置 小云雀" }));
		const dialog = await screen.findByRole("dialog", { name: "配置 小云雀" });
		fireEvent.click(within(dialog).getByText("高级设置"));
		expect(within(dialog).getByPlaceholderText("输入 XYQ_ACCESS_KEY")).toBeInTheDocument();
		expect(within(dialog).getByLabelText("CLI 可执行文件路径")).toHaveValue(
			"E:/tools/pippit/replacement.exe",
		);
		expect(within(dialog).getByLabelText("CLI 可执行文件路径")).toHaveAttribute("readonly");
		fireEvent.change(within(dialog).getByLabelText("小云雀 API Key"), {
			target: { value: "test-draft" },
		});
		fireEvent.click(within(dialog).getByRole("button", { name: "保存" }));
		await waitFor(() => expect(saveAPIKey).toHaveBeenCalledWith("xiaoyunque", "test-draft"));
		await waitFor(() => expect(within(dialog).getByRole("button", { name: "保存" })).toBeEnabled());
		expect(within(dialog).getByLabelText("小云雀 API Key")).toHaveValue("test-draft");
	});

	it("refreshes model-dependent caches after an immediate LibTV login", async () => {
		mockLibTVSettings();
		vi.mocked(beginProviderLogin).mockResolvedValue(
			libTVLoginResponse({ status: "completed" }, true),
		);
		renderSettings();

		fireEvent.click(
			await within(await screen.findByTestId("provider-card-libtv")).findByRole("button", {
				name: "登录",
			}),
		);

		await waitFor(() => expect(beginProviderLogin).toHaveBeenCalledWith("libtv", false));
		expectModelDependentCachesRevalidated();
	});

	it("refreshes model-dependent caches only after a pending LibTV login is confirmed", async () => {
		mockLibTVSettings();
		vi.mocked(beginProviderLogin).mockResolvedValue(
			libTVLoginResponse({
				status: "pending",
				verificationUri: "https://lib.tv/device",
				userCode: "LIB-TV",
			}),
		);

		renderSettings();

		fireEvent.click(
			await within(await screen.findByTestId("provider-card-libtv")).findByRole("button", {
				name: "登录",
			}),
		);

		expect(await screen.findByText("等待浏览器授权")).toBeInTheDocument();
		expect(swrMocks.mutate).not.toHaveBeenCalled();

		fireEvent.click(screen.getByRole("button", { name: "确认" }));
		await waitFor(() => expect(getAPIKeys).toHaveBeenCalledTimes(2));
		expect(screen.getByText("等待浏览器授权")).toBeInTheDocument();
		expect(swrMocks.mutate).not.toHaveBeenCalled();
		vi.mocked(getAPIKeys).mockResolvedValue(libTVLoginResponse({ status: "completed" }, true));
		await waitFor(() => expect(screen.getByRole("button", { name: "确认" })).toBeEnabled());
		fireEvent.click(screen.getByRole("button", { name: "确认" }));

		await waitFor(() => expect(screen.queryByText("等待浏览器授权")).not.toBeInTheDocument());
		expect(completeProviderLogin).not.toHaveBeenCalled();
		expectModelDependentCachesRevalidated();
	});

	it("refreshes model-dependent caches when polling observes LibTV become configured", async () => {
		let pollLogin: TimerHandler | undefined;
		let finishOpeningLoginPage: (() => void) | undefined;
		const setIntervalSpy = vi
			.spyOn(window, "setInterval")
			.mockImplementation((handler, timeout) => {
				if (timeout === 3000) pollLogin = handler;
				return 1 as unknown as ReturnType<typeof window.setInterval>;
			});
		vi.mocked(openExternalUrl).mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					finishOpeningLoginPage = resolve;
				}),
		);
		mockLibTVSettings();
		vi.mocked(beginProviderLogin).mockResolvedValue(
			libTVLoginResponse({
				status: "pending",
				verificationUri: "https://lib.tv/device",
				userCode: "LIB-TV",
			}),
		);
		renderSettings();

		fireEvent.click(
			await within(await screen.findByTestId("provider-card-libtv")).findByRole("button", {
				name: "登录",
			}),
		);

		expect(await screen.findByText("等待浏览器授权")).toBeInTheDocument();
		expect(swrMocks.mutate).not.toHaveBeenCalled();
		// 全量并发下轮询 effect 注册可能延后，给足等待时间而非依赖默认 1s。
		await waitFor(() => expect(pollLogin).toBeTypeOf("function"), { timeout: 4000 });

		vi.mocked(getAPIKeys).mockResolvedValue(
			apiKeysResponse({ includeExtraCLI: true, libtvConfigured: true }),
		);
		await act(async () => {
			if (typeof pollLogin === "function") pollLogin();
		});

		await waitFor(() => expect(getAPIKeys).toHaveBeenCalledTimes(2), { timeout: 4000 });
		expect(screen.getByText("等待浏览器授权")).toBeInTheDocument();
		expect(swrMocks.mutate).not.toHaveBeenCalled();
		await act(async () => {
			finishOpeningLoginPage?.();
		});
		await waitFor(() => expect(screen.queryByText("等待浏览器授权")).not.toBeInTheDocument());
		expectModelDependentCachesRevalidated();
		setIntervalSpy.mockRestore();
	});
});

describe("Settings Codex skills page", () => {
	afterEach(() => {
		cleanup();
	});

	it.each(["codex", "opencode"])(
		"keeps the Codex skills tab valid when the active backend is %s",
		(activeBackendID) => {
			useSettingsNavigationStore.setState({ activeTab: "codex-skills" });

			render(
				<MemoryRouter>
					<SWRConfig
						value={{
							fallback: {
								[agentBackendsKey]: {
									activeId: activeBackendID,
									backends: [],
								},
							},
							provider: () => new Map(),
							revalidateOnMount: false,
						}}
					>
						<Settings />
					</SWRConfig>
				</MemoryRouter>,
			);

			expect(screen.getByRole("heading", { name: "Codex 全局技能" })).toBeInTheDocument();
		},
	);
});

describe("Settings local account page", () => {
	afterEach(cleanup);

	it("keeps commercial actions unavailable and opens actual local billing", async () => {
		useSettingsNavigationStore.setState({ activeTab: "account" });
		renderSettings();
		expect(screen.getByText("本地用户 · 未登录")).toBeInTheDocument();
		for (const name of ["登录", "刷新", "充值积分", "开通会员"]) {
			expect(screen.getByRole("button", { name })).toBeDisabled();
		}
		fireEvent.click(screen.getByRole("button", { name: "查看用量" }));
		expect(useSettingsNavigationStore.getState().activeTab).toBe("billing");
		expect(await screen.findByRole("heading", { name: "用量与账单" })).toBeInTheDocument();
	});
});

const renderSettings = () =>
	render(
		<MemoryRouter>
			<SWRConfig value={{ provider: () => new Map() }}>
				<Settings />
				<ConfirmDialog />
			</SWRConfig>
		</MemoryRouter>,
	);

const apiKeysResponse = ({
	includeExtraCLI = false,
	libtvConfigured = false,
	mediagoConfigured = false,
	openrouterConfigured = false,
}: {
	includeExtraCLI?: boolean;
	libtvConfigured?: boolean;
	mediagoConfigured?: boolean;
	openrouterConfigured?: boolean;
}): APIKeyListResponse => ({
	providers: [
		{
			id: "mediago",
			label: "MediaGo聚合平台",
			description: "统一聚合平台",
			configured: mediagoConfigured,
			source: mediagoConfigured ? "settings" : "none",
			masked: mediagoConfigured ? "sk••••3456" : undefined,
			credentialKind: "apiKey",
			capabilities: ["text", "image", "video"],
		},
		{
			id: "openrouter",
			label: "OpenRouter",
			description: "自定义兼容接口",
			configured: openrouterConfigured,
			source: openrouterConfigured ? "settings" : "none",
			masked: openrouterConfigured ? "sk••••7890" : undefined,
			credentialKind: "apiKey",
			capabilities: ["text"],
		},
		{
			id: "jimeng",
			label: "即梦",
			description: "即梦 CLI 接入",
			configured: false,
			source: "none",
			credentialKind: "oauth",
			capabilities: ["image"],
		},
		...(includeExtraCLI
			? [
					{
						id: "libtv",
						label: "LibTV",
						description: "LibTV CLI 接入",
						configured: libtvConfigured,
						source: libtvConfigured ? ("settings" as const) : ("none" as const),
						credentialKind: "oauth",
						capabilities: ["image"],
					},
					{
						id: "xiaoyunque",
						label: "小云雀",
						description: "小云雀 CLI 接入",
						configured: false,
						source: "none" as const,
						credentialKind: "apiKey",
						credentialLabel: "小云雀 Access Key",
						help: "已有小云雀 Access Key？可通过本地 Pippit CLI 接入。",
						placeholder: "输入 XYQ_ACCESS_KEY",
						capabilities: ["image", "video"],
					},
				]
			: []),
		{
			id: "volcengine",
			label: "火山引擎",
			description: "官方供应商",
			configured: false,
			source: "none",
			credentialKind: "apiKey",
			capabilities: ["image"],
		},
	],
});

const modelPlatformsResponse = ({
	cliProviderIDs = ["jimeng"],
	mediagoModels = ["MiniMax M3", "GLM 4.7", "Qwen3.5"],
}: {
	cliProviderIDs?: string[];
	mediagoModels?: string[];
} = {}): ModelPlatformsResponse => ({
	platforms: [
		{
			id: "mediago",
			label: "MediaGo聚合平台",
			kind: "unified",
			description: "统一聚合平台",
			apiKeyProviderId: "mediago",
			modelGroups: [
				{
					label: "文本模型",
					models: mediagoModels,
				},
			],
		},
		{
			id: "openrouter",
			label: "OpenRouter",
			kind: "custom",
			description: "自定义兼容接口",
			apiKeyProviderId: "openrouter",
		},
		...cliProviderIDs.map((providerID) => ({
			id: providerID,
			label: cliPlatformLabel(providerID),
			kind: "cli" as const,
			description: `${cliPlatformLabel(providerID)} CLI 接入`,
			apiKeyProviderId: providerID,
		})),
	],
});

const cliPlatformLabel = (providerID: string) => {
	switch (providerID) {
		case "libtv":
			return "LibTV";
		case "xiaoyunque":
			return "小云雀";
		default:
			return "即梦";
	}
};

const mockLibTVSettings = () => {
	vi.mocked(getAPIKeys).mockResolvedValue(apiKeysResponse({ includeExtraCLI: true }));
	vi.mocked(getModelPlatforms).mockResolvedValue(
		modelPlatformsResponse({ cliProviderIDs: ["libtv"] }),
	);
};

const libTVLoginResponse = (login: APIKeyLoginChallenge, configured = false) => ({
	...apiKeysResponse({ includeExtraCLI: true, libtvConfigured: configured }),
	login,
});

const expectModelDependentCachesRevalidated = () => {
	expect(swrMocks.mutate).toHaveBeenCalledTimes(2);
	expect(swrMocks.mutate).toHaveBeenCalledWith(generationModelsKey, undefined, {
		revalidate: true,
	});
	expect(swrMocks.mutate).toHaveBeenCalledWith(isAgentRuntimeConfigKey, undefined, {
		revalidate: true,
	});
};
