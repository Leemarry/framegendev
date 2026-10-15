import {
	Blocks,
	Box,
	ChartNoAxesCombined,
	Cloud,
	Download,
	FolderOpen,
	Globe,
	HardDrive,
	Keyboard,
	KeyRound,
	Network,
	PackageOpen,
	SlidersHorizontal,
	Sparkles,
	UserRound,
	Video,
} from "lucide-react";

export const pendingSettingsPages = {
	browser: {
		title: "浏览器设置",
		status: "待开发",
		task: "TASK-090",
		description: "内置浏览器与搜索引擎配置尚未连接桌面服务。现有授权链接继续由系统浏览器打开。",
	},
	"comfyui-local": {
		title: "本地 ComfyUI",
		status: "待开发",
		task: "TASK-120",
		description: "尚未接入本地 ComfyUI 安装检测、启动及工作流执行协议。",
	},
	"comfyui-cloud": {
		title: "云端 ComfyUI",
		status: "待接入",
		task: "TASK-120",
		description: "云端实例与工作流服务尚未接入，当前无法查询、创建或启动云端实例。",
	},
	"mg-animation": {
		title: "MG 动画",
		status: "待开发",
		task: "TASK-120",
		description: "MG 动画运行时的安装、任务执行与进度协议尚未接入。",
	},
	installation: {
		title: "安装设置",
		status: "待开发",
		task: "TASK-120",
		description: "生成引擎的安装目录与安装管理尚未实现。不会自动下载或安装运行时。",
	},
	"model-access": {
		title: "模型接入",
		status: "待评审",
		task: "TASK-010",
		description: "模型接入整合方案仍待评审，已有 API 密钥与 Codex 接入可继续使用。",
	},
	extensions: {
		title: "Agent 扩展",
		status: "待开发",
		task: "TASK-110",
		description: "扩展安装与诊断协议尚待实现。已有 Codex 技能和智能体指令可继续管理。",
	},
	"feishu-agent": {
		title: "飞书 Agent",
		status: "待接入",
		task: "TASK-110",
		description: "飞书连接、凭据验证和消息服务尚未接入。当前不会向外部发送消息。",
	},
	"drami-motion": {
		title: "Drami 动效",
		status: "待开发",
		task: "TASK-130",
		description: "全局 Drami 助手与动效控制尚未实现。项目内已有 Agent 会话保持原有工作流。",
	},
} as const;

export type PendingSettingsTab = keyof typeof pendingSettingsPages;

export const isPendingSettingsTab = (value: string): value is PendingSettingsTab =>
	Object.hasOwn(pendingSettingsPages, value);

export const officialSettingsGroups = [
	{
		label: "工作区",
		items: [
			{ value: "account", label: "账户", icon: UserRound },
			{ value: "billing", label: "用量分析", icon: ChartNoAxesCombined },
			{ value: "appearance", label: "基础设置", icon: SlidersHorizontal },
			{ value: "browser", label: "浏览器设置", icon: Globe },
			{ value: "storage", label: "存储管理", icon: FolderOpen },
			{ value: "shortcuts", label: "快捷键", icon: Keyboard },
			{ value: "updates", label: "应用更新", icon: Download },
		],
	},
	{
		label: "生成服务",
		items: [
			{ value: "comfyui-local", label: "本地 ComfyUI", icon: Box },
			{ value: "comfyui-cloud", label: "云端 ComfyUI", icon: Cloud },
			{ value: "mg-animation", label: "MG 动画", icon: Video },
			{ value: "installation", label: "安装设置", icon: HardDrive },
		],
	},
	{
		label: "生成配置",
		items: [
			{ value: "model-access", label: "模型接入", icon: KeyRound },
			{ value: "extensions", label: "Agent 扩展", icon: Blocks },
			{ value: "feishu-agent", label: "飞书 Agent", icon: Globe },
			{ value: "prompt-packs", label: "技能包", icon: PackageOpen },
			{ value: "drami-motion", label: "Drami 动效", icon: Sparkles },
		],
	},
];

export const existingModelSettingsLinks = [
	{ value: "api-keys", label: "API 密钥", icon: KeyRound },
	{ value: "codex-access", label: "Codex 接入", icon: Network },
];

export const existingExtensionSettingsLinks = [
	{ value: "codex-skills", label: "Codex 技能", icon: Blocks },
	{ value: "prompt-packs", label: "技能包管理", icon: PackageOpen },
	{ value: "instructions", label: "智能体指令", icon: SlidersHorizontal },
];
