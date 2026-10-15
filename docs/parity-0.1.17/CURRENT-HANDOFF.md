# 新对话交接摘要

## 最新：TASK-162 空逻辑素材文件夹删除（2026-10-15）

- 已实现 global/project DELETE 逻辑目录 API：按 owner scope 校验，含素材或子目录返回 `409`，跨 scope/缺失返回 `404`；空目录只删除逻辑行，不触碰物理媒体、ID、URL、路径、hash、元数据或引用。
- 前端已加入删除图标、确认/取消、忙状态、真实失败保留当前目录；成功更新 SWR 并回到父目录。前端 API/page 13 项测试通过；lint、format、build 通过。
- 后端 `check` 已通过 tidy、gofmt、vet、golangci-lint、Swagger、构建及 `go test -race ./...`；repository/service/app/HTTP 回归覆盖空目录、媒体/子目录冲突、重开持久化和项目清理。
- 本轮已用 browser-use MCP（Qoder in-app 浏览器，真实 DOM 点击+真实 fetch+网络日志+可访问性快照）完成真实验收，替代上一轮损坏的 `browser-harness.exe`（uv trampoline 报错）：从当前工作树用 gap-003 mingw+CGO 重建后端于隔离 31430（task-162/server.yaml+workspace，health ready=true），前端 Vite 31431 代理。global/project 均验证——取消零 DELETE 请求、非空 `409` 保留父子目录、空目录 `200` 成功回父级并 SWR 更新、DB 与 reload 后 UI 持久化一致、深浅主题 token 适配（暗 `--background rgb(25 27 28)`／浅 `rgb(243 246 250)`，确认按钮=destructive、错误提示=error-foreground）、窄屏 popover 删除入口可达。流程证据 `.cache/parity/task-162/acceptance/flow-evidence.json`。
- 验收中发现并修复真实缺陷：非空 409 原显示误导性通用"文件夹删除失败，请重试。"（根因 httpClient 拦截器 reject 普通 `ApiError` 对象而非 `Error`，`err instanceof Error` 落空；单测以 `new Error()` mock 掩盖了生产分歧）。删除弹窗改按既有约定（folder-actions.ts / generatedResultActions.ts / EpisodeTimelineView.tsx）读取 `.message`，单测同步为真实 `ApiError` 形状；前端 13 测试/lint/format/build 全过。范围仅删除弹窗，重命名/移动同模式与英文服务器消息本地化留待已登记 i18n 项。
- 像素截图未捕获：in-app Browser 面板不可见（`visibilityState=hidden`），`take_screenshot`/原生 click 报 `NATIVE_BROWSER_VIEWPORT_UNAVAILABLE`，需用户手动聚焦面板；经用户确认以 DOM/网络/计算样式流程证据替代（交接允许截图/流程证据二选一）。视口无法程序化调整，窄屏经强制移动 CSS 验证。
- 任务材料见 `.trellis/tasks/archive/2026-10/10-15-asset-library-folder-delete/`；TASK-162 已验收归档并按 DEC-029 本地提交（不推送）。TASK-030/TASK-034 整体仍开发中，重挂父级、物理扫描、评分筛选排序和关联详情未实施；下一步按 TASK-034 剩余真实依赖选独立单项，先核实个人必要性与可复用能力。

## 最新：REQ-044 / DEC-029 开发流程与Git规则

2026-10-15：TASK-161已验收归档并记录Session19，规则与日志在同一本地提交中保存。

- 最新用户要求：单功能完整开发、自测功能与架构、记录并本地Git提交后，再启动下一功能；优先复用，兼顾技术与产品判断。此前“不暂存/不提交”约定已覆盖，不推送。脚本自动提交保持关闭，会话审阅明确路径提交。
- 成品参考`E:/AI/MediaGo Drama`已确认存在；完成时分别核对页面完整性、交互及真实能力。本地个人用户非必需项保留【待开发】及原因/恢复条件，不强行实施。截图只是文档历史界面证据，不是恢复动作或新功能实施指令。
- 历史累积源码/测试/设计/任务资料已审计，检查点`216611e`保存411个路径。敏感文件名/常见凭据模式扫描无匹配，密钥、缓存、依赖、构建物和隔离运行数据保持忽略；导入换行与两份附带Markdown空白问题已修正，提交前差异检查通过。历史产品验收沿原记录，本轮未重跑产品质量门或真实流程。
- TASK-161规则落地已完成文档验收，结果见[本项记录](../../.trellis/tasks/archive/2026-10/10-14-iteration-git-policy/result.md)。44本地链接、台账编号唯一、文档格式、AGENTS自定义段格式及受管片段未变、忽略规则/差异检查通过；本项提交与会话归档按DEC-029执行。下一产品项先评估TASK-034剩余生命周期/扫描工作的个人必要性与真实依赖，形成单功能计划；TASK-030/034仍未完成、TASK-010待评审、TASK-170新增方案实施未定。
- 历史运行入口`http://127.0.0.1:31431/assets?scope=all`与隔离task-001配置/数据保留；本轮未启动、替换或向运行服务发送任务。唯一开发目录framegendev，生产workspace-v2禁区、inline和外部操作边界保持。

以下为历史记录，旧Git边界与旧调度默认值以本节及DEC-029为准。

## 最新：TASK-033/035/036完成，核实TASK-034剩余子项

- 文件夹基础分类闭环与全局范围整页全部真实验收，Session16~18无提交归档。目录创建嵌套重命名、当前目录上传/同scope移动、global元数据与双项目隔离、URL刷新/设置返回均可用。最终前端8文件58测试/lint/format2/build、后端check/test/race/build通过；深浅/390窄短屏、80字符目录、重启SQLite/API/hash/原四文档及既有素材不变通过。
- 31430最新为.cache/parity/task-033/bin/mediago-server.exe，PID51648，MCP沿task-035同级；配置/data仍task-001。31431/PID61876、CDP9223指定MediaGo tab保留；其他Toonflow未操作。task-033/035迁移/替换前DB备份与所有验收文件保留。
- 最新证据.cache/parity/task-033/，flow-accepted.json含两专用项目、global目录两素材、project目录一素材；TASK-036三目录两素材也保留。旧失败日志不覆盖；toast遮挡/UTF8/序列化等脚本问题已核实并修正。
- TASK-030/TASK-034仍开发中：目录删除/重挂父级/物理扫描、评分筛选排序和关联详情待补。下一步核实目录生命周期/扫描契约形成单项计划；不要把基础分类或全局整页完成说成素材库整体完成。TASK-010待评审，TASK-170/DEC-027新自动化方案实施未定且材料保留。
- DEC-028记录用户最新原则：架构/复用/技术与产品判断，一个功能完整验收后再推进。按DEC-023持续推进，无逐项询问/并行agent/Git自动提交/生产workspace访问。
- 完成后已只读核实TASK-034剩余：media无library磁盘扫描，既有projectasset/local_file_sync.go扫描work并写project_reference_assets，不能直接冒充library扫描。逻辑目录无删除/重挂API；下一单项优先形成空逻辑目录删除契约，含媒体/子目录拒绝，物理文件/引用保留。研究记录.trellis/tasks/10-14-official-0-1-17-parity/research/asset-library-next.md；未实施/未执行这些操作，当前任务指针为空。

## TASK-036完整分类闭环已完成，接TASK-033

- 项目目录树/面包屑、创建嵌套重命名、当前目录直接导入、同scope移动、取消/失败草稿、URL恢复与设置/原文档返回已真实验收。前端完整门/7文件46测试、深浅/390窄短屏/80字符、重启SQLite/API/hash/原文档与既有素材不变通过。证据.cache/parity/task-036/，result在归档任务。
- 后端31430/task-035/bin/mediago-server.exe最终PID77944；31431/PID61876、原隔离task-001配置/data与所有文件保留。project-a882fb13175d1f80含三目录两素材。仅指定MediaGo测试tab操作，其他Toonflow未动。
- 同一文件夹基础分类功能已完整落地，下一项TASK-033全局整页scope选择复用；TASK-034删除/重挂父级/扫描仍待开发，TASK-030整体未完成，TASK-010/170原状态保留。

## TASK-035完成，TASK-036页面闭环续作

- 后端check/test/race/build全部exit0；18次真实HTTP目录/上传/移动检查与11次重启持久化检查通过。证据.cache/parity/task-035/，失败check-final.log保留，成功为\*-mirror.log。原四篇文档、既有素材和文件hash未变。
- 31430已替换task-035/bin/mediago-server.exe，PID7092；MCP沿task-031同级工具，配置/数据仍task-001，迁移前备份保留。31431/PID61876与CDP9223测试页保留。
- 立即接TASK-036（已有prd/design/implement）：复用AssetLibraryWorkspace完成项目目录树、创建/重命名、分类导入/同scope移动、URL恢复/返回和窄短屏。按用户最新原则，API与页面属于同一文件夹功能，完整落地后才转其他功能。TASK-030整体未完成，目录删除/重挂父级/扫描待开发；TASK-010/170原状态和全部未提交改动保留。

## 设计资料整理交接（TASK-170，REQ-042/043）

入口：`E:/AI/MediaGo Drama/漫剧自动化工作台-设计与开发资料/README.md`。用户明确本次整理供未来参考，是否开发未定。资料包含7份主题MD、专用AGENTS、8原始附件、6历次设计图、官方/toonflow/代表文稿、日期快照、25源码锚点、manifest与verification。UI/Skill/MCP共用服务，保留既有确认及后台任务边界；画布和图文联动有基础，小数秒/图片停留到预览导出及整剧恢复还需实现。

离线检查：66文件、55复制源hash、25图像解码、32本包链接、4 Python脚本语法、25代码锚点和常见明文key模式通过；历史快照/用户文稿原仓库链接不作可迁移链接验收。未运行产品质量门/真实生成/Agent/媒体导出，没有修改产品或安装目录原应用文件。TASK-170保留待验收，不归档，原AI图仍待供应商恢复。本包整理已交付；新增能力下一步按用户新目标再选单项，其他会话TASK-035继续独立维护。

## 素材开发检查点（TASK-032完成，转TASK-034核实）

- TASK-032项目素材库根目录整页已完成实际验收：6文件47测试、lint/format(threads2)/build/diff检查通过。1582深浅、390窄短屏、PNG/文本真实导入与hash、排序筛选/元数据搜索编辑、原文档刷新返回/设置嵌套返回、旧弹窗及原四篇文档不变通过。证据.cache/parity/task-032/，result在对应Trellis任务。
- 当前专用验收项目project-90dd100180d991ba；全部验收文件保留。31430/PID71020、31431/PID61876、CDP9223原隔离环境不变。仅操作MediaGo测试tab，其他Toonflow标签页属于并发会话，不关闭或更改。
- 自动继续TASK-034素材文件夹数据/API核实与首个独立子项；全局整页TASK-033后续，文件夹/扫描按钮仍待开发，不能宣称TASK-030完成。TASK-010与其他会话TASK-170状态保持。

- TASK-031已实际完成并无提交归档，结果在.trellis/tasks/archive/2026-10/10-14-asset-library-metadata/result.md。真实tags/note/rating持久化与编辑/搜索、PUT写入scope隔离、Escape先取消编辑、窄短屏滚动；23前端测试与质量门、后端完整check/test/race/build、服务重启与四篇文档不变通过。
- TASK-032根目录整页完成；文件夹/扫描TASK-034、全局页面TASK-033继续独立推进。TASK-010仍待评审。其他会话TASK-170设计与图片提供方待恢复材料保留，不在此会话归档或实施。
- 当前31430使用E:/AI/framegendev/.cache/parity/task-031/bin/mediago-server.exe，最终PID71020；同级工具保留task-003/bin-accepted版本。原task-001/server.yaml与workspace不变，SQLite迁移前backup在task-031/app-before-migration.db。31431原PID61876保留。
- 专用项目project-74a3e23fa0e87a6f，PNG asset-c1ea942689374225，标签主角/夜景、多行中文备注、评分5；重复验收PNG与期间其他JPEG均保留。证据task-031/asset-saved.json、gates.json、persistence-accepted.json与metadata-\*.png。
- 默认32线程格式检查发生内存不足，2线程完整门通过；harness编码/JS转义/焦点与多测试页HTTP连接排队失败均如实保留，单页和正确定位后末轮无console/脚本异常。专用Chromium profile task-031/browser，PID68728/CDP9223；不要开多个同站点SSE测试页。
- 没有Electron、登录、prompt、生成、导出或生产workspace访问。保留其他任务与所有未提交改动，不暂存/提交/推送。

## 2026-10-14 v2设计补充（TASK-170）

本轮读取用户8附件、角色规则与盒饭CSV，明确参考此前toonflowLocal；实际浏览3001“女孩”画布并保存媒体节点/选中编辑截图。唯一设计已修订，三张v2为04-character-linkage、05-editable-storyboard、06-media-canvas，均本地示意，引用图片标明参考，非AI新产物。REQ-038~041、扩展036、DEC-026与候选TASK-175~178已登记；根AGENTS自定义区链接`.trellis/spec/guides/comic-production.md`，不改受管块。

已有章节生成/采用/mention与preset可复用；正文右侧逐章节资源栏待完整对齐，标准模板不等于多步骤套件已实现。前端支持小数解析，但剪映服务只传视频路径，未把镜头In/Duration映射给底层；图片停留/轻运动/指定帧定格及实际预览导出待开发验收。toonflow两个视频节点预览失败；本轮不修参考项目，不发生成/Agent任务。浏览器切换/选中/适应视图可能触发参考应用自动保存视口。

本轮设计下一步为TASK-175单项章节联动核实与计划，再分开176角色模板、177镜头列表、178图片停留；这些候选不替代其他会话TASK-032的开发调度。AI出图仍按DEC-025待恢复，本轮未追加收费调用。图/脚本/链接/差异检查见任务结果，不宣称产品质量门或端到端通过。

以下为上一版设计记录，当前解释以上述v2与素材开发检查点为准：

本轮优先完成用户分析/设计与出图诊断请求：REQ-032~037、DEC-024/025记录自动生产与画布局部修正目标，以及保留官方视觉的选择。未改产品代码。唯一方案为`docs/superpowers/specs/2026-10-14-automation-workbench-design.md`；三张本地布局图、隔离项目页实际截图、完整AI提示词与绘图脚本在同名子目录。

已核实批量接口、重试、React画布及localStorage布局，不能按完全空白规划；整体生产编排/项目级状态存储待开发。指定工具包五次无图，模型列表查询正常；flare402上游图片账户余额不足，其他标识502。AI效果图待提供方恢复，失败计费未知；TASK-170待验收不归档。不反复请求/充值/更改全局provider，不写入用户消息中的明文密钥。

上一版下一步为TASK-031检查；该项现已由素材会话验收归档并进入TASK-032。TASK-171~174仍是候选路线，TASK-010待评审。上一版仅验证图文、工具包离线测试和浏览器查看，产品lint/build/Agent生产和视频生成未运行。

更新：2026-10-14。本文件用于续作；状态以重新核实的源码、台账和运行环境为准。

## 续作速读（Session10）

- 最近完成：TASK-003 ACP清理退出，已验收/归档（Session9）；当前任务指针为空，父任务与TASK-010仍为planning。
- 默认下一项：TASK-030素材库，先核实既有元数据/API与真实数据流，形成首个独立可验收子项后实际开发。项目页面、全局scope分别推进，暂不一次包揽NLE。
- 持续授权：自动选择并推进下一单项，不逐项询问是否继续或重复批准常规设计/实施。每项仍须先设计/计划、开发、分别验收界面/交互/功能、更新记录，然后自动接下一项。详见DEC-023及AGENTS.md。
- 问题登记待开发/待接入/待验收/阻塞，附原因、证据、恢复条件；能修则修，确实受阻则继续独立任务，失败项不标完成或归档。TASK-010仍待评审，跳过它及依赖项。
- 本轮只更新交接与授权规则，未激活TASK-030、修改产品或重跑产品验收；下述产品运行/测试结果来自Session9，下一对话先复核。

## 用户目标与推进方式

- 唯一开发目录：`E:/AI/framegendev`。从0.1.8源码出发，对齐官方0.1.17的界面、交互和功能。
- 用户反馈页面还原度差，要求按官方截图逐个任务开发。每次只设计、实施和验收一个明确任务，必须修改实际产品，不只写计划或搭静态页面。
- 需求/任务稳定编号以本目录为准；Superpowers负责模块思考/计划，项目级Trellis负责生命周期、规范与会话记录。已获授权，不重复询问常规开发或创建记录权限。
- 核心制作流程优先，次要功能延后但全部登记，最终完整对齐目标保留。已有代码先核实并复用，不能把已有能力重复开发。
- 商业页面保留官方结构，提供真实本地能力；账户、会员、积分、充值、商城等外部服务明确待接入，不伪造成功。

## 当前已完成

| 任务     | 结果与验证                                                                                                                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TASK-160 | 项目级Trellis接入，inline、关闭自动提交；未修改全局配置                                                                                                                                                      |
| TASK-001 | 源码独立构建/启动；隔离workspace；健康、项目/设置读取、中文保存及刷新/重启通过                                                                                                                               |
| TASK-004 | 修复文档无操作加载误写：StarterKit trailingNode关闭，locked-heading内部交易preventUpdate；文档224测试，hash/version刷新/重开/重启稳定                                                                        |
| TASK-061 | 项目管理首屏：单标题、325px根侧栏、230×307卡片、导航、归档/垃圾箱插图。7文件51测试及lint/format/build通过；真实中文创建/取消/重命名/归档/恢复/垃圾箱/恢复/刷新通过                                           |
| TASK-021 | 最新完成：对照06-user-menu.png实现根用户菜单，320×370px、35px行高、分组/图标/开合箭头。真实主题持久化/刷新、键盘/Escape、技能/设置入口通过；窄屏语言列表与短窗口滚动通过；5文件33测试及lint/format/build通过 |

TASK-021已归档（Session5）；TASK-022已验收归档（Session6）。TASK-002首轮修复/质量门失败见Session7；GAP-003与TASK-002最终验收/归档见Session8。最新TASK-003清理退出核实、实际修复及验收完成，Session9无提交归档；当前没有激活下一任务。以上完成不代表全产品已对齐。

最新验收：[TASK-003 result](../../.trellis/tasks/archive/2026-10/10-14-acp-startup-exit/result.md)。此前[TASK-022 result](../../.trellis/tasks/archive/2026-10/10-14-workspace-shell-parity/result.md)与[TASK-021 result](../../.trellis/tasks/archive/2026-10/10-14-user-menu-parity/result.md)保留。
此前验收位于`.trellis/tasks/archive/2026-10/`的isolated-runtime-baseline、document-reload-mutation、project-management-parity任务目录。

## TASK-022 已完成

- 对照01-workspace.png/02-settings-entry.png，正文/项目设置共用325px侧栏、55px真实项目标题、35px类别/文档行；搜索/新建/概览与类别/目录在工具栏，底部项目素材/历史/设置和本地用户菜单。
- 项目设置四入口：技能包、飞书群、项目文件、项目管理。真实全局技能只读，项目单独启停待接入；飞书待接入；文件显示真实路径，浏览器禁用桌面打开目录。项目历史限定既有项目conversation ID。
- 设置tab存URL，原路径/视图存route state；刷新、全局技能嵌套往返和直接打开设置回最后文档可用。标题栏历史/批注、文档/Agent图标；正文关闭重复工具条。
- 窄屏导航开合/遮罩/Escape/焦点恢复/路由后关闭与短屏滚动；共享SidebarScreenStack用原生inert修复切屏重复aria-hidden焦点警告。素材抽屉GAP-001继续保留。
- 最终12文件83测试、lint 0警告/错误、format/build及git diff --check通过。1582×1056深浅正文/设置、390×844窄屏、390×380短屏、导航/取消/返回/重开通过。保留既有>500kB包体提示。
- 专用项目`project-a50363c122554ade`（TASK-022 工作区导航保存验收）由UI创建剧本/角色；中文实际输入保存。剧本`doc-1791969145908-36yedg6vu5p` version3、hash `aa248abe0a6ffa0d8ce9a09203c8ba6b87fc93d7f7ab3aa431c7fae915499542`在刷新/切换/设置往返/重开后一致；角色version2/空hash。
- 原项目`project-667f58e1306b52e8`两篇文档未编辑：剧本version14、hash `c6cdc64412f3c9038fe9b392aec6325c837d7d35f4d9558d85c9b4d24fc754a6`；另一篇version2/空hash，末轮快照与开始时相同。
- 该轮最终专用tab console error/warn和window异常为空，CDP日志无切屏焦点警告与非取消失败；当时后端MCP禁用/ACP exit1/runtime-config503，已由本轮更新结果取代。中途测试类型错误、脚本注入重复const、harness IPC超时已修正/复验，见result。
- TASK-022当轮未运行全量测试、后端质量门、Electron或后端重启；本轮后端完整门已通过。没有登录、生成、Agent prompt或导出。本项不包含正文批注内部/插图、资源栏、NLE、Drami与完整技能增强，不宣称整张截图完全对齐。

## GAP-003 与 TASK-002 已完成

用户明确要求先单项处理GAP-003，再完成TASK-002验收。两项design/implement/result已归档到`.trellis/tasks/archive/2026-10/10-14-windows-backend-quality/`与`10-14-windows-mcp-resolution/`。

- GAP-003提供本地便携Winlibs GCC16.2.0；官方SHA256校验通过，路径`.cache/parity/gap-003/toolchain/mingw64/bin/gcc.exe`，source.json在其toolchain父目录。没有全局安装或永久环境修改。
- 修复测试DB/日志生命周期，包括直接打开、路径型构造器、延迟settings DB、reopened chat与TestMain全局DB；CLI登录/注销和app ffmpeg用原生测试可执行fixture，保留参数/challenge/取消断言。HOME同步USERPROFILE，NO_PROXY按Windows继承键处理。未改产品数据库缓存、API、schema或ACP逻辑；x/sys已有v0.43.0仅由间接改直接依赖，go.sum无变化。
- `services/server/scripts/check-windows.ps1 -Gate check|test|race|build`临时设置CC/CGO/PATH/GOFLAGS=-p=1，全部完整门退出0。可选进程镜像GOPROXY=https://goproxy.cn,direct、GOSUMDB=sum.golang.google.cn；finally恢复。日志在`.cache/parity/gap-003/logs/*-accepted.log`及remaining-gates.json；早期失败保留，无新增skip或降低门。
- TASK-002产品仍只改acp_mcp.go及测试：公共解析Windows补.exe，保持HTTP优先、同级与8层祖先bin搜索/错误/生成MCP降级。原生先失败后通过，14组跨平台策略/路径回归；Linux/macOS未实际运行。
- 重建task-002/bin中的server/document/generation/probe.exe；核实后停止旧64284，用新server和原task-001/server.yaml替换31430，新PID49948，健康ready=true。前端31431/PID61876保留。旧bin/mediago-server.exe与所有数据保留。
- 原task-001和独立task-002配置分别运行真实ACP resolver探针，同级.exe与stdio initialize/list通过；document9工具、generation2工具，list_comments返回threads=[]。没有调用生成或Agent prompt。
- 专用项目`project-d74116ba09ba4d1e`、文档`doc-file-9cf2eef11be39bf3`仍version1、hash `590c282853e3df6258608f6cfea354d65473782df17ce8507030a11b5dd474dd`，body/version/updatedAt与首轮及本轮只读前后相同。原与TASK-022四篇文档版本14/2/3/2、hash和updatedAt在重启、MCP和配置查询后完全不变。
- 原项目只读GET agent/runtime-config本次返回200与真实模型/权限选项；ACP约6.5秒后清理exit1/TerminateProcess denied。TASK-003需区分正常清理与实际失败，不能沿用旧503结论或宣称prompt可用。
- 证据在task-002的binary-hashes-final.json、health-final.json、runtime-old/new.json、persistence-runtime-before/after/final.json、document-runtime-before/after.json、acp-status-final.json与logs/mcp-probe-runtime-final.log/mcp-probe-fixture-final.log。探针源码仍在`services/server/.cache/parity-task-002-probe/main.go`（忽略文件）。
- 专用31432/PID25708经身份核实后关闭，数据和文件保留。组合替换命令曾被自动策略拒绝且未执行；独立核验后分步停止/隐藏启动成功，无待批准动作。

实际记录：[GAP-003 result](../../.trellis/tasks/archive/2026-10/10-14-windows-backend-quality/result.md)、[TASK-002 result](../../.trellis/tasks/archive/2026-10/10-14-windows-mcp-resolution/result.md)。两项completed；Session8无提交记录本轮。

## TASK-003 已完成（Session9）

- 专用JSON日志确认runtime-config成功与真实模型/权限选项在先，旧关闭管道/Kill/请求取消竞争在后。历史exit1不能直接判为账户或初始化失败。
- InspectSessionConfig返回前完成清理；共用清理关闭stdin，等3s，再必要Kill并最多等2s；stdout保留到Wait/超时，记录purpose、stage、cleanup_reason、forced及原始wait_error。
- Windows共用启动使用私有kill-on-close Job Object，CREATE_SUSPENDED启动、先加入Job再恢复主线程；退出/取消/超时均关闭Job，覆盖shell/Codex/MCP后代。失败则终止并回收，不静默降级。非Windows启动保持cmd.Start；使用已有x/sys版本，无新增依赖/上游二进制修改。
- 首版500ms和仅3s版本真实后代验收失败，证据保留；官方npm1.1.2源码SHA512核验后确认Windows shell启动与2s退出兜底。没有继续放宽3s后代观察窗口，增加Job管理后才通过。
- 原生EOF/延迟2s/已退出非零/强制、探测成功/失败/认证错误/重试/取消、真实后代EOF/强制/取消与resident回归通过。Job版本完整check/test/race/build全退出0，日志task-003/logs/\*-job.log、gates-accepted.json。child GORACE仅移除人工退出sleep，race检测未关闭；无新增skip或门降级。
- 最终连续3次真实runtime-config200，3次probe_completed/forced exit1如实保留，无ACP WARN/ERROR，父进程回收且后代残留0。Windows强制Kill退出码1为主动清理结果；元数据成功仍不证明账户/Agent prompt可用。
- 原四篇version14/2/3/2、正文hash/updatedAt完全一致，task-002/task-003-before.json与task-003-after.json相同。只读API、健康与进程观察，无登录、prompt、生成、导出或生产workspace访问。
- 证据task-003/acceptance.json、runtime-config.json、acp-lifecycle.json、process-drain.json、processes-after.json、health.json、runtime-accepted.json、binary-hashes-accepted.json及logs/runtime-accepted.log。旧bin/bin-final及first/second/third/grace-only失败材料保留，不能重启到旧版。
- 产品入口：internal/service/acp的acp_runner.go、acp_runner_process.go、acp_runner_resident.go、acp_process_windows.go、acp_process_other.go；两个原生fixture测试及TestMain分派。规范在.trellis/spec/backend/logging-guidelines.md；完整design/implement/result已归档。

## 下一单项

默认自动推进TASK-030（REQ-012），当前尚未激活或开始设计开发。先读取该需求与素材相关官方截图、核实既有元数据/API和真实数据流，再拆分首个可独立验收的子项并实际开发；子编号先查占用，元数据/API、项目页面、全局scope分别验收。复用已有能力，不一次扩展到整个NLE。

每项完成后按台账和真实依赖自动接下一项，无需用户确认。TASK-030确实受阻则登记证据/恢复条件，优先核实TASK-050已有批注回归或TASK-080本地历史中的独立子项，写明调度理由；不能绕过实际依赖或把检查失败算完成。TASK-010设计仍待评审，跳过它及依赖项，不阻塞其他工作。

不重复开发已完成的MCP解析、Windows质量或ACP清理，不把MCP握手/选项查询成功当成Agent prompt通过。自动推进不扩展到真实登录、生产数据、付费、外部发送或不可逆操作；保留全部数据隔离与Git边界。

## 保留的缺陷与待补项

- TASK-003已完成；真实Agent prompt/生成链路仍未验收，不能根据模型/权限元数据或HTTP服务ready推断账户可用。
- TASK-010：模型接入整合页设计仍待评审，位置`docs/superpowers/specs/2026-10-14-model-access-design.md`。工具接入或其他任务完成不自动批准它。
- TASK-062：项目导入/已有目录待设计；当前入口禁用并标记待接入。
- Drami、商业服务、完整国际化、NLE/音频字幕/导出、完整素材库/历史/设置等继续逐任务推进。用户菜单接通技能页不等于技能管理增强已完成。
- 官方项目kebab和创建弹窗未截，不宣称未知细节一致。官方43张图为1600×1136全窗口；浏览器对照需扣除标题菜单和外框。
- 本轮后端完整门通过；前端未改且未重跑全量，Electron、真实登录/Agent prompt/生成/导出未验收；既有bundle>500kB提示与其他已登记界面警告保留。

## 正在运行与数据隔离

- 前端：`http://127.0.0.1:31431/`，核实时PID61876/node。
- 后端：`http://127.0.0.1:31430`，核实时PID75752，二进制`E:/AI/framegendev/.cache/parity/task-003/bin-accepted/mediago-server.exe`，同级document/generation.exe；不要重启到task-002或task-003/bin、bin-final旧版。
- 健康：`/api/v1/health`，最后返回`ready=true`；`/health`返回SPA HTML，不能作为就绪证据。
- 配置：`E:/AI/framegendev/.cache/parity/task-001/server.yaml`。
- 数据：`E:/AI/framegendev/.cache/parity/task-001/workspace`；DB为其`.mediago-drama/db/app.db`。
- 日志：`.cache/parity/task-001/logs/`；最新后端stdout/stderr在`.cache/parity/task-003/logs/runtime-accepted.*.log`。前端启动脚本`.cache/parity/task-001/start-web.ps1`，设置VITE_API_PROXY_TARGET指向31430。
- 服务可能在新对话前退出，先核实端口/进程和配置；仅在需要时按TASK-001 runbook重启，别复用旧默认workspace。
- 本轮专用Chromium/CDP9223、9224收尾关闭，用户浏览器不受影响；profiles在`.cache/parity/task-022/browser`、`browser-headless`。前后端继续运行，现有数据和新验收项目/文档保留，不清空或重建。

## TASK-022 源码与测试入口

- 壳：App.tsx、AppLayout、SidebarContentLayout、SidebarScreenStack、ProjectNavigator及ProjectNavigatorProjectPanels/ProjectNavigatorPanels/ProjectDirectory。
- 标题：AgentWorkbenchTopBar、DocumentHeaderActions及测试；WritingWorkspace/WritingEditor关闭重复工具条。
- 设置：ProjectSettings及测试、Settings、lib/stores/settings.ts、domains/workspace/lib/settings-return.ts及测试。
- 历史/素材：GlobalToolboxDrawer及测试、AssetLibraryButton；styles/workspace-shell.css及index.css接线。项目壳CSS未分层，不能放入components layer，否则旧Tailwind utility尺寸覆盖；其他页面侧栏偏好保留。
- 截图/脚本/证据在`.cache/parity/task-022/`；browser-check.py和browser-final.py经browser-harness通过。browser-persistence.py会创建项目，不随意重跑；browser-final.py复用专用项目，只读原基线文档。persistence-before/after和original-before/after.json保留完整正文/版本/hash证据，browser-errors/events.json为末轮日志。
- Markdown恢复不调用onChange、不trim正文；设置返回不靠history.length猜目标；项目技能不以全局API假冒项目启停。

## 此前源码与测试入口

- 最新新增：`apps/workspace/src/domains/workspace/components/WorkspaceUserMenu.tsx`及测试、`src/styles/user-menu.css`。
- 接线：ProjectNavigator.tsx、ProjectNavigatorProjectPanels.tsx及测试、styles/tokens.css和index.css。
- 主题复用`shared/stores/theme.ts`的`app.theme.v1`；设置标签复用`lib/stores/settings.ts`，技能为prompt-packs，软件设置为appearance。
- 项目管理：`src/pages/Projects.tsx`及测试、`src/styles/projects.css`；插图`public/parity/`，来源记录在该目录README。
- 截图/脚本：`.cache/parity/task-061/`、`.cache/parity/task-021/`；browser-check.py/browser-final.py通过browser-harness运行，不要随意重跑旧生命周期脚本以免创建/修改项目。
- 浏览器交互遵循browser-harness技能。可用Chromium路径：`C:/Users/Amireux/AppData/Local/ms-playwright/chromium-1187/chrome-win/chrome.exe`；常规Chrome安装路径不存在。专用CDP曾用9223，重启后daemon需重新连接。

```powershell
pnpm -C apps/workspace lint
pnpm -C apps/workspace format
pnpm -C apps/workspace build
pnpm -C apps/workspace exec vitest run <本项相关测试路径>
```

## 新对话启动必读

1. 根AGENTS.md，以及本目录README.md、REQUIREMENTS.md、TASKS.md、DECISIONS.md、TRELLIS.md。
2. `.agents/skills/trellis-start/SKILL.md`；执行以下上下文命令，再读相关frontend/backend索引、frontend具体规范及guides/project-workflow.md。
3. 参考`E:/AI/mediago-gap-shots/HANDOFF.md`、GAP-ANALYSIS.md及exe-flow截图。历史差异不能替代当前源码核实。

```powershell
python -X utf8 .trellis/scripts/get_context.py
python -X utf8 .trellis/scripts/get_context.py --mode phase
git status --short
```

## 不能违反的约束

- 原始源码`E:/AI/mediago-drama-0.1.8`、官方应用和截图目录仅作参考。
- 禁止访问`%APPDATA%/mediago-drama/workspace-v2`；不要对真实项目发送Agent或生成任务。
- 分支`codex/task-004-document-reload`，HEAD`47322e43b13cb26c17963decb357154f638e2853`。多个任务代码和记录尚未提交，暂存区为空。保留全部既有改动，不reset/checkout覆盖；未经要求不暂存、提交、推送或启动并行agent。
- 三阶段长期目标保留：一是官方核心流程对齐；二是源素材目录索引/预览/映射校验/真实产出；三是toonflowLocal画布调研/接入/互通/保存恢复。第二/三阶段当前仅登记任务，尚未实施。
- 源素材`E:/Amireux/Documents/ChatGPT/漫剧/霸总甜宠AI漫剧`只读；未来产出到其`-测试`目录且保留已有文件。画布参考`E:/Amireux/Music/AI漫剧/toonflowLocal`当前不修改。缺失媒体显示待生成，不造假素材。

## 可直接用于新对话的指令

> 在E:/AI/framegendev继续开发。先读AGENTS.md、docs/parity-0.1.17/CURRENT-HANDOFF.md及README/REQUIREMENTS/TASKS/DECISIONS/TRELLIS，执行Trellis上下文命令，核对Git、实际源码、端口与隔离数据。TASK-003已验收归档（Session9）；默认从TASK-030素材元数据/API核实与首个独立可验收子项开始，分别设计/计划、实际开发、验收、更新台账。用户已持续授权按依赖自动接下一单项，不要逐项问我是否继续或重复确认常规设计/实施。问题标记待开发/待接入/待验收/阻塞，写明原因、证据和恢复条件；能修则修，确实受阻则继续独立任务，检查失败不标完成或归档。TASK-010保持待评审并跳过其依赖项。保留全部未提交改动和隔离数据，不访问生产workspace-v2，不对真实项目发送Agent/生成任务，不自动暂存、提交、推送或启动并行agent。31430应使用task-003/bin-accepted及原task-001配置/数据，启动前重新核实；元数据成功与forced exit1清理结果不代表账户或Agent prompt已验收。持续记录当前项、下一项、问题和真实验证结果。
