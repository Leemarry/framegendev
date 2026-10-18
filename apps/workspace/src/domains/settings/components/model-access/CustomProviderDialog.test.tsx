import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CustomProviderDialog } from "./CustomProviderDialog";
import {
	customProvidersKey,
	emptyCustomModel,
	type CustomProvider,
} from "../../api/custom-providers";
import { SWRConfig } from "swr";
import { CustomProvidersSection } from "./CustomProvidersSection";

const mocks = vi.hoisted(() => ({
	save: vi.fn(),
	validate: vi.fn(),
	discover: vi.fn(),
	confirm: vi.fn(),
	clear: vi.fn(),
	remove: vi.fn(),
	list: vi.fn(),
	test: vi.fn(),
}));
vi.mock("../../api/custom-providers", async (original) => ({
	...(await original<typeof import("../../api/custom-providers")>()),
	saveCustomProvider: mocks.save,
	validateCustomProvider: mocks.validate,
	discoverCustomModels: mocks.discover,
	clearCustomProviderKey: mocks.clear,
	deleteCustomProvider: mocks.remove,
	getCustomProviders: mocks.list,
	testCustomProvider: mocks.test,
}));
vi.mock("@/shared/components/callable/ConfirmDialog", () => ({ confirmDialog: mocks.confirm }));
vi.mock("@/hooks/useToast", () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));

const provider: CustomProvider = {
	definition: {
		schemaVersion: 1,
		id: "demo",
		name: "Demo",
		baseURL: "https://example.com/v1",
		enabled: true,
		models: [{ ...emptyCustomModel(), id: "model-1", name: "First model" }],
	},
	revision: "rev-1",
	configured: true,
	masked: "••••••••",
	tests: [],
};

describe("custom provider configuration", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.list.mockResolvedValue({ providers: [provider] });
	});
	afterEach(cleanup);
	it("requires adding discovered models and saves no placeholder row", async () => {
		mocks.discover.mockResolvedValue({
			models: [{ id: "cvk-原生满血-480", name: "cvk-原生满血-480" }],
		});
		mocks.save.mockResolvedValue(provider);
		render(<CustomProviderDialog existing={[]} onClose={vi.fn()} onSaved={vi.fn()} />);
		fireEvent.change(screen.getByLabelText("供应商名称"), { target: { value: "Example" } });
		fireEvent.change(screen.getByLabelText("供应商 ID"), { target: { value: "example" } });
		fireEvent.change(screen.getByLabelText("API Base URL"), {
			target: { value: "https://example.com/v1" },
		});
		expect(screen.queryByLabelText("模型 ID")).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "保存配置" })).toBeDisabled();
		fireEvent.click(screen.getByRole("button", { name: "获取模型列表" }));
		const option = await screen.findByLabelText("cvk-原生满血-480");
		expect(screen.getByRole("status")).toHaveTextContent("已添加 0 个模型");
		fireEvent.click(option);
		fireEvent.click(screen.getByRole("button", { name: "添加所选模型" }));
		expect(screen.getAllByLabelText("模型 ID")).toHaveLength(1);
		expect(screen.getByLabelText("模型 ID")).toHaveValue("cvk-原生满血-480");
		expect(screen.getByRole("status")).toHaveTextContent("已添加 1 个模型");
		fireEvent.click(screen.getByRole("button", { name: "保存配置" }));
		await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
		expect(mocks.save.mock.calls[0][0].definition.models).toEqual([
			expect.objectContaining({ id: "cvk-原生满血-480", tools: false, vision: false }),
		]);
	});
	it("blocks saving selections that have not been added", async () => {
		mocks.discover.mockResolvedValue({ models: [{ id: "model-2", name: "Second model" }] });
		render(
			<CustomProviderDialog
				provider={provider}
				existing={[provider]}
				onClose={vi.fn()}
				onSaved={vi.fn()}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "获取模型列表" }));
		fireEvent.click(await screen.findByLabelText("Second model"));
		fireEvent.click(screen.getByRole("button", { name: "保存配置" }));
		expect(await screen.findByRole("alert")).toHaveTextContent("还有勾选的模型未添加");
		expect(mocks.save).not.toHaveBeenCalled();
	});
	it("preserves unfinished manual models and focuses the invalid ID before any save", async () => {
		mocks.discover.mockResolvedValue({ models: [{ id: "model-2", name: "Second model" }] });
		render(
			<CustomProviderDialog
				provider={provider}
				existing={[provider]}
				onClose={vi.fn()}
				onSaved={vi.fn()}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "手动添加模型" }));
		fireEvent.change(screen.getAllByLabelText("显示名称")[1], {
			target: { value: "Work in progress" },
		});
		fireEvent.click(screen.getByRole("button", { name: "获取模型列表" }));
		fireEvent.click(await screen.findByLabelText("Second model"));
		fireEvent.click(screen.getByRole("button", { name: "添加所选模型" }));
		fireEvent.click(screen.getByRole("button", { name: "保存配置" }));
		expect(await screen.findByRole("alert")).toHaveTextContent("模型 2 的模型 ID 无效");
		expect(screen.getAllByLabelText("模型 ID")[1]).toHaveFocus();
		expect(screen.getAllByLabelText("显示名称")[1]).toHaveValue("Work in progress");
		expect(mocks.save).not.toHaveBeenCalled();
	});
	it("preserves input and reports backend errors; successful save refreshes models", async () => {
		const saved = vi.fn().mockResolvedValue(undefined);
		const close = vi.fn();
		mocks.save
			.mockRejectedValueOnce({ message: "配置已变更，请刷新后重试" })
			.mockResolvedValueOnce(provider);
		render(
			<CustomProviderDialog
				provider={provider}
				existing={[provider]}
				onClose={close}
				onSaved={saved}
			/>,
		);
		fireEvent.change(screen.getByLabelText("供应商名称"), { target: { value: "Edited" } });
		fireEvent.change(screen.getByLabelText("替换 API Key（留空保留已保存密钥）"), {
			target: { value: "new-key" },
		});
		fireEvent.click(screen.getByRole("button", { name: "保存配置" }));
		expect(await screen.findByRole("alert")).toHaveTextContent("配置已变更");
		expect(screen.getByLabelText("供应商名称")).toHaveValue("Edited");
		expect(screen.getByLabelText("替换 API Key（留空保留已保存密钥）")).toHaveValue("new-key");
		expect(close).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "保存配置" }));
		await waitFor(() => expect(saved).toHaveBeenCalledOnce());
		expect(mocks.save).toHaveBeenLastCalledWith(
			expect.objectContaining({
				revision: "rev-1",
				apiKey: "new-key",
				definition: expect.objectContaining({ name: "Edited" }),
			}),
			"demo",
		);
		expect(close).toHaveBeenCalledOnce();
	});
	it("imports duplicate IDs only after explicit update confirmation and preserves the key", async () => {
		mocks.validate.mockResolvedValue({ ...provider.definition, name: "Imported" });
		mocks.confirm.mockResolvedValue(true);
		mocks.save.mockResolvedValue(provider);
		render(
			<CustomProviderDialog
				existing={[provider]}
				onClose={vi.fn()}
				onSaved={vi.fn().mockResolvedValue(undefined)}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "导入配置" }));
		fireEvent.change(screen.getByLabelText("配置 JSON"), {
			target: { value: JSON.stringify(provider.definition) },
		});
		fireEvent.click(screen.getByRole("button", { name: "校验并载入表单" }));
		await waitFor(() => expect(screen.getByLabelText("供应商名称")).toHaveValue("Imported"));
		expect(mocks.confirm).toHaveBeenCalledOnce();
		expect(mocks.save).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "保存配置" }));
		await waitFor(() =>
			expect(mocks.save).toHaveBeenCalledWith(
				expect.objectContaining({ revision: "rev-1", apiKey: undefined }),
				"demo",
			),
		);
	});
	it("allows manual models after discovery failure without inventing capabilities", async () => {
		mocks.discover.mockRejectedValue({ message: "模型列表接口不支持" });
		render(
			<CustomProviderDialog
				provider={provider}
				existing={[provider]}
				onClose={vi.fn()}
				onSaved={vi.fn()}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "获取模型列表" }));
		expect(await screen.findByRole("alert")).toHaveTextContent("模型列表接口不支持");
		fireEvent.click(screen.getByRole("button", { name: "手动添加模型" }));
		expect(screen.getAllByLabelText("模型 ID")).toHaveLength(2);
		for (const flag of screen.getAllByLabelText("工具调用")) expect(flag).not.toBeChecked();
	});
	it("aborts model discovery when the dialog unmounts", async () => {
		mocks.discover.mockImplementation(() => new Promise(() => {}));
		const view = render(
			<CustomProviderDialog
				provider={provider}
				existing={[provider]}
				onClose={vi.fn()}
				onSaved={vi.fn()}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "获取模型列表" }));
		await waitFor(() => expect(mocks.discover).toHaveBeenCalled());
		const signal = mocks.discover.mock.calls[0][1] as AbortSignal;
		view.unmount();
		expect(signal.aborted).toBe(true);
	});
	it("renders a real add entry and keeps configuration separate from verification", async () => {
		render(
			<SWRConfig
				value={{
					provider: () => new Map(),
					fallback: { [customProvidersKey]: { providers: [provider] } },
				}}
			>
				<CustomProvidersSection>
					<div>Built-in platform</div>
				</CustomProvidersSection>
			</SWRConfig>,
		);
		expect(screen.getByText("配置完整")).toBeInTheDocument();
		expect(screen.getByText("未测试")).toBeInTheDocument();
		expect(screen.queryByText("测试通过")).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "添加自定义供应商" }));
		expect(await screen.findByRole("dialog")).toBeInTheDocument();
		expect(mocks.test).not.toHaveBeenCalled();
	});
});
