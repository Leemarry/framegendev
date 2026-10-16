# 新基线复查与补项

2026-10-15，TASK-166 / REQ-045~047。结论来自实际图片、当前源码与隔离官方体验。**这是复查，不是产品整体验收**；没有改变旧独立验收事实，也没有把参考聊天的命令/分工当成用户指令。

## 截图事实

2026-10-16补证：TASK-050在会话1独立官方desktop/CDP9242实际选区添加非空批注，锚点、编辑/删除及未解决数量已补采，见 `.trellis/tasks/archive/2026-10/10-16-comment-context-safety/evidence/official-nonempty-comment.png`。未点击发送Agent，成功/失败运行态仍未覆盖；下表保留原始截图的证据限制。

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

2026-10-16补证：TASK-181旧窗口草稿发现已集成7ea7f4e/e363a3c。保留profile真实重启发现多源、下载/失败/缺失文档/暂停载入及主生产包390px/刷新/完整正文历史与来源值一致通过，详见 `.trellis/tasks/archive/2026-10/10-16-prior-window-recovery/result.md`。修复已加载工作区被passive loading effect误标syncing的生命周期竞争。会话2原生新窗口仍待其独立Electron复验；下表保留最初源码复查结论。

TASK-030采用边界补证：dd34016拒绝外项目任务来源；087932e同时校验直接ID/URL及任务解析媒体，缺失/外项目404零写，并修复自动标题的取消采用。实际本地/全局双项目采用取消、引用增减、重启与完整Windows门、主235文件1552测试通过。见selection-project-isolation与selection-media-isolation归档；全局路径投影、真实生成及全流程仍待核实。

下表前端路径相对 `apps/workspace/src/`；Electron路径相对 `apps/workspace/`，后端路径相对 `services/server/internal/`。实现存在只代表源码证据；视觉、交互、真实功能分别验收，不能直接把“有”写成“完成”。

| 工作流/参考                 | 当前实现与复用位置                                                                                                                      | 缺口与任务处置                                                                                                                                    |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 项目建立/返回，01~06        | `pages/Projects.tsx`、`domains/projects/api/projects.ts` 有生命周期与四项卡片菜单                                                       | 导入/打开目录仍 disabled；缺导出与新窗口。TASK-060/062，候选185并入；TASK-061旧验收保留                                                           |
| 新建分类文档，36            | `domains/workspace/components/NewDocumentDialog.tsx` 已有五类卡片+资料二级、选中/键盘/按钮联动；对应测试存在                            | 候选180不新建功能，归 TASK-070 补验收；窄屏单列更合理，保留                                                                                       |
| 正文格式，41~49             | `domains/documents/components/tiptap/toolbar.tsx` 已有H1~H4、两种列表、引用/代码/链接/图片/表格                                         | 候选188归 TASK-070 验证，不照错名图新增菜单；官方实测表格直接插入                                                                                 |
| 并发保存，100               | `domains/documents/stores/document-save-queue.ts` 遇409自动 rebase 后用本地全文重试；测试明确要求本地胜出                               | **P0 TASK-181**：暂停冲突自动写入，保留双方内容及清晰合并/重载路径；不应仅换警告文案。GAP-004调用源另查                                           |
| 文档历史，26/27             | `DocumentHistoryPanel.tsx`、workspace API、后端 `http/routes/routes.go` 已有list/diff/restore                                           | 候选187并入 TASK-070：补官方并排/合并差异交互、恢复确认/不删旧版本验证；不另建版本表/服务                                                         |
| 搜索，37/96                 | `ProjectDocumentSearchDialog.tsx` 已跨项目取文档、搜正文/标题、最近项与键盘打开                                                         | 候选183并入 TASK-060 回归；错误/空态/大项目限制待验收，不重新实现搜索                                                                             |
| 素材采用/引用，54~61/107    | 本地聚合03cd506及目录034、尺寸8dc674f、标签b6aa54e、子文件夹4068f39、目录/全部c1de8a9、全局来源筛选b514f6b已验收；官方新补采范围/使用状态/checkbox见asset-folder-descendants归档evidence；失败分别验收 | 保留scope隔离/真实引用；TASK-030尚缺收藏/回收站/使用状态、详情颜色/来源网址/用途tabs、官方来源分组、大库分页；真实生成采用未运行 |
| 生成→历史→采用，62~70       | 双栏模型选择/历史与采用服务已有；本地导入预校验/去重90b07c9、音频缓存a747a54及真实冷加载/390px/错误详情/跨项目隔离b776423已验收，见对应归档；官方音频空态已补采 | 音频为明确失败fixture恢复，不代表生成成功；全局/项目分组刷新、本地统计、真实生成采用仍未验收，TASK-010待评审；多窗口HTTP/1.1 SSE连接压力保留 |
| 批注→Agent，50~52           | `CommentsGutter.tsx`、Agent controller、后端document_comments已接批注                                                                   | TASK-050补未解决/已解决/运行中/失败与文档上下文验证；本轮没发prompt                                                                               |
| 时间轴/剪辑，100~106        | `EpisodeNLEWorkbench`、`EpisodeNLEInspector`、nle-editing；另一会话已提交M1/M2/M3（M3为`cdc01a6`），正在做TASK-041                      | 候选184并入 TASK-040 后续独立项：裁剪/分组重置/防抖/声像/淡入淡出/保持音调；先核实预览与导出支持，勿堆假控件。TASK-041字幕真波形、042真实提案分开 |
| 设置导航，80~95             | `Settings.tsx` + `ProjectNavigatorPanels.tsx` 仅工作区/生成配置两组，API/Codex/技能及debug面板真实存在                                  | TASK-020/090补三组完整入口；浏览器、存储、账户、生成服务等缺相应页面。各项复用现有服务，不把它们全部硬绑TASK-010                                  |
| 本地用量/商业，81/82、06    | `BillingPanel.tsx` 与billing服务已有真实本地统计；本地项目不限额符合个人工作流                                                          | TASK-080保留统计；TASK-140补结构与【待接入】。候选186不做假付费拦截/mock放行；有真实权益接口后才启用限制                                          |
| 存储，84                    | 未定位官方分类统计/候选预览清理接口；当前设置无页面                                                                                     | TASK-100：真实目录分类、预算、预览后清理、使用中文件跳过；不得删除未知目录。官方本次还有项目文件/更新包项                                         |
| 扩展/安装/助手，71~78/87~95 | 已有CodexSkills、PromptPack编辑/导入与Agent运行，不等于官方扩展诊断、安装与Drami全局工作流                                              | TASK-110/120/130分别补，保留现有高级编辑能力；飞书/商业待接入，未安装空态不冒充可用                                                               |
| Electron壳菜单，07~14       | `electron/src/main.ts` 有安全窗口/更新/目录桥接，未定义官方应用菜单                                                                     | 候选182并入TASK-090桌面壳；默认菜单不等于官方菜单。新窗口需考虑文档冲突保护依赖                                                                   |

2026-10-16素材来源分组e8f1aaa→7fe1f6b已验收：在隔离官方实际展开六类来源，源主真实本地/空组/资源记录及标签交集、失败重试/390×480/页面后端重启完整记录hash通过；主3文件63测试和前端/Electron/嵌入Windows门通过。物理来源优先，缺失才使用采用来源，不从文件名推测。浏览器采集无producer契约，明确禁用待接入；真实生成非空UI未覆盖。证据见asset-provenance-filter归档。此时剩余收藏/回收站/使用状态/详情和200项列表截断，后续状态见当前交接。

2026-10-16使用状态实现d75fb62→652cfc7已集成，界面待验收。官方实际菜单确认五选项，非空分类规则未实证；本地以真实采用/候选/参考和解析文档图片关系统计，排除导入追溯。源完整Windows门/全量race与build、源主66前端测试/前端门/Electron及主媒体相关race通过；源主四真实PNG分类、隔离/参数400和实际后端重启完整记录hash通过。主201文件/双视频历史/制作组合保护通过。隔离Edge9240启动仍被自动审批拒绝，菜单点击/截图/窄屏/页面重开尚未运行，任务不归档，见asset-usage-filter/result.md。200项截断已有独立验收，收藏/回收站/详情等差距保留。

2026-10-16素材完整列表67643ed→dff25bd已验收：现有assets[]无分页信息却只取200项，源主201真实本地文件均复现最早项搜索0；去掉上限后完整202含全局/文本201/最早搜索预览1，失败取消/390×480滚动及页面后端重启完整记录/hash通过。源完整Windows check含全量race/独立build，主媒体仓储race、前端门/Electron/嵌入构建通过，见asset-complete-list归档。本项修复隐藏截断，仍是O(N)全量载入，不能把超大库分页/虚拟滚动标完成。

## 本轮实际体验

官方 EXE 在独立 `WinSta0/MediaGoParityAudit166` desktop 运行，另设 APPDATA、LOCALAPPDATA、user-data 与 `MEDIAGO_WORKSPACE_DIR`，未接管原实例。独立服务实际地址 `127.0.0.1:56930`，CDP9226；存储页可见数据确在 `.cache/parity/task-166/official-workspace`。用 browser-harness 点击和读取可访问树；native PrintWindow 核实虚拟桌面主窗1600×1136且非空。

实际完成：空项目→新建隔离项目→五类+资料文档选择→新剧本→插入表格→历史差异→恢复旧版后仍保留旧版本；用户菜单、基础、浏览器、存储、账户和扩展页面。商业按钮未触发；未运行生成/Agent、安装、付费、存储清理。新图不足以覆盖上述全部状态。

补采长期证据集中在 [evidence/2026-10-15](evidence/2026-10-15/)：`official-new-document.png`、`official-history.png`、`official-storage.png`、`official-extensions-full-window.png`。其余快照/可访问树/日志放 `.cache/parity/task-166/official/`，录制在 `C:/Users/Amireux/.config/browser-harness/agent-workspace/recordings/official-parity-166`，不作为默认AI上下文。

2026-10-15 用户追问后复核：上述补采是实际操作记录，录制目录有23帧及 `events.jsonl`（21:40~22:00），包括 `click_at_xy` 事件；不是仅查看已有截图或重演。当前9226/9227无监听，本项官方进程已退出。启动器复验的会话参数保存在 `.cache/parity/task-166-launch-check/official-session.json`；旧PID不能用于新一轮操作。

限制：新建开发实例启动被工具自动审核拦截（blocked by policy）；在官方Electron中创建开发网页tab亦返回Not supported。后续用独立browser-harness连接到Edge CDP9237，新建自己的标签只读核对既有隔离31435的项目页/菜单/设置入口，截图在cache的20~22；未访问该浏览器已有标签。当前开发UI未在本轮全量实测，以上其余结论以源码核实；旧验收只覆盖其原范围，新增缺口均待验收。不接管NLE的CDP9225。官方两个隔离实例均已关闭（首次CDP Browser.close关闭时返回WebSocket connection closed，经进程核实退出；脚本复验实例按已核实PID关闭），隔离数据保留。

## 复用虚拟桌面

这是 Win32 `CreateDesktop` 创建的独立 Windows desktop，不是虚拟机或 Win+Tab 工作区。启动器把官方EXE放到该桌面，AI通过 browser-harness/CDP 操作真实应用的网页内容，不抢占当前桌面。原生菜单和文件选择器需要额外的原生桌面控制，CDP点击不能替代。

1. 在仓库根目录读 `browser-harness` 技能，检查当前进程/端口。下面名字只是示例，每次换全新的缓存目录、desktop名称和空闲端口；启动器拒绝复用已有profile。只启动 [官方隔离脚本](../../scripts/parity/start-official-desktop.ps1)，不双击用户正在使用的实例。

   ```powershell
   Set-Location E:/AI/framegendev
   $audit = '.cache/parity/official-review-20261015-a'
   pwsh -NoProfile -File scripts/parity/start-official-desktop.ps1 -AuditDirectory $audit -DesktopName MediaGoReview20261015A -DebugPort 9238
   ```

2. 脚本输出并保存PID、desktop、workspace、profile与CDP地址。读取本次参数，用独立harness名称连接已有Electron页面；它不支持 `Target.createTarget`，不要调用 `new_tab`。首次连接若服务尚未就绪，检查本次启动状态再重试；不要改连其他实例。

   ```powershell
   $session = Get-Content (Join-Path $audit 'official-session.json') -Raw | ConvertFrom-Json
   $env:BU_NAME = 'official-review-20261015-a'
   $env:BU_CDP_URL = $session.cdp
   'print(page_info())' | browser-harness
   ```

3. 先点用户菜单→设置→存储，确认工作区是本次 `$session.workspace`。再创建隔离测试项目；通过可访问树定位、`click_at_xy`点击，逐步验证状态。不访问真实 `workspace-v2`，不做登录、付费、真实生成/Agent或清理。
4. 每个缺少状态先实际点开，再截图。网页内容可运行 `'capture_screenshot("E:/AI/framegendev/.cache/parity/official-review-20261015-a/page.png")' | browser-harness`；该目录已由启动器创建。完整原生窗口需根据本次desktop/PID用 `EnumDesktopWindows` + `PrintWindow` 截图，本轮得到1600×1136；检查图像非空且内容正确。缓存中的旧 `capture-window.ps1` 写死了旧PID，仅供追溯，不能直接复用。对照时区分内容截图、完整窗口和含系统任务栏的桌面图。
5. 需要记录点击过程时先 `start_recording`，结束 `stop_recording`，保留返回的准确目录。本轮已有23帧不是视频文件；不把事后重演当原始记录。长期补采只选有用证据进入本目录 `evidence/<日期>/`，其余图/树/日志放本项缓存。
6. 完成后用同一 `BU_NAME`/`BU_CDP_URL` 执行 `'cdp("Browser.close")' | browser-harness`。关闭时可能报WebSocket已断开，核实本次profile命令行对应进程和CDP端口已退出；若仍存活，只处理已核实归本项的进程，不按名称批量结束。保留数据，更新本项结果与待补状态。

2026-10-16本地采用补项8187d88→a1b079d：真实素材导入后的采用保存imported来源，取消失败正确回滚，重开不重复更新采用时间。源主实际失败/恢复/资源栏往返与重启通过；主首轮误触新增空文档使整列表基线失败保留，捕获POST确认原因，独立confirmed项目全文/版本/元数据/历史/任务/采用/解析章节/hash全量零写通过。主237文件1586测试与前端门/Electron/嵌入Windows构建通过，390CSS图片正常。详见local-adoption-roundtrip归档；未发送供应商生成，资源栏仍文本摘要，图片时间轴属178，整体030/080/150不完成。

2026-10-16 TASK-150本地组合58f2bbf→3f19c92：主隔离项目实际UI剧本/分镜、本地MP4/WAV导入与imported采用、资源/时间轴/NLE、保存失败重试、音画一帧内同步/字幕/真实波形、1.700s实际视频音频文字草稿导出、取消/冲突及页面后端重启完整记录hash通过。主完整237文件1595测试通过；纳管截图与界限见local-production-combination归档。无外部生成/Agent、无原生剪映重开，整体150未完成。

2026-10-16 TASK-080命名历史可选kind c6e58f5→9eec53e已验收：省略类型按既有会话类型读取，错误显式类型400、真实故障安全500；源完整Windows check/race/build、源主前端门及3文件78测试/Electron、主generation/handlers race和嵌入构建通过。实际双视频会话隔离/失败隐藏/重试/页面及后端重启完整记录与文件hash不变；201素材及制作组合快照仍通过。见history-optional-kind归档。390×480工具箱侧栏挤压内容、源ResizeObserver通知、浏览器进程重启与整体080/150未验收状态保留。

2026-10-16 TASK-080项目/会话历史交集b69d507→d4d1710已验收：修复显式会话被projectId聚合分支忽略，过滤在分页前应用，清理为空的项目不扩大范围；项目无会话仍保留聚合。源主旧版真实两路复现2条/错误类型200，修复后1条/错误类型400，未知/外项目/分页及重启完整双视频记录hash通过。最终完整Windows门/全量race/build、主定向race/嵌入构建与201文件/使用状态/制作组合保护通过，见history-project-session归档。无新UI及外部调用，浏览器和整体080/150差距不因此关闭。

## 后续验收顺序

2026-10-16 TASK-070资源摘要43c199a→bd6d803已验收：补接零生产调用的StoryboardTimelinePanel，真实开关/空态/两H2组/离线失败重试/dirty保护/刷新及源主后端重启完整文档历史与原始/解析时间轴零写；主50文件321测试/前端门/Electron/嵌入构建通过。空态实测发现API通用Markdown回退被误作组，复用既有H2检测修复，NLE回退保留。官方真实开关/空态补采，H2编辑后仍空且dirty，非空官方能力未确认；完整资源操作/引用绑定仍待验收，见storyboard-resource-panel归档。

2026-10-16 TASK-080共享历史读取bfd9912→b266bc7已验收，源真实本地导入的项目/全局/另一项目隔离、阻断/缓存隐藏/重试、390px、源主取消刷新和后端重启完整记录零写，主103文件711测试/前端门/Electron/嵌入构建通过，见history-scope-acceptance归档。MediaGenerationWorkspace独立历史尚未覆盖；本地导入误计供应商调用已由仓储修正cbb5aaf→主910f3fb，完整Windows check/race/build与主31456实际四分组/范围API及页面零用量通过，导入历史和文档记录重启后不变；未发送生成请求，外部生成与080/150整体仍未完成。

2026-10-16 TASK-070补项：d730d2a→3b88dab已验收历史全文只读阅读/精确源码（history-snapshot-views归档），源/主实际取消、刷新和后端重启完整正文版本历史不变。f2afc4a→49f9a35已验收历史下拉/侧栏/恢复目标同步；官方实际选择Version1，ArrowLeftRight为普通SVG而非按钮，纠正此前“互换”推断。后续e04969d→c80be16/短屏28f2240已验收普通字体行差异阅读，主51文件323测试/前端门/full708format/Electron/嵌入构建及实际失败重试/取消/刷新/源主重启完整记录不变通过，见history-reading-diff归档。官方逐词高亮/Markdown转换未确证，资源摘要已见上项，完整资源操作/引用绑定仍待验收。首次跨项目直达documentId被加载前规范化移除另记，未修改会话2导航所有权。

2026-10-16补项：TASK-030全局素材历史/采用downloadPath配置根目录投影已修复并验收（7c4a3c1→bcb2c6e，media-download-path归档）。实际源/主重启后完整记录与文件hash保留，图片预览正常；原生下载对话框、真实生成采用和官方详情/筛选仍待验收，不扩大为整项完成。

2026-10-16 TASK-080独立媒体历史读取28cbee2→346f4f7已验收：源主真实分镜生成面板、本地图片导入的失败隐藏/重复重试/恢复、提示词继续编辑/保留、取消重开与页面刷新、后端重启完整文档版本历史任务不变。主53文件400测试/前端门/full708format/Electron/嵌入Windows构建通过，见media-workspace-history-state归档。390CSS短屏无横向溢出，既有标题挤窄需下一单项处理；独立Edge profile重开未验收，使用browser-harness新建本地tab。真实外部生成采用与080/150整体未完成。

2026-10-16生成弹窗窄屏标题3e330de→3216d97已验收，355/390CSS短屏标题完整、源主历史/素材库/取消重开和源预览Escape保留父弹窗，完整文档历史任务不变；主3文件27测试/前端门/full708format/Electron/嵌入Windows构建通过。结果见generation-modal-header归档。预览关闭动画首次断言过早、一次Vite ResizeObserver通知已保留。

先保护文档/Agent并发数据 → 素材引用与生成采用/历史 → 文档视图往返 → NLE预览/导出/字幕（现有会话）→ 核心全流程TASK-150。设置完整入口和本地必要能力可按独立依赖推进；商业/云端/高级提案保留状态，不优先于本地制作闭环。每个旧“完成”只在新基线暴露具体缺口时追加验收，不全量推翻或重复建设。
