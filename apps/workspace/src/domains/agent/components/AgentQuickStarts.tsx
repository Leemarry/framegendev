import { CircleHelp, Clapperboard, FileCog, FilePenLine, Lightbulb, Workflow } from "lucide-react";
import { useAgentStore } from "@/domains/agent/stores";
import { DramiMascot } from "./DramiMascot";

const cards = [
	{
		key: "script",
		icon: FilePenLine,
		description: "梳理题材、角色与节奏，搭好可直接制作的剧本",
		prompt:
			"我想快速创建一份适合漫剧制作的剧本。请先用简短问题和我确认题材、目标受众、故事基调、主要角色、单集时长和集数；信息足够后，帮我产出故事梗概、角色关系和可直接制作的分场剧本。",
		title: "从灵感开始写剧本",
	},
	{
		key: "storyboard",
		icon: Clapperboard,
		description: "按镜头整理画面、动作、运镜、台词与时长",
		prompt:
			"请把我的故事或剧本拆解成可直接用于漫剧制作的分镜脚本。先请我提供或引用原文，再按镜头整理景别、画面主体、人物动作、场景、运镜、光影、台词／旁白和建议时长，并保证角色与场景连续。",
		title: "把故事拆成分镜",
	},
	{
		key: "story",
		icon: Lightbulb,
		description: "从题材与情绪出发，找到有钩子、有反转的方向",
		prompt:
			"请和我一起构思一个适合漫剧改编的原创故事。先询问我偏好的题材、受众、篇幅和情绪基调；如果我没有想法，就主动给出 3 个差异明显的故事方向供我选择，每个方向包含一句话钩子、核心冲突、主要角色和关键反转。",
		title: "为我构思一个好故事",
	},
	{
		key: "help",
		icon: CircleHelp,
		description: "了解从故事、剧本到分镜与成片的完整创作流程",
		prompt:
			"请用简洁、面向新手的方式介绍你能在这个漫剧项目中帮我完成哪些工作。请按“故事构思—剧本改写—角色／场景／道具设定—分镜拆解—图片与视频生成”的流程说明，并给出 3 个我现在就能直接开始的示例任务。",
		title: "看看 Agent 能帮我什么",
	},
	{
		key: "question",
		icon: CircleHelp,
		description: "了解功能、概念、设置和工作方式",
		prompt:
			"我有一个关于 Drama 的问题。请先确认我具体想完成什么，再用简洁、可执行的步骤回答；如果答案依赖项目内容，请提醒我进入对应项目的 Agent。",
		title: "解答 Drama 使用问题",
	},
	{
		key: "skillPack",
		icon: FileCog,
		description: "统一创建或修改 Skill、提示词和工作流",
		prompt:
			"请帮我创建或修改技能包内容，范围包括 Skill、提示词和工作流。先确认操作是新建技能包、创建条目还是修改条目；涉及条目时，再确认类型是 skill、prompt 还是 flow。先用 list_prompt_packs 读取可编辑目标；修改现有条目时，请让我从输入框的“/”菜单选择目标，再用 get_prompt_pack 读取完整内容和 entryId。新建技能包时确认名称、用途、版本和作者。Skill 需确认目标、触发场景、输入、期望输出和约束，并生成完整 SKILL.md，其中 YAML frontmatter 的 name 使用小写 kebab-case、description 说明使用时机、title 使用中文名称；提示词需确认使用场景、输入变量、目标模型和期望输出，并整理提示词正文、name、slug、category 和可选 type；工作流需确认目标、输入、输出、关键步骤和约束，并生成完整 FlowDefinition JSON，其中 name 使用小写 kebab-case、schemaVersion 为 1，并包含 title、description、privateGraph（schemaVersion、nodes、edges）和 publicContract。信息完整后调用 apply_prompt_pack_change；等待我在页面确认，pending 时用完全相同的输入重试，只有 applied 或 replay 才表示保存成功，expired 表示本次确认已失效，需要重新发起。",
		title: "创建或修改技能包内容",
	},
	{
		key: "comfyui",
		icon: Workflow,
		description: "生成带 App Mode 输入输出的本地 ComfyUI 工作流",
		prompt:
			"请帮我创建一个可被 Drama 管理的 ComfyUI 工作流。先用 list_runtime_assets 检查现有工作流，再确认用途、图片或视频类型、模型与节点依赖、可编辑输入和输出节点。生成完整 ComfyUI workflow JSON，确保 nodes、links 引用一致，extra.mediago.kind 为 image 或 video，extra.linearData.inputs 和 outputs 可供 App Mode 发布。然后调用 apply_runtime_asset_change 的 create_comfyui_workflow；等待我在页面确认，pending 时用完全相同的输入重试，只有 applied 或 replay 才表示创建成功，expired 表示本次确认已失效，需要重新发起。",
		title: "创建 ComfyUI 工作流",
	},
	{
		key: "hyperframes",
		icon: Clapperboard,
		description: "从官方 Starter 创建并校验可复用的视频模板",
		prompt:
			"请帮我创建一个可复用的 HyperFrames 模板。先用 list_runtime_assets 检查现有模板，再确认画幅、时长、视觉方向、可配置内容以及使用 blank 还是 warm-grain Starter。生成完整文本文件集，仅使用 index.html、hyperframes.json、compositions/** 和 assets/**，不要创建 package.json、node_modules、隐藏目录或任意本地路径。然后调用 apply_runtime_asset_change 的 create_hyperframes_template；服务端会运行 HyperFrames 项目检查。等待我在页面确认，pending 时用完全相同的输入重试，只有 applied 或 replay 才表示创建成功，expired 表示本次确认已失效，需要重新发起。",
		title: "创建 HyperFrames 模板",
	},
];

export function AgentQuickStarts({ globalScope = false }: { globalScope?: boolean }) {
	const items = globalScope ? cards.slice(4) : cards.slice(0, 4);
	return (
		<section
			aria-label="Drami 起点"
			className="flex h-full min-h-0 items-center justify-center overflow-y-auto px-4 py-6"
		>
			<div className="my-auto w-full max-w-3xl">
				<div className="mb-5 text-center">
					<DramiMascot className="mx-auto mb-3 size-10" />
					<h2 className="text-base font-semibold text-foreground">
						{globalScope ? "Drami 可以帮你做什么？" : "今天想创作什么？"}
					</h2>
					<p className="mt-1.5 text-xs leading-5 text-muted-foreground">
						{globalScope
							? "这里不读取任何项目内容。选择一个起点，或直接输入你的问题。"
							: "选一个起点，我会把完整需求放进输入框，你可以修改后再发送。"}
					</p>
				</div>
				<div className="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-2">
					{items.map(({ key, icon: Icon, title, description, prompt }) => (
						<button
							key={key}
							type="button"
							className="flex min-h-28 cursor-pointer flex-col items-start rounded-lg border border-border bg-surface-interactive px-3.5 py-3 text-left text-foreground transition-colors hover:border-ring/50 hover:bg-surface-interactive-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							onClick={() => useAgentStore.getState().seedComposer({ text: prompt })}
						>
							<span className="mb-4 flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
								<Icon className="size-3.5" />
							</span>
							<span className="text-xs font-medium leading-5">{title}</span>
							<span className="mt-1 text-xs leading-4 text-muted-foreground">{description}</span>
						</button>
					))}
				</div>
			</div>
		</section>
	);
}
