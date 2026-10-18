import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PropsWithChildren } from "react";
import {
	type APIKeyProvider,
	beginProviderLogin,
	completeProviderLogin,
	getAPIKeys,
	getGenerationProviders,
	getModelPlatforms,
} from "@/domains/settings/api/settings";
import { useProviderCredentials } from "./useProviderCredentials";

vi.mock("@/domains/settings/api/settings", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/domains/settings/api/settings")>()),
	beginProviderLogin: vi.fn(),
	completeProviderLogin: vi.fn(),
	getAPIKeys: vi.fn(),
	getGenerationProviders: vi.fn(),
	getModelPlatforms: vi.fn(),
}));
const toast = vi.hoisted(() => ({ info: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock("@/hooks/useToast", () => ({ useToast: () => toast }));
vi.mock("@/shared/desktop/actions", () => ({
	openExternalUrl: vi.fn().mockResolvedValue(undefined),
}));

describe("provider authorization", () => {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
		vi.clearAllMocks();
	});
	it.each(["pending", "expired", "denied", "completed"])(
		"handles Jimeng %s without reporting false success",
		async (status) => {
			const provider: APIKeyProvider = {
				id: "jimeng",
				label: "即梦",
				description: "",
				configured: false,
				source: "none",
				credentialKind: "oauth",
			};
			const initial = { providers: [provider] };
			vi.mocked(getAPIKeys).mockResolvedValue(initial);
			vi.mocked(getGenerationProviders).mockResolvedValue({ providers: [], platforms: [] });
			vi.mocked(getModelPlatforms).mockResolvedValue({ platforms: [] });
			vi.mocked(beginProviderLogin).mockResolvedValue({
				...initial,
				login: {
					status: "pending",
					deviceCode: "private-code",
					verificationUri: "https://example.test/login",
				},
			});
			vi.mocked(completeProviderLogin).mockResolvedValue({
				providers: [{ ...provider, configured: status === "completed" }],
				login: { status, message: "明确的授权结果" },
			});
			const cache = new Map();
			const wrapper = ({ children }: PropsWithChildren) => (
				<SWRConfig value={{ provider: () => cache, dedupingInterval: 0 }}>{children}</SWRConfig>
			);
			const { result } = renderHook(useProviderCredentials, { wrapper });
			await waitFor(() => expect(result.current.isLoading).toBe(false));
			await act(async () => {
				await result.current.login(provider);
			});
			await act(async () => {
				await result.current.completeLogin(provider);
			});
			expect(Boolean(result.current.loginChallenges.jimeng)).toBe(status === "pending");
			expect(toast.success).toHaveBeenCalledTimes(status === "completed" ? 1 : 0);
			if (status === "expired")
				expect(toast.error).toHaveBeenCalledWith("授权已过期", { description: "明确的授权结果" });
		},
	);
	it("clears a failed browser challenge, reports the failure and stops polling", async () => {
		const provider: APIKeyProvider = {
			id: "libtv",
			label: "LibTV",
			description: "",
			configured: false,
			source: "none",
			credentialKind: "oauth",
		};
		const initial = { providers: [provider] };
		vi.mocked(getAPIKeys).mockResolvedValue(initial);
		vi.mocked(getGenerationProviders).mockResolvedValue({ providers: [], platforms: [] });
		vi.mocked(getModelPlatforms).mockResolvedValue({ platforms: [] });
		vi.mocked(beginProviderLogin).mockResolvedValue({
			...initial,
			login: { status: "pending", verificationUri: "https://example.test/login" },
		});
		const clearInterval = vi.spyOn(window, "clearInterval");
		const cache = new Map();
		const wrapper = ({ children }: PropsWithChildren) => (
			<SWRConfig value={{ provider: () => cache, dedupingInterval: 0 }}>{children}</SWRConfig>
		);
		const { result } = renderHook(useProviderCredentials, { wrapper });
		await waitFor(() => expect(result.current.isLoading).toBe(false));
		await act(async () => {
			await result.current.login(provider);
		});
		expect(result.current.loginChallenges.libtv.status).toBe("pending");
		vi.mocked(getAPIKeys).mockResolvedValue({
			providers: [{ ...provider, status: "loginFailed", help: "凭据保存失败" }],
		});
		await act(async () => {
			await result.current.completeLogin(provider);
		});
		await waitFor(() => expect(result.current.loginChallenges.libtv).toBeUndefined());
		expect(toast.error).toHaveBeenCalledWith("LibTV登录失败", { description: "凭据保存失败" });
		expect(clearInterval).toHaveBeenCalled();
		expect(toast.success).not.toHaveBeenCalled();
	});
});
