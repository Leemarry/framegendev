import http from "@/shared/lib/http";

export type CustomProtocol =
	| "openai-completions"
	| "openai-responses"
	| "anthropic-messages"
	| "openai-images";
export interface CustomModel {
	id: string;
	name: string;
	kind: "text" | "image";
	protocol: CustomProtocol;
	streaming: boolean;
	tools: boolean;
	vision: boolean;
	contextWindow?: number;
	maxOutputTokens?: number;
	generation: boolean;
	editing: boolean;
	maxReferenceImages?: number;
	sizes?: string[];
	qualities?: string[];
	outputFormats?: string[];
}
export interface CustomProviderDefinition {
	schemaVersion: 1;
	id: string;
	name: string;
	baseURL: string;
	enabled: boolean;
	models: CustomModel[];
}
export interface CustomTestResult {
	modelId: string;
	protocol: CustomProtocol;
	operation: string;
	passed: boolean;
	message: string;
	testedAt: string;
}
export interface CustomProvider {
	definition: CustomProviderDefinition;
	revision: string;
	configured: boolean;
	masked?: string;
	tests: CustomTestResult[];
}
export interface CustomMutation {
	definition: CustomProviderDefinition;
	revision?: string;
	apiKey?: string;
}
export const customProvidersKey = "/settings/custom-providers";
export const getCustomProviders = async () =>
	(await http.get<{ providers: CustomProvider[] }>(customProvidersKey)).data;
export const saveCustomProvider = async (input: CustomMutation, id?: string) =>
	(id
		? await http.put<CustomProvider>(`${customProvidersKey}/${encodeURIComponent(id)}`, input)
		: await http.post<CustomProvider>(customProvidersKey, input)
	).data;
export const deleteCustomProvider = async (provider: CustomProvider) =>
	http.delete(`${customProvidersKey}/${encodeURIComponent(provider.definition.id)}`, {
		params: { revision: provider.revision },
	});
export const clearCustomProviderKey = async (provider: CustomProvider) =>
	http.delete(`${customProvidersKey}/${encodeURIComponent(provider.definition.id)}/api-key`, {
		params: { revision: provider.revision },
	});
export const validateCustomProvider = async (value: unknown) =>
	(await http.post<CustomProviderDefinition>(`${customProvidersKey}/validate`, value)).data;
export const discoverCustomModels = async (
	input: {
		baseURL: string;
		protocol: CustomProtocol;
		apiKey?: string;
		providerId?: string;
		revision?: string;
	},
	signal?: AbortSignal,
) =>
	(
		await http.post<{ models: { id: string; name: string }[] }>(
			`${customProvidersKey}/discover-models`,
			input,
			{ timeout: 35000, signal },
		)
	).data;
export const testCustomProvider = async (
	provider: CustomProvider,
	input: {
		modelId: string;
		protocol: CustomProtocol;
		operation: string;
		prompt: string;
		referenceURLs?: string[];
	},
	signal?: AbortSignal,
) =>
	(
		await http.post<CustomTestResult>(
			`${customProvidersKey}/${encodeURIComponent(provider.definition.id)}/test`,
			{ ...input, revision: provider.revision },
			{ timeout: 190000, signal },
		)
	).data;

export const customProviderError = (error: unknown) =>
	error && typeof error === "object" && "message" in error
		? String(error.message)
		: "操作失败，请重试";

export const emptyCustomModel = (protocol: CustomProtocol = "openai-completions"): CustomModel => ({
	id: "",
	name: "",
	kind: protocol === "openai-images" ? "image" : "text",
	protocol,
	streaming: false,
	tools: false,
	vision: false,
	generation: protocol === "openai-images",
	editing: false,
});
