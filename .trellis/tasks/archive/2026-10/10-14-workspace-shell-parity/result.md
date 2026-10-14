# TASK-022 验收结果

2026-10-14；REQ-010/018；参考官方01-workspace.png与02-settings-entry.png。本项只验收工作区壳与必要导航，REQ-010/018整体仍有后续任务。

## 实际修改

- App/AppLayout/SidebarContentLayout：正文与项目设置固定325px侧栏、55px真实项目标题栏；窄屏导航开合、遮罩、Escape、焦点恢复、路由切换关闭与隐藏侧栏inert。
- ProjectNavigator、ProjectNavigatorProjectPanels、ProjectNavigatorPanels、ProjectDirectory：35px类别/文档行，类别/目录、新建、搜索、概览工具栏；底部项目素材库、项目生成历史、项目设置、既有本地用户菜单。
- AgentWorkbenchTopBar、DocumentHeaderActions、WritingWorkspace/WritingEditor：标题栏变更记录/批注与文档/Agent图标操作，正文关闭重复工具条。
- ProjectSettings/Settings、settings store、settings-return：项目设置独立四入口；URL保存tab，route state保存原路径/视图；刷新后返回原文档，直接打开设置回最后文档，嵌套全局技能管理返回原项目设置。
- AssetLibraryButton、GlobalToolboxDrawer：导航变体；项目历史按现有projectGenerationConversation ID过滤并传递项目上下文，不展示其他项目和全局新建入口。
- SidebarScreenStack：切屏使用原生inert同时管理键盘与辅助技术可见性，移除重复aria-hidden触发的焦点警告；保留原切屏动画。
- workspace-shell.css及index.css接线：项目范围尺寸/间距/响应式样式，复用现有token，无依赖、后端、公共API或数据库变更。

## 三项验收

| 类别 | 实际结果                                                                                                                                                                                                        | 边界                                                                                                                                         |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 视觉 | 1582×1056正文/设置深浅主题；侧栏325、标题55、类别/文档35；390×844窄屏及390×380短窗口无横向溢出，底部入口可见；截图已目视核对                                                                                    | 官方1600×1136全窗口，扣除菜单标题/外框对照；真实标题、文档、技能包和本地身份不同。正文批注内部、插图、Drami及NLE不在本项，不宣称整图完全一致 |
| 交互 | 类别/目录、搜索与新建取消、变更记录/批注、文档/Agent、素材/项目历史、设置四入口、tab刷新、返回原路径/视图、全局技能管理往返、直接打开设置回退、返回项目列表与项目重开；窄屏导航后关闭、两级Escape和焦点恢复通过 | 未向Agent发送任务；项目生命周期复用原实现，本项只核实管理入口/现有单测，不重复执行删除/归档                                                  |
| 功能 | 独立测试项目通过UI创建剧本/角色；中文实际输入保存，连续刷新、切换、设置往返、项目重开后完整body/version/hash一致；真实项目/技能/路径/素材/历史读取                                                              | 项目独立技能启停、飞书明确待接入；浏览器禁用桌面打开目录；Electron、生成/导出、外部登录未验收                                                |

## 持久化证据

测试项目 `project-a50363c122554ade`，名称TASK-022 工作区导航保存验收；保留在原隔离workspace。

- 中文剧本 `doc-1791969145908-36yedg6vu5p`：version3，SHA256 `aa248abe0a6ffa0d8ce9a09203c8ba6b87fc93d7f7ab3aa431c7fae915499542`。
- 角色 `doc-1791969329873-cqhodvh0b2u`：version2，空正文hash `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`。
- 原项目 `project-667f58e1306b52e8` 只读核对；原剧本 `doc-1791954637945-opoyqjglmw` version14、hash `c6cdc64412f3c9038fe9b392aec6325c837d7d35f4d9558d85c9b4d24fc754a6`；另一篇文档version2与空hash保持一致。
- 证据在 `.cache/parity/task-022/original-before.json`、`original-after.json`、`persistence-before.json`、`persistence-after.json`。中文正文保留实际编辑产生的两个前导换行，没有trim或清理旧数据。

## 检查

- 修改前导航测试确认2项失败；随后49/72项检查通过，最终加入项目历史过滤和窄屏回归。
- 最终Vitest命令覆盖AppLayout、SidebarScreenStack、ProjectNavigatorPanels、ProjectNavigatorProjectPanels、GlobalToolboxDrawer、WorkspaceUserMenu、settings-return、ProjectSettings、DocumentHeaderActions、WritingEditor、MarkdownHybridEditor、AgentWorkbenchTopBar：12文件83测试通过。
- `pnpm -C apps/workspace check`：lint 0警告/错误，format通过。`pnpm -C apps/workspace build`：tsc/Vite退出0，既有>500kB包体提示保留。git diff --check退出0；暂存区为空，HEAD仍47322e4。
- Trellis上下文校验最初因inline任务两份JSONL为空返回2错误；补充实际已读取的组件/质量规范引用后 `task.py validate` 退出0。没有派发agent或修改工作流脚本。
- browser-harness的browser-check.py完整视觉/入口检查通过；browser-persistence.py实际创建，browser-final.py最终专用tab完整检查退出0。最终console error/warn及window error/unhandledrejection为空；保留的CDP日志无导航焦点警告与非取消失败。导航取消的Fetch/流不当作业务成功。
- 后端日志仍有document MCP executable unavailable、ACP exit1和runtime-config503，属于TASK-002/003；本项没有解决或掩盖这些问题。素材抽屉既有GAP-001保留，不以本项切屏修正宣称所有焦点缺陷已解决。
- `/api/v1/health`返回ready=true；配置 `.cache/parity/task-001/server.yaml`，数据 `.cache/parity/task-001/workspace`，前端31431/PID61876、后端31430/PID64284。未重启后端，全量测试/后端质量门/Electron未运行，未改后端。

## 失败与修正

- 窄屏继承根导航CSS隐藏文字，增加项目范围响应式覆盖；Radix用户菜单Escape会触发父导航关闭，限制父事件处理到其DOM后通过。
- 初轮Chrome CDP9223在Windows125% DPI下坐标有偏差，最小化截图超时；改独立headless Chromium/CDP9224按实际viewport验证。
- 首轮format发现测试文件格式，已修正；新增SidebarScreenStack测试使用Element.dataset造成TS2339，改getAttribute后构建通过。
- 切设置的原生浏览器日志暴露重复aria-hidden/inert警告；共享SidebarScreenStack保留inert，新增导航交互状态回归，最终浏览器未再出现该警告。
- 一轮browser-final在末尾fetch遇harness IPC超时，服务health正常；重跑通过。测试脚本重复注册全局const产生SyntaxError，改IIFE并使用新测试tab后最终异常为空；这是测试注入问题，不记录为产品异常。

## 截图与交接

`.cache/parity/task-022/`：workspace-desktop-dark/light、settings-desktop-dark/light、workspace-mobile-light、settings-mobile-dark、navigation-mobile-dark/light、navigation-short-window、document-history、project-search、new-document-cancel、project-assets、project-generation-history、global-skills-from-project、saved-document-reload/final.png；browser-errors.json、browser-events.json保留实际末轮日志。

本项按 `--no-commit` 记录会话和归档；只关闭本轮专用Chromium/CDP9223与9224，保留前后端、测试profile与全部项目/文档。未操作生产workspace-v2、原始源码/截图目录、真实素材或用户浏览器，未暂存/提交/推送。

后续按用户指定继续单项；建议先TASK-002修复Windows MCP路径，再核对TASK-003 ACP退出。TASK-010仍待评审；正文/批注完整对齐、项目技能增强、飞书、素材、历史、NLE和Drami继续由已有任务承担。
