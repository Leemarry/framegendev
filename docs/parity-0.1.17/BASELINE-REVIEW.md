# 新基线复查与补项

2026-10-15，TASK-166 / REQ-045~047。结论来自实际图片、当前源码与隔离官方体验。**这是复查，不是产品整体验收**；没有改变旧独立验收事实，也没有把参考聊天的命令/分工当成用户指令。

## 截图事实

新图实际 **106** 张，无完全相同 hash。编号 01~96、100~107，85/91 各有两张，97~99 不存在。105 张 1920×1080（含系统任务栏），18 为 529×480 用户菜单裁图。早期 exe-flow 的 43 张 1600×1136 全窗口图仍可补证，其中 `00-workspace-comments.png` 与 `01-workspace.png` 的 SHA256 相同，不算两个不同状态。不能用同一 viewport 直接比较这三类尺寸。

每张文件、尺寸、SHA256 在 [机器索引](evidence/2026-10-15/screenshots.json)，默认不要全文读取。全部已查看缩略图；涉及具体控件仍打开原图和运行态。生成方式：

```powershell
pwsh -NoProfile -File scripts/parity/inspect-screenshots.ps1 -SourceDirectory E:/AI/mediago-gap-shots/screenshots -OutputDirectory .cache/parity/task-166/new
```

| 文件编号                | 实际可见内容与证据限制                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| 01~06                   | 项目/归档/垃圾箱、卡片菜单、会员限制弹窗；06 不能代表普通新建项目窗口                       |
| 07~14                   | 原生菜单有部分未展开或错位；13 已到生成历史，14 已到文档。关于对话框仍缺证据                |
| 15~18                   | 15 仍是项目管理；16/17 均是素材页；18 是真实菜单裁图。不能按名字认定 Drami/全局历史已覆盖   |
| 19~25、28、30~35、38~45 | 文档/树/工具栏可见；多数树节点“右键”未出现菜单；38/39 不足以证明模式切换成功                |
| 26/27                   | 实际是文档历史差异面板，不是批注；正文批注非空态仍需补采                                    |
| 29、36/37、46~49        | 媒体预览、新建文档、搜索、链接浮窗；46/48/49 同为链接输入浮窗，不能证明代码/图片/表格菜单   |
| 50~53                   | 50~52 未出现交给 Agent 弹窗/批注栏；53 为项目生成历史空态                                   |
| 54~61、107              | 项目/全局素材、原生导入选择器、排序/筛选/右键；55 未出现新建文件夹弹窗，57 不能证明真实扫描 |
| 62~65                   | 生成输入与模型菜单可见；引用素材/技能包弹层未完整展开                                       |
| 66~70、72               | 实际是新建会话弹窗及类型列表，不能证明四种历史结果与scope                                   |
| 71/73                   | 文档与 Drami 收起态，浮层完整工作流仍缺证据                                                 |
| 74~78                   | 项目设置技能开关、飞书群、文件路径、管理；78 未出现技能详情                                 |
| 79                      | 实际素材页，不是项目历史空态                                                                |
| 80~86                   | 设置基础/账户/用量/浏览器/存储/快捷键/更新；状态写入与清理语义不能由截图推断                |
| 87~95                   | 87 仍是快捷键；88~95 是云ComfyUI/MG/安装/模型接入/扩展/飞书/技能/动效。安装成功态未覆盖     |
| 96、100~106             | 搜索、文档时间轴与冲突警告、NLE；示例片段、提案与波形不等于真实执行证据                     |

## 源码与处置

下表前端路径相对 `apps/workspace/src/`；Electron路径相对 `apps/workspace/`，后端路径相对 `services/server/internal/`。实现存在只代表源码证据；视觉、交互、真实功能分别验收，不能直接把“有”写成“完成”。

| 工作流/参考                 | 当前实现与复用位置                                                                                                                      | 缺口与任务处置                                                                                                                                    |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 项目建立/返回，01~06        | `pages/Projects.tsx`、`domains/projects/api/projects.ts` 有生命周期与四项卡片菜单                                                       | 导入/打开目录仍 disabled；缺导出与新窗口。TASK-060/062，候选185并入；TASK-061旧验收保留                                                           |
| 新建分类文档，36            | `domains/workspace/components/NewDocumentDialog.tsx` 已有五类卡片+资料二级、选中/键盘/按钮联动；对应测试存在                            | 候选180不新建功能，归 TASK-070 补验收；窄屏单列更合理，保留                                                                                       |
| 正文格式，41~49             | `domains/documents/components/tiptap/toolbar.tsx` 已有H1~H4、两种列表、引用/代码/链接/图片/表格                                         | 候选188归 TASK-070 验证，不照错名图新增菜单；官方实测表格直接插入                                                                                 |
| 并发保存，100               | `domains/documents/stores/document-save-queue.ts` 遇409自动 rebase 后用本地全文重试；测试明确要求本地胜出                               | **P0 TASK-181**：暂停冲突自动写入，保留双方内容及清晰合并/重载路径；不应仅换警告文案。GAP-004调用源另查                                           |
| 文档历史，26/27             | `DocumentHistoryPanel.tsx`、workspace API、后端 `http/routes/routes.go` 已有list/diff/restore                                           | 候选187并入 TASK-070：补官方并排/合并差异交互、恢复确认/不删旧版本验证；不另建版本表/服务                                                         |
| 搜索，37/96                 | `ProjectDocumentSearchDialog.tsx` 已跨项目取文档、搜正文/标题、最近项与键盘打开                                                         | 候选183并入 TASK-060 回归；错误/空态/大项目限制待验收，不重新实现搜索                                                                             |
| 素材采用/引用，54~61/107    | `pages/AssetLibrary.tsx`、workspace media API、后端media服务；目录/扫描/评分/正文引用已有独立验收                                       | TASK-030/034聚合复核新图菜单、筛选、引用与生成选入；保留scope隔离/真实引用能力，不退回假数据                                                      |
| 生成→历史→采用，62~70       | `GenerationModelRoutePicker.tsx` 已双栏版本/供应商与可用性过滤；`GenerationComposerPanel`、`MediaGenerationHistory`、generation服务已有 | 候选189并入 TASK-080 回归，配置整合涉及TASK-010仍待评审；真实生成需要单项授权/可用通道                                                            |
| 批注→Agent，50~52           | `CommentsGutter.tsx`、Agent controller、后端document_comments已接批注                                                                   | TASK-050补未解决/已解决/运行中/失败与文档上下文验证；本轮没发prompt                                                                               |
| 时间轴/剪辑，100~106        | `EpisodeNLEWorkbench`、`EpisodeNLEInspector`、nle-editing；另一会话已提交M1/M2/M3（M3为`cdc01a6`），正在做TASK-041                      | 候选184并入 TASK-040 后续独立项：裁剪/分组重置/防抖/声像/淡入淡出/保持音调；先核实预览与导出支持，勿堆假控件。TASK-041字幕真波形、042真实提案分开 |
| 设置导航，80~95             | `Settings.tsx` + `ProjectNavigatorPanels.tsx` 仅工作区/生成配置两组，API/Codex/技能及debug面板真实存在                                  | TASK-020/090补三组完整入口；浏览器、存储、账户、生成服务等缺相应页面。各项复用现有服务，不把它们全部硬绑TASK-010                                  |
| 本地用量/商业，81/82、06    | `BillingPanel.tsx` 与billing服务已有真实本地统计；本地项目不限额符合个人工作流                                                          | TASK-080保留统计；TASK-140补结构与【待接入】。候选186不做假付费拦截/mock放行；有真实权益接口后才启用限制                                          |
| 存储，84                    | 未定位官方分类统计/候选预览清理接口；当前设置无页面                                                                                     | TASK-100：真实目录分类、预算、预览后清理、使用中文件跳过；不得删除未知目录。官方本次还有项目文件/更新包项                                         |
| 扩展/安装/助手，71~78/87~95 | 已有CodexSkills、PromptPack编辑/导入与Agent运行，不等于官方扩展诊断、安装与Drami全局工作流                                              | TASK-110/120/130分别补，保留现有高级编辑能力；飞书/商业待接入，未安装空态不冒充可用                                                               |
| Electron壳菜单，07~14       | `electron/src/main.ts` 有安全窗口/更新/目录桥接，未定义官方应用菜单                                                                     | 候选182并入TASK-090桌面壳；默认菜单不等于官方菜单。新窗口需考虑文档冲突保护依赖                                                                   |

## 本轮实际体验

官方 EXE 在独立 `WinSta0/MediaGoParityAudit166` desktop 运行，另设 APPDATA、LOCALAPPDATA、user-data 与 `MEDIAGO_WORKSPACE_DIR`，未接管原实例。独立服务实际地址 `127.0.0.1:56930`，CDP9226；存储页可见数据确在 `.cache/parity/task-166/official-workspace`。用 browser-harness 点击和读取可访问树；native PrintWindow 核实虚拟桌面主窗1600×1136且非空。

实际完成：空项目→新建隔离项目→五类+资料文档选择→新剧本→插入表格→历史差异→恢复旧版后仍保留旧版本；用户菜单、基础、浏览器、存储、账户和扩展页面。商业按钮未触发；未运行生成/Agent、安装、付费、存储清理。新图不足以覆盖上述全部状态。

补采长期证据集中在 [evidence/2026-10-15](evidence/2026-10-15/)：`official-new-document.png`、`official-history.png`、`official-storage.png`、`official-extensions-full-window.png`。其余快照/可访问树/日志放 `.cache/parity/task-166/official/`，录制在 `C:/Users/Amireux/.config/browser-harness/agent-workspace/recordings/official-parity-166`，不作为默认AI上下文。

重做体验用 `scripts/parity/start-official-desktop.ps1 -AuditDirectory .cache/parity/<新任务> -DesktopName <独立名字> -DebugPort <空闲端口>`；读取生成的 `official-session.json`，在 browser-harness 设独立 `BU_NAME`、`BU_CDP_URL`。启动后先从官方存储页核对工作区路径，再创建fixture。Electron CDP不支持Target.createTarget，应直接操作其已存在目标；不要把另一个会话的Chrome连接切过来。完成用CDP Browser.close关闭自己实例，保留隔离数据与失败证据。菜单/原生选择器用Windows UIA/全窗口截图补证，浏览器内容截图需明确范围。

限制：新建开发实例启动被工具自动审核拦截（blocked by policy）；在官方Electron中创建开发网页tab亦返回Not supported。后续用独立browser-harness连接到Edge CDP9237，新建自己的标签只读核对既有隔离31435的项目页/菜单/设置入口，截图在cache的20~22；未访问该浏览器已有标签。当前开发UI未在本轮全量实测，以上其余结论以源码核实；旧验收只覆盖其原范围，新增缺口均待验收。不接管NLE的CDP9225。官方两个隔离实例均已关闭（首次CDP Browser.close关闭时返回WebSocket connection closed，经进程核实退出；脚本复验实例按已核实PID关闭），隔离数据保留。

## 后续验收顺序

先保护文档/Agent并发数据 → 素材引用与生成采用/历史 → 文档视图往返 → NLE预览/导出/字幕（现有会话）→ 核心全流程TASK-150。设置完整入口和本地必要能力可按独立依赖推进；商业/云端/高级提案保留状态，不优先于本地制作闭环。每个旧“完成”只在新基线暴露具体缺口时追加验收，不全量推翻或重复建设。
