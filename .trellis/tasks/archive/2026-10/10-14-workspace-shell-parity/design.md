# TASK-022 设计

使用Superpowers brainstorming核实已有流程。用户本轮要求制定单项计划并实际开发验收，沿用项目授权；TASK-010评审独立保留。

## 当前差距

实际侧栏260px、标题44px且为智能体工作台，目录12px字、24/28px行。底部为设置/帮助/素材/历史图标。项目设置混入全局配置、默认常规，无项目标题；history.length返回在刷新/直接入口可能去无关页面。

## 最小改动

- App/AppLayout：projectWorkspace涵盖正文及项目设置，固定325px，不改其他侧栏保存宽度。标题取projects SWR真实名称。窄屏按钮开合侧栏，导航后关闭。
- ProjectNavigatorProjectPanels/ProjectDirectory：35px工具栏与行、概览图标；底部复用AssetLibraryButton/GlobalToolboxButton navigation变体、显示项目前缀，接WorkspaceUserMenu。
- ProjectNavigatorPanels：项目设置独立四入口。project-skills/project-feishu/project-files/project-general由已有settings store和URL tab驱动，全局设置保持。
- ProjectNavigator：设置路由state保存原路径/视图，返回优先该记录；直接入口回项目最后文档。tab写URL并replace。
- ProjectSettings/Settings：单一SettingsPanelLayout标题为项目设置及名称；listPromptPacks只读实际全局包，项目开关待接入；文件显示真实路径/桌面限制；生命周期复用；飞书待接入。
- AgentWorkbenchTopBar：已有文档/Agent切换改图标，保持accessible names；标题栏接DocumentHeaderActions历史/批注，WritingWorkspace关闭WritingEditor重复工具条。
- workspace-shell.css只作用项目壳、复用tokens。正文内部、批注插图/Drami差距留TASK-050/070/130。

## 验证与回退

测试实际回调、URL/返回、数据边界与Markdown加载；browser-harness独立profile、现有隔离server。原项目只读，专用测试项目写入。无依赖、数据库、后端或公共API变更；回退仅撤本项，保留TASK-004/061/021。
