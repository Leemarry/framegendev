import { describe, expect, it } from "vitest";
import type {
	APIKeyListResponse,
	APIKeyProvider,
	ModelPlatform,
	ModelPlatformsResponse,
} from "@/domains/settings/api/settings";
import { groupModelAccessProviders, providerIconFor } from "./model-access-providers";

const provider = (
	overrides: Partial<APIKeyProvider> & Pick<APIKeyProvider, "id" | "label">,
): APIKeyProvider => ({
	description: "",
	configured: false,
	source: "none",
	...overrides,
});

const allProviders = (): APIKeyListResponse["providers"] => [
	provider({ id: "mediago", label: "MediaGo聚合平台", credentialKind: "apiKey" }),
	provider({ id: "openrouter", label: "OpenRouter", credentialKind: "apiKey" }),
	provider({ id: "dmx", label: "DMXAPI", credentialKind: "apiKey" }),
	provider({ id: "jimeng", label: "即梦", credentialKind: "oauth" }),
	provider({ id: "libtv", label: "LibTV", credentialKind: "oauth" }),
	provider({ id: "xiaoyunque", label: "小云雀", credentialKind: "apiKey" }),
	provider({ id: "volcengine", label: "火山引擎", credentialKind: "apiKey" }),
	provider({ id: "openai", label: "OpenAI", credentialKind: "apiKey" }),
	provider({ id: "google", label: "Google Gemini", credentialKind: "apiKey" }),
	provider({ id: "deepseek", label: "DeepSeek", credentialKind: "apiKey" }),
	provider({ id: "aliyun", label: "阿里云百炼", credentialKind: "apiKey" }),
	provider({ id: "minimax", label: "MiniMax 国内", credentialKind: "apiKey" }),
];

const platform = (
	id: string,
	kind: ModelPlatform["kind"],
	label: string,
	extra?: Partial<ModelPlatform>,
): ModelPlatform => ({
	id,
	label,
	kind,
	description: `${label} 平台`,
	apiKeyProviderId: id,
	...extra,
});

const platforms = (): ModelPlatformsResponse["platforms"] => [
	platform("mediago", "unified", "MediaGo聚合平台", {
		modelGroups: [{ label: "文本模型", models: ["GPT Image 2"] }],
	}),
	platform("openrouter", "custom", "OpenRouter"),
	platform("dmx", "custom", "DMXAPI"),
	platform("jimeng", "cli", "即梦"),
	platform("libtv", "cli", "LibTV"),
	platform("xiaoyunque", "cli", "小云雀"),
];

describe("groupModelAccessProviders", () => {
	it("splits providers into CLI, official and aggregator groups in official order", () => {
		const groups = groupModelAccessProviders(allProviders(), platforms(), {
			customProvidersEnabled: true,
		});

		expect(groups.cli.map((item) => item.id)).toEqual(["jimeng", "libtv", "xiaoyunque"]);
		expect(groups.official.map((item) => item.id)).toEqual([
			"volcengine",
			"openai",
			"google",
			"deepseek",
			"aliyun",
			"minimax",
		]);
		// MediaGo is pulled out as a dedicated card; the remaining aggregators form the grid.
		expect(groups.aggregator.map((item) => item.id)).toEqual(["openrouter", "dmx"]);
	});

	it("keeps MediaGo as a dedicated card with its model groups", () => {
		const groups = groupModelAccessProviders(allProviders(), platforms(), {
			customProvidersEnabled: true,
		});
		expect(groups.mediago?.id).toBe("mediago");
		expect(groups.mediagoModelGroups.flatMap((group) => group.models)).toContain("GPT Image 2");
		// MediaGo must not be duplicated inside the generic aggregator grid.
		expect(groups.aggregator.map((item) => item.id)).not.toContain("mediago");
	});

	it("falls back to known CLI providers when platforms are unavailable", () => {
		const groups = groupModelAccessProviders(allProviders(), [], {
			customProvidersEnabled: true,
		});
		expect(groups.cli.map((item) => item.id)).toEqual(["jimeng", "libtv", "xiaoyunque"]);
		// The 0.1.17 surface remains visible when an older backend omits platform metadata.
		expect(groups.official.map((item) => item.id)).toEqual([
			"volcengine",
			"openai",
			"google",
			"deepseek",
			"aliyun",
			"minimax",
		]);
		expect(groups.aggregator.map((item) => item.id)).toEqual(["openrouter", "dmx"]);
		expect(groups.mediago?.id).toBe("mediago");
	});

	it("hides custom aggregation providers when the build flag disables them", () => {
		const groups = groupModelAccessProviders(allProviders(), platforms(), {
			customProvidersEnabled: false,
		});
		expect(groups.aggregator.map((item) => item.id)).not.toContain("openrouter");
		expect(groups.aggregator.map((item) => item.id)).not.toContain("dmx");
	});

	it("never invents a Kling provider", () => {
		const groups = groupModelAccessProviders(allProviders(), platforms(), {
			customProvidersEnabled: true,
		});
		const all = [...groups.cli, ...groups.official, ...groups.aggregator];
		expect(all.some((item) => item.id.includes("kling"))).toBe(false);
	});

	it("keeps the three CLI slots visible when optional CLI platforms are disabled", () => {
		const groups = groupModelAccessProviders(
			allProviders().filter((item) => item.id === "jimeng"),
			[platform("jimeng", "cli", "即梦")],
			{ customProvidersEnabled: true },
		);

		expect(groups.cli.map((item) => item.id)).toEqual(["jimeng", "libtv", "xiaoyunque"]);
		expect(groups.cli.find((item) => item.id === "jimeng")?.status).not.toBe("unavailable");
		expect(
			groups.cli
				.filter((item) => item.id !== "jimeng")
				.every((item) => item.status === "unavailable"),
		).toBe(true);
		expect(groups.official.every((item) => item.status === "unavailable")).toBe(true);
	});

	it("returns an icon for every built-in provider and a fallback for unknown ones", () => {
		for (const id of [
			"jimeng",
			"volcengine",
			"openai",
			"google",
			"deepseek",
			"aliyun",
			"minimax",
			"mediago",
		]) {
			expect(providerIconFor(id)).toBeTruthy();
		}
		expect(providerIconFor("some-new-provider")).toBeTruthy();
	});
});

it("keeps dynamic custom providers out of built-in official and aggregator cards", () => {
	const groups = groupModelAccessProviders(
		[...allProviders(), provider({ id: "custom-demo", label: "Dynamic" })],
		platforms(),
		{ customProvidersEnabled: true },
	);
	expect(
		[...groups.official, ...groups.aggregator, ...groups.cli].some(
			(item) => item.id === "custom-demo",
		),
	).toBe(false);
});
