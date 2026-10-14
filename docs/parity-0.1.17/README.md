# 官方 0.1.17 对齐项目

更新日期：2026-10-14。开发目录：`E:\AI\framegendev`。

用户要求：根据当前可维护源码开发，使界面、交互和功能与官方 0.1.17 一致，并持续记录需求、任务、决策和验证结果。

## 从这里续作

最新流程按 REQ-044 / DEC-029：单功能完整实现、自测功能与架构、更新记录并本地 Git 提交后，再推进下一项；高复用与技术/产品判断优先。对照 `E:/AI/MediaGo Drama`，本地个人用户非必需项保留【待开发】标识与原因。旧“不提交”仅为历史记录，不再作为现行限制；脚本自动提交仍关闭，会话审阅明确路径提交，不推送。历史累积改动检查点为 `216611e`。

素材续作最新：TASK-035目录API、TASK-036项目文件夹闭环与TASK-033全局范围整页已实际验收并无提交归档（Session16~18）。复用唯一素材workspace，完整前后端门/真实导入分类移动/深浅窄短屏/重启原数据核对通过；最新运行31430为task-033/bin、PID51648，配置/data仍task-001。TASK-030整体未完成，下一步核实TASK-034目录生命周期/扫描独立子项。后文旧PID与版本为历史记录，以CURRENT-HANDOFF最新检查点为准。

独立设计资料包已整理在`E:/AI/MediaGo Drama/漫剧自动化工作台-设计与开发资料/README.md`，集中八附件、两版设计、toonflow截图、源码依据、架构与候选路线，供跨会话迁移。用户明确新增能力是否开发未定；按DEC-027先保存参考，不把资料包变成实施授权。校验与来源在包内manifest/verification，原AI效果图仍待恢复。

本轮修订[自动化工作台v2设计](../superpowers/specs/2026-10-14-automation-workbench-design.md)：保留官方风格，沿现有能力扩展章节图文联动、角色模板、可编辑小数秒镜头列表；画布参考实际toonflowLocal大媒体节点。三张v2本地示意图与AI指南交付，指定imagegen502/402未产出AI图，TASK-170待验收。TASK-031已归档、TASK-032另会话已验收并转TASK-034核实；TASK-010待评审和三阶段排期不变。

新对话先读 [当前交接摘要](CURRENT-HANDOFF.md)，其中包含GAP-003与TASK-002/003最终验收、当前运行环境及待评审事项。

用户已持续授权自动接下一单项（DEC-023），无需逐项确认。TASK-031/032/033/035/036已完成，下一产品项先评估TASK-034剩余工作的本地必要性、真实依赖与目录生命周期契约；不要重做已完成的元数据/API。问题登记原因、证据及恢复条件后继续独立任务，TASK-010保持待评审。详见交接摘要与任务台账的调度规则。

1. 阅读 [需求与证据](REQUIREMENTS.md)、[任务台账](TASKS.md)、[决策记录](DECISIONS.md)。
2. 检查 Git 工作树，重新核对当前任务对应的代码和截图。行号是调研时位置，修改后需重新定位。
3. 从任务台账的当前任务继续，每次只推进有明确验收条件的模块。
4. 修改前更新状态；结束前写入验证证据、未完成事项和下一步。

已接入项目级 [Trellis 工作流](TRELLIS.md)，用于任务材料、规范和会话记录；产品范围仍以本目录台账为准。新增 `AGENTS.md` 指引位于项目根目录 `E:\AI\framegendev\AGENTS.md`。

首个页面模块设计：[模型接入整合页](../superpowers/specs/2026-10-14-model-access-design.md)。设计状态仍待评审；文档恢复阻塞修复 TASK-004 已修改产品源码并验收。

TASK-061已修改项目管理首屏：单标题、项目卡片、325px根侧栏、导航和空态；7文件51测试及lint/format/build通过，桌面/窄屏深浅主题和真实业务验收通过。截图在`.cache/parity/task-061`；其他页面仍需逐图对齐，导入/目录、Drami待接入。

## 资料与基线

TASK-021已按截图06实现根用户菜单：320×370px、35px行高、真实主题持久化、技能/设置入口。5文件33测试、lint/format/build与桌面/窄屏/短屏验收通过，见 [验收记录](../../.trellis/tasks/archive/2026-10/10-14-user-menu-parity/result.md)。商业服务/完整国际化待补，TASK-010仍待评审。

TASK-022已按01/02实现项目工作区壳与必要导航：325px侧栏、55px真实项目标题、四项项目设置、文档/Agent与设置往返、项目素材/历史入口和窄屏导航。12文件83测试及lint/format/build通过，专用中文保存刷新/切换/重开与原文档hash/version核对通过；见 [实际验收](../../.trellis/tasks/archive/2026-10/10-14-workspace-shell-parity/result.md)。完整正文/批注/技能增强仍待对应任务。

| 对象         | 位置或状态                                                                            |
| ------------ | ------------------------------------------------------------------------------------- |
| 开发源码     | `E:\AI\framegendev`，React 19 / Vite / TypeScript / Go / Gin / Gorm                   |
| 原始基线     | `E:\AI\mediago-drama-0.1.8`，保留作对照                                               |
| Git 基线     | `main`，`d90e661` 源码导入，`47322e4` npm registry 补丁                               |
| 官方应用     | `E:\AI\MediaGo Drama`，0.1.17，参考其界面与行为                                       |
| 截图         | `E:\AI\mediago-gap-shots\exe-flow`，43 张，已核实均为 1600×1136                       |
| 历史说明     | `E:\AI\mediago-gap-shots\HANDOFF.md`、`GAP-ANALYSIS.md`                               |
| 本地运行配置 | `services/server/configs/server.yaml`，`workspace_dir: ~/mediago-drama-dev/workspace` |
| 生产数据禁区 | `%APPDATA%\mediago-drama\workspace-v2`                                                |

TASK-001 已在独立配置 `.cache/parity/task-001/server.yaml` 下构建并启动；前端 `http://127.0.0.1:31431/`，后端 `http://127.0.0.1:31430/`。数据在该任务的 workspace，未使用表中的默认旧开发目录。

GAP-003已修复Windows质量前提与测试资源/原生CLI/环境兼容，完整check/test、显式全量race和build通过。TASK-002已完成公共.exe解析、双隔离配置真实MCP握手/工具列表/只读批注及原31430后端替换；原四篇与专用文档正文hash/version/updatedAt不变。两项均无提交归档，见 [GAP-003](../../.trellis/tasks/archive/2026-10/10-14-windows-backend-quality/result.md)、[TASK-002](../../.trellis/tasks/archive/2026-10/10-14-windows-mcp-resolution/result.md)。

TASK-003已核实成功探测后的清理竞争，完成同步有界清理/真实日志及Windows私有Job后代管理。最终完整check/test/race/build、连续3次真实runtime-config200、零后代残留、四篇文档不变均通过；forced exit1保留为主动清理结果，不证明Agent认证/prompt可用。见 [验收结果](../../.trellis/tasks/archive/2026-10/10-14-acp-startup-exit/result.md)，Session9无提交归档。31430运行task-003/bin-accepted，配置/数据保持task-001；下一单项未激活，TASK-010仍待评审。

TASK-004已修复无操作文档恢复误写，严格文件hash/version一致性复验通过；TASK-001与TASK-004已归档。该轮文档224测试、基础API、真实中文保存及刷新/重开/重启通过。随后TASK-061首屏已验收归档，见 [本轮结果](../../.trellis/tasks/archive/2026-10/10-14-project-management-parity/result.md)。当前后端PID75752、前端PID61876。模型接入设计仍待评审；真实登录、Agent prompt、生成、导出未执行。

## 验收原则

同一任务分三项记录：视觉是否对齐、交互是否对齐、真实功能是否可用。截图只能证明可见界面，不能证明持久化、生成、导出、安装或付款成功。

官方页面结构需要保留；当前已有能力要继续可用。外部商业服务明确标记待接入，不伪造用户身份、会员权益、余额、付款或商城结果。

优先使用现有组件和 API；缺少实际数据模型或接口时再扩展后端。原差异分析中的工作量仅为历史粗估，按核实后的任务重新估算。

Superpowers 已存在于本机插件缓存，本次使用 brainstorming 梳理设计；每个确认后的模块再使用 writing-plans 生成独立实施计划。首项设计评审不等于整个产品已完成。
