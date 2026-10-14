# TASK-022 Workspace Shell Implementation Plan

> For agentic workers: use Superpowers executing-plans inline; project authorization excludes commits and subagents.

**Goal:** 对照01/02修改实际工作区壳与必要导航，保持编辑状态。

**Architecture:** 复用React/SWR/Zustand及真实API，壳样式限定项目；URL存设置tab、路由state存返回目标。

**Tech Stack:** React19、TypeScript、SWR、Zustand、Radix、Lucide、CSS tokens、Vitest。

**Spec:** [design.md](design.md)、[prd.md](prd.md)。

## Constraints

只改framegendev、隔离数据；不生成/登录/提交/并行agent；TASK-010待评审；无新增依赖/API。

## Execution

- [x] 读交接/规范/截图与实际源码；核实配置/health，记录现状截图。
- [x] 扩展ProjectNavigatorPanels/ProjectNavigatorProjectPanels/AppLayout行为测试，首轮确认2项失败后修复。
- [x] 修改App/AppLayout、ProjectNavigator\*、ProjectDirectory、AssetLibraryButton/GlobalToolboxDrawer、settings store、Settings/ProjectSettings；新增workspace-shell.css。项目历史限定当前project conversation。
- [x] DocumentHeaderActions及测试；接AgentWorkbenchTopBar；WritingWorkspace/WritingEditor避免重复操作。
- [x] 相关Vitest（含MarkdownHybridEditor/WritingEditor）：最终12文件83测试通过；lint/format/build通过，保留既有包体提示。新增测试Element.dataset类型错误改getAttribute后构建通过。
- [x] browser-harness桌面深浅/390x844/390x380、导航/返回/刷新/取消、真实读取；专用中文文档version3和hash不变，原文档version14/2及hash不变。修复切屏重复aria-hidden与inert焦点警告，末轮完整复验通过，实际异常/日志见result。
- [x] result、台账/交接/规范更新，Trellis上下文引用校验通过；Session6按--commit "-" --no-commit记录，任务按--no-commit与无PR分支校验豁免归档。
