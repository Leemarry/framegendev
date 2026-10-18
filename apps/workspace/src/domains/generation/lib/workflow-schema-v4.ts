// WorkflowGraph v4 - 兼容 Toonflow 端口类型系统

/**
 * 节点数据类型（端口类型）
 * 参考 Toonflow: packages/nodeScaffold/src/connection.ts
 */
export type NodeDataType =
	| "STRING"
	| "INT"
	| "FLOAT"
	| "BOOLEAN"
	| "IMAGE" // 图像
	| "MASK" // 蒙版
	| "VIDEO" // 视频
	| "AUDIO" // 音频
	| "TEXT" // 文本（长文本）
	| "MODEL" // AI 模型
	| "*"; // 通配符（兼容任意类型）

/**
 * 节点端口（输入/输出）
 */
export interface NodeHandle {
	id: string; // 端口唯一标识
	type: "source" | "target"; // source=输出端口, target=输入端口
	dataType: NodeDataType | NodeDataType[]; // 支持单类型或多类型
	label?: string; // 端口显示名称
	multiple?: boolean;
}

/**
 * 节点状态
 */
export type NodeStatus = "idle" | "generating" | "succeeded" | "failed";

/**
 * 工作流节点（v4）
 */
export interface WorkflowNode {
	id: string;
	type: string; // 节点类型：videoGeneration, imageInpaint, videoTrim 等
	position: { x: number; y: number };
	parentId?: string;
	width?: number;
	height?: number;
	data: {
		label: string; // 节点显示名称
		handles: NodeHandle[]; // 端口定义
		config?: {
			// 节点配置
			modelId?: string; // 模型 ID
			prompt?: string; // 提示词
			params?: Record<string, unknown>; // 其他参数
		};
		outputs?: {
			// 节点输出值（生成完成后填充）
			[handleId: string]: {
				dataType: NodeDataType;
				value: unknown; // assetId | url | text | number
			};
		};
		status?: NodeStatus; // 节点状态
		taskId?: string;
		generationStartedAt?: string;
		candidates?: Array<{ url: string; dataType: NodeDataType; assetId?: string }>;
		selectedCandidate?: number;
		error?: string; // 错误信息
	};
}

/**
 * 工作流边（连接）v4
 */
export interface WorkflowEdge {
	id: string;
	source: string; // 源节点 ID
	sourceHandle: string; // 源端口 ID
	target: string; // 目标节点 ID
	targetHandle: string; // 目标端口 ID
	dataType?: NodeDataType; // 运行时数据类型（连接建立时验证）
}

/**
 * 工作流画布（v4）
 */
export interface WorkflowGraph {
	schemaVersion: 4;
	nodes: WorkflowNode[];
	edges: WorkflowEdge[];
	viewport: { x: number; y: number; zoom: number };
}

/**
 * 工作流来源类型
 */
export type WorkflowSourceType = "private" | "public-ref" | "public-fork";

/**
 * 工作流实例（后端数据模型）
 */
export interface WorkflowInstance {
	id: string;
	shotId: string; // 所属分镜
	name: string; // 工作流名称
	sourceType: WorkflowSourceType; // 来源类型
	publicTemplateId?: string; // 引用的公共模板 ID
	graph: WorkflowGraph; // 画布数据
	status: "draft" | "generating" | "completed" | "failed";
	outputCandidates: Array<{ assetId: string; createdAt: string }>; // 候选输出列表
	assetScope: string; // 素材作用域：shots/<shotName>/workflows/<workflowId>
	createdAt: string;
	updatedAt: string;
}

/**
 * 创建空白画布
 */
export const emptyWorkflowGraphV4 = (): WorkflowGraph => ({
	schemaVersion: 4,
	nodes: [],
	edges: [],
	viewport: { x: 0, y: 0, zoom: 1 },
});

/**
 * 节点类型到默认端口的映射
 */
export const getDefaultHandles = (nodeType: string): NodeHandle[] => {
	switch (nodeType) {
		case "imageNode":
			return [{ id: "output", type: "source", dataType: "IMAGE", label: "图像" }];

		case "videoNode":
			return [{ id: "output", type: "source", dataType: "VIDEO", label: "视频" }];

		case "audioNode":
			return [{ id: "output", type: "source", dataType: "AUDIO", label: "音频" }];

		case "textNode":
			return [
				{
					id: "in",
					type: "target",
					dataType: ["TEXT", "STRING", "IMAGE", "VIDEO"],
					label: "文本、图片、视频输入",
					multiple: true,
				},
				{ id: "output", type: "source", dataType: "TEXT", label: "文本" },
			];

		case "videoGeneration":
			return [
				{
					id: "in",
					type: "target",
					dataType: ["IMAGE", "VIDEO", "AUDIO", "TEXT"],
					label: "图片、视频、音频、文本输入",
					multiple: true,
				},
				{ id: "output", type: "source", dataType: "VIDEO", label: "生成视频" },
			];

		case "imageGeneration":
			return [
				{
					id: "in",
					type: "target",
					dataType: ["IMAGE", "TEXT"],
					label: "图片、文本输入",
					multiple: true,
				},
				{ id: "image", type: "source", dataType: "IMAGE", label: "生成图像" },
			];

		case "audioGeneration":
			return [
				{
					id: "in",
					type: "target",
					dataType: ["IMAGE", "AUDIO", "TEXT"],
					label: "图片或音频限1个，文本不限",
					multiple: true,
				},
				{ id: "audio", type: "source", dataType: "AUDIO", label: "生成音频" },
			];

		case "imageInpaint":
			return [
				{ id: "image-input", type: "target", dataType: "IMAGE", label: "原图" },
				{ id: "mask-input", type: "target", dataType: "MASK", label: "蒙版" },
				{ id: "text-input", type: "target", dataType: "TEXT", label: "提示词" },
				{ id: "output", type: "source", dataType: "IMAGE", label: "重绘结果" },
			];

		case "videoTrim":
			return [
				{ id: "video-input", type: "target", dataType: "VIDEO", label: "原视频" },
				{ id: "output", type: "source", dataType: "VIDEO", label: "裁剪结果" },
			];

		case "videoExtractFrame":
			return [
				{ id: "video-input", type: "target", dataType: "VIDEO", label: "视频" },
				{ id: "output", type: "source", dataType: "IMAGE", label: "截图" },
			];

		case "videoExtractAudio":
			return [
				{ id: "video-input", type: "target", dataType: "VIDEO", label: "视频" },
				{ id: "output", type: "source", dataType: "AUDIO", label: "音频" },
			];

		default:
			return [];
	}
};
