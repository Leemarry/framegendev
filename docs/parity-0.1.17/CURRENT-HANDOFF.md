# 当前交接

更新：2026-10-16。只保留活跃事实，历史见 [快照](HISTORY-HANDOFF-2026-10-15.md)。续作入口 [README](README.md)。

## 2026-10-16 单会话接管（最新约定）

用户决定将全部剩余工作交给会话2，以避免并发冲突。本节覆盖下方历史双会话文件归属：会话2接管原会话1范围、公共文件、总台账与主目录串行集成；会话1完成本次交接提交后停止开发与集成。会话2仍在 `E:/AI/framegendev-wt/session-2` / `codex/parity-s2` 开发，不修改会话1工作树或接管其运行实例；主目录仍用于串行集成。TASK-010待评审、TASK-042及170~178不自动实施等边界保持有效。

- 交接前主目录 `640ddd9`（干净），会话1 `8176b99`，会话2 `617a80d`。会话1已完成产品改动均已集成主目录；会话1只剩未跟踪的空任务jsonl，保留原样，不是待合并产品实现。本节文档提交另见Git历史。
- 会话2先核实自己的未提交改动并保护，再将主目录已提交结果合入自己的分支，处理语义冲突；不重置、不覆盖、不整分支盲目集成。`8ccef8b` 原生新窗口已在会话2分支，尚未验收、尚未集成主目录。
- TASK-181旧窗口恢复 `b7c3d79` 已集成为 `7ea7f4e`，验收 `f2517ad`、生命周期修复 `e363a3c` 也已集成；会话2旧result中的“等待会话1恢复补丁”已过时。TASK-181不重写，只补原生多窗口组合验收。
- `dbf28fa` 的项目transfer/storage接口请求仍有效，但不再等待会话1；会话2分单项规划并实现安全服务、路由、模型/仓储及UI。创建项目不是导入，技能包mgpack不是已核实的项目包格式。
- 沿用会话2隔离端口31452/31453、CDP9241/9243及自己的profile/desktop/数据目录，启动前核实占用。会话1的31450/31451、9240/9242及主31456实例保留，不关闭、不接管。Edge9240此前启动被自动审批以blocked by policy拒绝；这不证明会话2自己的浏览器或Electron不可用。

接手顺序与未完成状态（详情继续沿用TASKS和各任务result，不另建平行台账）：

| 顺序 | 任务 | 剩余工作 |
| ---- | ---- | -------- |
| 1 | TASK-062 原生新窗口 | 基于最新恢复补丁复验8ccef8b：完整退出重启、多份草稿发现/预览/恢复/取消、来源字节保留、窗口隔离、加载失败重试；通过后集成 |
| 2 | TASK-090 桌面 | 通知点击回来源窗口、原生文件选择框归属、打包多窗口共用单后端；快捷键/浏览器设置逐项核实现状，真实升级安装不执行 |
| 3 | TASK-030 使用状态 | d75fb62→652cfc7已实现集成，API/质量门/后端重启已通过；补真实菜单点击、失败重试、截图、窄屏、页面重开，任务asset-usage-filter不归档 |
| 4 | TASK-060/062 项目流转 | 核实官方格式；只读预检、原子导入、稳定导出、打开已有目录、安全路径与冲突策略；原生选择器/进度/取消/失败回滚及正文版本素材引用往返 |
| 5 | TASK-100 存储 | 分类真实统计、限定缓存清理预览、活动文件契约、使用中文件跳过、逐文件失败反馈；预算有真实消费者后才宣称生效 |
| 6 | TASK-030 素材其余 | 收藏/回收站、详情颜色/来源网址/用途tabs等逐项核实补齐；超大库分页/虚拟滚动仍未实现。来源分组、200项截断修复及TASK-034已验收，不重做 |
| 7 | TASK-070 文档 | 完整资源操作/引用绑定、跨项目documentId直达URL问题；官方逐词高亮/Markdown转换先确证，不凭截图推断。历史/源码/行差异/资源摘要已验收 |
| 8 | TASK-050/080 | Agent成功/显式解决、真实生成采用与更广用量待接入/验收；HTTP/1.1多窗口SSE压力、工具箱窄屏挤压、ResizeObserver通知仍需核实。项目/显式会话历史交集d4d1710已验收 |
| 9 | TASK-040/041 | 复用已完成NLE/字幕/波形/真实导出，只补剪映原生重开兼容性和字幕排版；本机未找到剪映，保留待验收与恢复条件 |
| 10 | TASK-110～140 | 逐页核实官方结构与本地能力；扩展/安装协议、Drami资产与运行时、飞书及商业接口缺失项如实待开发/待接入，不做假成功 |
| 最终 | TASK-150 / GAP-004 | 复用已验收本地制作组合3f19c92，补新增模块的组合回归、保存重开/失败取消/完整内容版本引用hash、主目录构建运行及最终集成；旧共享doc-ref-a异常保存调用来源仍待核实 |

已完成导航窄屏、基础设置、本地账户入口、HTTP缓存统计、更新失败重试，不重复开发。外部生成/Agent受缺codex-acp、供应商及服务约束；禁止真实登录/付费/生产生成/外部发送、禁止访问真实workspace-v2。每次只推进一个可验收项，失败/未运行保留，按明确路径提交，不推送。

### 会话2已执行接管（2026-10-16）

- 会话2原工作树干净，已将主目录 `fd1c71a` 合入 `codex/parity-s2`，合并提交 `ce27bde`。唯一冲突为 desktop/actions.test.ts，保留两侧测试；桌面动作/旧窗口恢复/冲突面板/状态同步四文件20测试通过，lint、Electron compile和TypeScript/Vite build通过。主目录尚未纳入本轮新窗口功能。
- TASK-062原生新窗口子项已完成独立验收：同profile完整退出重启发现3份草稿、选择/取消/402字节下载/读取失败重试/显式暂停载入/reload/已有dirty拒绝均通过，来源字节和完整服务器正文历史不变；最新加载失败销毁/重试、关闭root存活、项目隔离及390px深浅和完整原生截图通过。12文件91测试及前端门通过，详见`.trellis/tasks/archive/2026-10/10-16-s2-project-windows/result.md`和evidence（验收354ce3f）。下一项TASK-090，打包单sidecar/通知点击/文件picker仍不宣称完成；项目流转也未完成。
- 31452/31453、CDP9245初查无监听，已启动自己最新版server-takeover.exe及Vite/Electron；数据仍在session-2/.cache/parity/s2-settings与s2-desktop-dev，未操作会话1或主目录实例。后续按上表单项推进，每项完成后提交结果与真实证据。

## 任务与协作（历史双会话约定，归属以本页最新接管约定为准）

- 2026-10-15 双会话隔离：源码共同起点 `c5a173841473210ea1b100f83c4a6b11ef54cba7`；共同约定基线 `3265748c88f795bf8dc468b45eb83290e843e9a1` 已由双方同步（会话2并发先建于源码起点，随后自行快进约定提交）。主目录 `E:/AI/framegendev`（`codex/nle-export`）只做串行集成；会话1 `E:/AI/framegendev-wt/session-1` / `codex/parity-s1`；会话2 `E:/AI/framegendev-wt/session-2` / `codex/parity-s2`。不覆盖或重置已有分支；只合并对方已提交且有实际验证的独立项，不修改对方工作树/实例。
- 会话1负责 TASK-181 → 070/050/030/034/080（按真实依赖）、040/041剩余验收与150组合流程；拥有前端 `domains/documents/`、`generation/`、`episode/`、`agent/`、`pages/AssetLibrary.tsx` 及对应测试/后端 document/generation/episode/media/projectasset 服务。会话2负责项目管理、导航、设置、桌面与商业页；拥有 `domains/projects/`、`settings/`、`pages/Projects.tsx`、`pages/Settings.tsx`、`electron/`、`shared/desktop/`，以及对应后端 projects/settings/billing 服务与测试。TASK-010仍待评审，TASK-042及170~178不自动实施。
- `domains/workspace/` 不作整目录认领。会话1独占：`api/workspace.ts`、`api/media.ts`、`api/project-assets.ts`、`api/library-folders.ts` 及测试；`components/AssetLibraryButton*`、`AssetLibraryFolders.tsx`、`AssetLibraryMetadataEditor*`、`AssetLibraryScopes.tsx`、`NewDocumentDialog*`、`NewReferenceDocumentDialog*`、`GenerationNotificationButton*`、`GenerationConversationCreateDialog.tsx`、`AgentProjectCreateDialog.tsx`、`AgentWorkbenchTopBar*`、`ProjectDirectory.tsx`、`ProjectDirectoryTree*`、`directory/*`；`lib/asset-library*`、`lib/library-folders.ts`。会话2独占其余现有 workspace 组件（含 AppLayout/ProjectNavigator/ProjectWorkspaceShell/ProjectDocumentSearchDialog/WorkspaceUserMenu）与其测试及导航、路由描述/设置返回等 lib 文件。新增跨界文件先在本节登记。
- 公共文件唯一负责人为会话1：本交接、TASKS/REQUIREMENTS/DECISIONS/BASELINE-REVIEW、AGENTS自定义区、共享模型 `src/types/`、`router/`、`shared/components/ui/`、`shared/lib/`、`shared/stores/`、样式与依赖/锁文件、后端 `domain/`、`repository/`、`app/`、`http/routes/routes.go`、`service/workspace_state_service*`、`http/handlers/workspace.go`。会话2仅在自己任务目录记录结果/所需公共契约，通过独立提交供会话1读取；公共修改由会话1小提交提供契约。各自 Trellis 任务目录独立；公共日志由会话1串行维护。
- 公共契约更新（TASK-020，回应会话2 `8296b0e` 的 result）：`apps/workspace/src/App.tsx` 本项唯一写入人指定为会话2，仅限向既有 AppLayout 传入 `globalSettings={routeIsSettings && !projectWorkspace}`、相关导航 key/类型连接与必要回归；AppLayout 仍由会话2拥有。复用原窄屏抽屉，不将 projectWorkspace 全局化。会话1在会话2提交该修复前不编辑 App.tsx。共享 `services/server/internal/service/model/workspace.go` 归会话1；TASK-181增加可选 `expectedVersions` 原子校验契约，公共API小提交验收后提供。此处不授权TASK-010/042/170~178。
- 会话2已验收子项串行集成：菜单454b90c/e6bf582；设置导航50e4d56、基础设置ef5ff3a/7cb807c、本地账户2b411f1、窄屏壳f37fdb1及归档175de18；扩展复用入口a586b81、只读桌面缓存统计09235ef及归档da9ab00。来源分支对应8296b0e/26190ee/c05ab94/d30bde4/e1b55bc/39617ee/c6b0ff0/0b6e50c/7363286。原390px失败已由会话2真实重验修复；主集成390px账户点击/抽屉关闭焦点/文档历史实际通过，69文件406测试、lint/全700文件format/build/Electron编译与Windows完整check/race通过。TASK-020设置导航子项可用，090/100/110/140整体仍未完成；商业、清理、安装/飞书保持待开发或待接入。项目transfer/storage契约请求见会话2已提交dbf28fa；新窗口现在可基于已集成181由会话2独立规划，不代表已经可用。
- 运行约定（启动前重新检查占用）：会话1 backend/frontend `31450/31451`，浏览器CDP `9240`，官方CDP `9242`；会话2 `31452/31453`、`9241`、`9243`。各自在自己的 `.cache/parity/<任务>/` 保存配置/DB/workspace/log/profile，BU_NAME 分别以 `parity-s1-` / `parity-s2-` 开头，desktop以 `MediaGoParityS1` / `MediaGoParityS2` 开头。会话1现用task-181缓存、MediaGoParityS1Task181官方desktop；主目录集成生产构建使用31456、`.cache/parity/s1-integration/server.yaml`和独立workspace。真实 workspace-v2 禁止访问；既有NLE/素材/用户官方实例不接管。冲突改号并记录。

- TASK-166 已完成：本轮新截图与源码复查、隔离官方体验、任务补项和资料收敛；结果与证据见 [复查索引](BASELINE-REVIEW.md)。产品整体仍未验收。
- NLE会话已实现 TASK-040 M1/M2/M3（`45fafa2`、`48ba31f`、`cdc01a6`）和 TASK-041 字幕/真实音频波形。浏览器、保存重启与实际导出文件验收通过，21文件100测试和前后端/剪映包完整门通过。原生剪映重开与字幕排版仍待验收，TASK-040/041不标整体完成；详情见 `.trellis/tasks/10-15-nle-workbench/result.md`。
- TASK-010 模型接入仍待评审；TASK-170~178 自动化新方案实施未定。豆包四会话方案仅参考，未启用额外 agent。

会话1集成质量补正唯一文件：`apps/workspace/src/pages/PromptPackEditor.test.tsx`，b8fc186→a7e5827将旧断言同步到既有inert契约并加强仅活跃层可交互检查。首次全量失败及AgentChat超时保留；两worker完整235文件1552测试通过，未改超时/删测试。详见selection-media-isolation归档；会话2组件实现/工作树未修改。

## 下一步与限制

1. TASK-181已完成8fc428b。TASK-070历史差异/安全恢复b7bc362→主c2261df已验收：并排/合并/导航、两次409不写入、取消/离线重试/恢复v6、空标签、页面和后端重启全文与六条历史保留。完整Windows check/race已通过。后续全文/源码/历史选择见第10/11项，070整体不完成。详见 `.trellis/tasks/archive/2026-10/10-16-document-history-parity/result.md`。GAP-004及旧外部无CAS客户端边界保留。
2. TASK-050本地安全f6eb85d→主6ad83ca已验收集成：真实创建/编辑/手动解决/删除、离线保留/刷新恢复/显式合并和非空v12后端重启通过；上下文和结束不误解决由边界测试覆盖。主270测试/前端门/Electron/嵌入构建及实际批注刷新/390px通过。真实Agent未发送，codex-acp缺失503，050整体不完成。结果见 `.trellis/tasks/archive/2026-10/10-16-comment-context-safety/result.md`。会话2项目文件夹打开9b46896/484631f已审阅集成580838e/d2ec9db。
3. TASK-070分镜正文/时间轴往返194b2e6→主2f171e4已验收：复用已有时间轴/NLE，去掉挂载隐式文档写入，加载/重验/失败无旧片段操作；实际v3全文/版本/历史3重启不变、NLE继续/放弃、离线编辑禁入和v4恢复通过。主66文件376测试、lint/full702-fileformat/build/嵌入Go构建通过，31456实际新分镜→时间轴→NLE→关闭通过。当前主运行mediago-server-timeline.exe；资源栏/引用及历史额外控件仍未完成。详见 `.trellis/tasks/archive/2026-10/10-16-document-timeline-roundtrip/result.md`。下一单项TASK-030/034素材聚合验收。
4. TASK-030/034本地素材聚合6cc7b90→主03cd506已验收：真实导入/非空目录重挂/元数据/文档引用/失败取消/后端重启，素材ID/hash及正文v2/历史2不变；034完成，030保留官方详情/筛选结构与真实生成采用差距，见对应归档result。主68文件448测试、前端门/Electron/嵌入Go构建通过；测试Router/旧按钮契约修正986ad37。主31456现运行mediago-server-assets.exe；实际导入/列表失败无旧操作/重试/重载及既有文档完整记录不变通过。会话2更新失败重试44e3fce/617a80d已集成1ec42e9/bef6713，实际390px设置导航→更新显示真实浏览器fallback。
5. TASK-181旧窗口发现补项已验收集成：b7c3d79→7ea7f4e、验收b43dee2→f2517ad、加载生命周期修复befb45c→e363a3c。用户允许后原隔离profile完整重开，三稿发现、原来源字节保留、实际JSON下载、失败重试/dirty拒绝/缺失文档、深浅短屏、显式合并v4及后端重启通过；主生产包真实多稿预览/取消/暂停载入/刷新和完整正文历史不变通过，97文件641测试、前端门/Electron/Windows build通过。结果见 `.trellis/tasks/archive/2026-10/10-16-prior-window-recovery/result.md`。主31456现运行mediago-server-recovery-ready.exe；9240已恢复。会话2原生新窗口8ccef8b仍未验收、未集成，需其自行Electron复验。项目导入/导出/新窗口归TASK-060/062；storage/transfer契约请求仍保留，安全导入服务尚未实现。

6. TASK-080音频缓存遗漏9c949f0→主a747a54及页面恢复验收0af4aa8→b776423已完成：先失败再3文件26测试通过；真实失败fixture在源页新标签冷加载/390px和主生产包刷新后保留完整prompt/status/error，错误详情展开及两环境跨项目空态隔离通过。未发送生成请求，不代表音频生成成功。结果见 `.trellis/tasks/archive/2026-10/10-16-audio-history-recovery/result.md`。主最新97文件641测试及前端门/Electron/Windows build通过。多轮遗留自有标签的HTTP/1.1 SSE占满导致请求超时；关闭已核实旧标签后加载恢复并重验，原失败保留，150/原生多窗口仍须考虑该限制。040/041仍缺剪映原生重开，150整体不完成。
7. TASK-080本地导入校验339e511→主90b07c9已验收，见history-import-validation归档。TASK-030任务来源项目隔离f2466dd→dd34016已验收：SQLite先失败、跨项目选择/取消选择及别名实际404零写，同项目采用/取消采用、重启全文/采用记录与真实素材引用增减通过；源完整Windows门/race、独立build及主97文件641测试/额外race/嵌入构建通过。主31456现运行mediago-server-selection.exe。结果见 `.trellis/tasks/archive/2026-10/10-16-selection-project-isolation/result.md`，含代理超时/离线失败及项目列表新增fixture导致旧整列表比较失败的完整记录；原任务逐ID全文不变。下一项核实直接素材ID来源边界，不发送生成请求；整体030/080/150仍未完成。会话2分支仍617a80d，无新增已验证提交。

GAP-004 保留未解决：旧共享测试 doc-ref-a 在 20:22:14 经 workspace_save 变更，调用来源尚未确认。原 baseline 失败不能用新隔离数据通过替代，不重置原文件。

8. TASK-030直接媒体来源隔离1e0099e→087932e已验收：缺失/外项目ID、URL、任务解析素材在写入前拒绝404；修复自动补标题后无法取消采用。实际同项目/全局双项目采用取消、双方完整正文历史/采用记录零写、重启及主生产包390px引用增减通过；完整Windows check/race、主235文件1552测试/前端门/Electron/嵌入构建通过。主31456现运行mediago-server-media.exe，结果见selection-media-isolation归档。下一项核实全局采用/历史downloadPath默认根目录投影；仅发现响应字符串，未访问默认目录。030/080/150整体仍未完成，会话2仍617a80d。

9. TASK-030配置根目录投影7c4a3c1→bcb2c6e已验收：全局历史/采用downloadPath与实际配置MediaDir一致，兼容旧相对根/项目/绝对路径；源和主实际重启完整记录不变、文件/content/复制hash一致、取消采用还原，真实图片预览通过。完整Windows门/race、前端门及3文件57测试、主额外race与嵌入构建通过。主31456现运行mediago-server-path.exe；原生目录对话框未验收，030/080/150整体不完成。见media-download-path归档；下一项TASK-070历史/源码/阅读视图。会话2仍617a80d，无新增已验证提交。

10. TASK-070历史全文阅读/精确源码d730d2a→3b88dab已验收：复用文档schema只读展示旧版全文及图片，源文件保留空白，视图切换不改变恢复目标或冻结基线；源离线/重试/取消/刷新及源主后端重启完整文档/版本/历史零写。源47文件266测试、主50文件309测试、前端门/full707format/Electron/嵌入构建通过，深浅/390px/短屏检查通过。见history-snapshot-views归档。首次跨项目直达documentId被提前规范化移除的导航问题另记，侧栏打开/同文档刷新正常，不修改会话2导航文件。

11. TASK-070历史选择f2afc4a→49f9a35已验收：官方实际Version1下拉/侧栏/恢复标签同步，箭头为装饰SVG，纠正此前“版本互换”推断。源主实际当前/旧版切换、精确源码、取消/刷新及后端重启完整记录不变；源离线禁用/恢复和390px菜单Escape焦点通过。主50文件310测试、lint/full707format/build/Electron/嵌入构建通过。主31456现运行mediago-server-history-selector.exe，见history-version-selector归档。下一项核实资源栏/引用重开；官方差异高亮阅读仍缺，070/150整体未完成。会话2仍617a80d，无新增已验证提交。

12. TASK-070只读资源摘要43c199a→bd6d803已验收：补接既有面板，真实两H2组/空态/开关/导航隔离、源离线失败重试及dirty保护、源主页面与后端重启完整文档历史/原始与解析时间轴零写。API无H2通用回退误显分镜组的真实失败已修，保留NLE后端行为。主50文件321测试、lint/full707format/build/Electron/嵌入构建及深浅/390px/短屏检查通过。主31456现运行mediago-server-resources.exe。见storyboard-resource-panel归档；官方开关/空态已补采，官方H2编辑后仍空且dirty，不宣称非空官方验收。完整资源操作/引用绑定、差异高亮阅读及070/150整体仍未完成；下一项核实官方差异高亮阅读。会话2仍617a80d。

13. TASK-070差异阅读e04969d→c80be16及短屏修正0ed2e08→28f2240已验收：复用服务端行差异，默认普通字体/行高亮，源码保留转义和空白；真实并排/合并/变更导航/失败重试/取消/刷新及源主后端重启完整记录零写。390×480重复版本列表收起，下拉保留全部选择；正文164px可见。主51文件323测试、前端门/full708format/Electron/嵌入构建通过，见history-reading-diff归档。主31456现运行mediago-server-history-reading-short.exe。官方逐词/Markdown转换仍未确证，完整资源操作/引用与070/150整体未完成；下一项080项目/全局历史隔离与本地统计核实。会话2仍617a80d。

14. TASK-080共享历史读取bfd9912→b266bc7已验收：SWR加载/刷新/错误状态直达界面，失败不显示旧操作，同key显式重试；真实本地图片导入在源项目/全局恢复、另一项目/类型隔离，主3条导入失败隐藏/恢复、取消/刷新及源主后端重启完整文档历史任务零写。主103文件711测试/前端门/full708format/Electron/嵌入构建通过，见history-scope-acceptance归档。主31456运行mediago-server-history-ready.exe。未发送生成请求；MediaGenerationWorkspace独立历史、用量/生成采用及080/150整体仍待验收。此前billing把3条media-library本地导入计成调用，已由下一单项修正。
15. TASK-080本地导入用量已验收：源`cbb5aaf`→主`910f3fb`，BillingRepository在聚合前排除内部`media-library`，保留真实零token供应商调用。真实源/主四分组、项目/类型/日期API及页面分组点击均显示零导入用量；完整Windows canonical check/race/build、主服务重启、文档/历史/任务完整记录和主页面恢复通过。结果见`.trellis/tasks/archive/2026-10/10-16-local-import-usage/result.md`。账单错误态无显式重试及移动端截断仍属会话2页面差距；MediaGenerationWorkspace独立历史、真实生成采用、040/041原生重开和150整体仍未完成。会话2仍`617a80d`。
16. TASK-080独立媒体历史读取`28cbee2`→主`346f4f7`已验收：真实分镜图片本地导入在源主失败时隐藏旧历史/动作，重复重试/恢复保持未保存提示词；延迟读取禁用刷新，取消重开/页面刷新及源主后端重启完整文档历史任务零写。主53文件400测试、前端门/full708format/Electron/嵌入Windows构建通过。主31456运行`mediago-server-media-history.exe`，源31450/31451。浏览器用新建本地测试tab；独立Edge9240重开仍未验收，自动审批曾拒绝后台启动。390px短屏历史控件无溢出，既有生成弹窗标题被挤窄；下一单项修复该标题与操作排布。真实生成采用、原生剪映重开与080/150整体未完成；会话2仍`617a80d`。
17. 生成弹窗窄屏标题`3e330de`→主`3216d97`已验收：小屏标题和操作分行，355/390CSS短屏标题完整、操作可达；源主真实历史/素材库入口、取消重开、预览Escape与完整文档历史任务不变通过。主3文件27测试、前端门/full708format/Electron/嵌入Windows构建通过。主31456现运行`mediago-server-modal-header.exe`；源Vite已停，后端31450仍独立运行。下一项TASK-030/150本地导入选入分镜结果与资源栏组合验收；不发送外部生成。会话2仍`617a80d`，原生窗口8ccef8b未验收不集成。

18. TASK-030/150本地采用往返`8187d88`→主`a1b079d`已验收：导入来源纠正为imported，显式取消不被旧文档同步覆盖，已持久化采用重开不重复写时间戳。源主73文件503测试、主全237文件1586测试/前端门/full708format/Electron/嵌入Windows构建通过；真实失败采用/恢复/取消失败回滚、资源栏往返及重启完整记录/hash通过。主首fixture坐标误触新建空分镜导致整文档基线失败，Network确认创建POST，失败数据保留；独立confirmed项目改用已核实DOM点击后完整项目记录零写通过，不抹去首轮失败。详见local-adoption-roundtrip归档result。主31456运行`mediago-server-adoption.exe`，源31450/31451；390CSS真实图片与标题/控件无溢出。030/080/150整体仍未完成；真实供应商生成、Agent503和原生剪映重开待验收/接入。下一项核实原生剪映验收环境与剩余030详情/筛选差距；会话2仍`617a80d`。

19. TASK-030真实图片尺寸`80d63f6`→主`8dc674f`已验收：本地PNG/JPEG/GIF头读取、旧素材补全保留时间戳、损坏文件不虚构尺寸；源完整Windows check/race及独立build、主media race/build/前端门/Electron/嵌入构建通过。源主实际详情/请求失败重试/390px/页面及后端重启，完整文档历史任务/素材记录和实际文件hash不变；见image-dimensions归档。主31456现运行`mediago-server-dimensions.exe`，源31450/31451。旧源采用fixture另发现同轮坐标误触新增空剧本`doc-1792118320610-0rgv57vd5osr`，整项目基线失败已补记，原正文版本历史不变，快照/失败状态保留。下一项核实素材浏览范围/使用状态/标签筛选；030/080/150整体仍不完成，原生剪映环境缺失，真实生成/Agent待接入。会话2仍`617a80d`。

20. TASK-030独立标签筛选`35472ef`→主`b6aa54e`已验收：复用已保存tags，独立于文件名/备注全文搜索，与其他条件取交集。源主实际保存/筛选/清空/Escape/失败重试/390×480及页面后端重启完整记录/hash通过；主237文件1591测试、前端门/full708format/Electron/嵌入构建通过，见asset-tag-filter归档。主31456运行`mediago-server-tag-filter.exe`，源31450/31451。官方59图确认独立输入入口，具体匹配规则采用已记录的去空白/大小写无关子串，不声称官方输入行为已实测。下一项浏览范围/使用状态及剩余详情；整体030/080/150未完成，会话2仍`617a80d`。

21. TASK-030包含子文件夹`a47441f`→主`4068f39`已验收：现有目录树/祖先路径派生子孙范围，保留项目隔离和直接目录默认；源主真实四文件嵌套目录父1→3/子2/根5、失败重试/取消/390×480滚动及重启完整记录与四文件hash通过。主3文件50测试/前端门/full708format/Electron/嵌入构建通过，见asset-folder-descendants归档。主31456运行`mediago-server-descendants.exe`，源31450/31451。本地使用独立BU_NAME=`parity-s1-local`，官方`parity-s1-filter-official`，勿再使用共享default的当前标签。官方新desktop=`MediaGoParityS1Filters`、CDP9242、独立task-030-filter-official配置，实际存储页确认路径，官方服务48273。真实下拉补采在本项evidence：范围目录/全部/收藏/回收站，使用状态已选用/候选/参考/未使用；标签实际input+datalist。下一项目录/全部范围；收藏/回收站/使用状态/其余详情及030/080/150整体未完成，会话2仍617a80d。

22. TASK-030目录/全部范围`eb7d272`→主`c1de8a9`已验收：全部复用当前scope数据跨目录显示、保留上传目录，侧栏导航回目录模式。源主实际全部5/标签0/失败0重试5/子目录1、390×480及页面后端重启完整记录与四hash通过；主3文件51测试/前端门/full708format/Electron/嵌入构建通过，见asset-browse-scope归档。主31456运行`mediago-server-browse-scope.exe`。既有后端列表上限200保留为分页差距，不宣称大库完整覆盖。下一项修复全局页来源筛选被projectMode忽略的实证缺陷；收藏/回收站/使用状态/其余详情及030/080/150整体未完成，会话2仍617a80d。

23. TASK-030全局来源筛选`9cc101c`→主`b514f6b`已验收：移除调用方projectMode忽略条件，保留media/selected既有语义与全局不取项目采用契约；源主实际1→selected0→media1、失败0/重试1/清空1、390×480及页面后端重启完整记录/hash通过。主3文件52测试/前端门/full708format/Electron/嵌入Windows构建通过，见asset-global-source-filter归档。主31456运行`mediago-server-global-source.exe`；独立confirmed采用fixture亦保持完整文档历史任务/解析章节/hash。脚本AX过早及重启固定等待过短的失败保留；浏览器进程本身重启未验收。下一项TASK-150本地制作组合验收，复用现有文档/本地导入/采用/NLE/导出；外部生成/Agent和原生剪映、收藏/回收站/使用状态/详情/大库分页仍未完成。会话2仍617a80d。

24. TASK-150本地制作组合`58f2bbf`→主`3f19c92`已验收：主独立项目通过UI创建剧本v3/分镜v6、导入真实本地MP4/WAV、按章节加入历史与imported采用、资源/时间轴/NLE往返、失败保存保留重试、真实音画/字幕/波形及1.700s视频/音频/文字草稿导出，取消零目录、同名冲突保留原文件。页面/后端重启完整两文档正文版本/双历史/素材目录/任务/采用/解析章节及上传、导出文件hash不变；390×480 NLE/导出可达。主完整237文件1595测试通过（331.35s），前端门/Electron/嵌入构建复用同产品提交b514f6b的已运行检查；后端未变，复用既有完整Windows门。见local-production-combination归档及纳管截图。Agent缺codex-acp503、无视频供应商、原生剪映未安装；独立Edge9240恢复再次被自动审批blocked by policy拒绝，owned标签使用DevTools聚焦和等待真实推进完成播放检查，浏览器进程重启仍未验收。整体150保持开发中；下一项官方来源分组（已实点确认六类），会话2仍617a80d。

25. TASK-030来源分组`e8f1aaa`→主`7fe1f6b`已验收：官方六类实际补采，依据真实physical/adoption来源分类，保留资源记录筛选，浏览器采集禁用待接入。源主3文件63测试、前端门/full708format/Electron/主嵌入Windows构建通过；主实际本地3/本地已选1/生成0、标签交集、失败0重试3/390×480及页面后端重启完整记录/hash通过。见asset-provenance-filter归档。主31456运行`mediago-server-provenance.exe`，源31450/31451。完整237文件1595测试为前一产品提交b514f6b，本项未重跑全量。下一项已确认的素材列表200项静默截断；收藏/回收站/使用状态/详情和整体030/080/150仍未完成。独立Edge9240启动仍被自动审批拒绝，浏览器进程重启不标通过；会话2仍617a80d。

26. TASK-030完整列表`67643ed`→主`dff25bd`已验收：移除无分页响应中的隐藏200项上限，保留global-only/project+global可见性。源完整Windows check（含全量race）及独立build、源主前端门/full708format/Electron、主媒体/仓储race与嵌入构建通过。源主独立201真实文件由UI扫描，修复前200/最早搜索0，修复后202含全局/文本本地201/最早搜索预览1；取消删除、标签、失败0重试1、390×480滚动和页面后端重启完整201记录/201hash与原全局/嵌套/标签及制作组合完整记录hash不变。见asset-complete-list归档。主31456运行`mediago-server-complete-list.exe`，源31450/31451。仍为O(N)全量加载，不宣称超大库分页/虚拟滚动已实现；整体030/080/150与原生/外部差距保留，会话2仍617a80d。下一项核实制作组合暴露的历史会话kind错误被误报500，按080范围处理本地失败契约。

27. TASK-080命名历史可选类型`c6e58f5`→主`9eec53e`已验收：省略kind读取既有会话类型，显式错误类型返回400，真实仓储故障保持安全500。源完整Windows canonical check/全量race及独立build、源主3文件78测试/前端门/full708format/Electron、主generation/handlers race及嵌入构建通过。源主真实双视频会话切换、失败0重试1、页面及后端重启完整记录/实际视频hash不变；主201文件/原全局嵌套标签/制作组合全文版本双历史采用及导出hash也不变。见history-optional-kind归档。主31456运行`mediago-server-optional-kind.exe`，源31450/31451。390×480工具箱侧栏占大半宽度，视频/供应商提示被挤窄，属于会话2AppLayout/App.tsx导航归属的未验收差距；源另有4条ResizeObserver通知，不能宣称console-clean。浏览器进程重启、原生剪映及外部生成/Agent仍未验收，整体080/150不完成。下一项核实素材使用状态的既有采用/引用数据与官方交集；会话2仍`617a80d`。

28. TASK-030使用状态筛选实现`d75fb62`→主`652cfc7`已集成，**界面待验收，不归档**。两素材列表可选`includeUsage=true`，新增只读`usage.selected/candidate/reference`布尔值（可重叠，全false为未使用），默认响应/持久化不变；项目统计当前项目，全局统计全局文件跨项目关系。采用软删/输出墓碑排除，本地导入追溯不误算参考，文档复用真实图片解析器，读取失败不声明未使用。源完整Windows canonical check/全量race及独立build、源主3文件66测试/前端门/full708format/Electron、主media/repository/app race与嵌入构建通过。源主真实四PNG/API隔离/无效参数400及后端重启完整记录hash通过；主201文件、双视频历史、原全局嵌套标签和制作组合完整记录/导出hash保护通过。源31450使用task-070/server.yaml，主31456运行`mediago-server-usage.exe`。隔离Edge原profile/CDP9240再次被自动审批以`blocked by policy`拒绝启动，用户已授权仍未恢复监听；真实菜单/失败重试/截图/窄屏/页面重开未运行，恢复条件是环境侧启动该已授权浏览器。见`.trellis/tasks/10-16-asset-usage-filter/result.md`。下一独立项080：项目+会话历史查询忽略会话条件（只读实际复现）；整体030/080/150仍未完成，会话2仍`617a80d`。

29. TASK-080项目/会话历史交集`b69d507`→主`d4d1710`已验收。源主旧版两路实际复现单会话返回2条及错误kind200；修复为显式会话与项目在分页前求交集，错误类型400，未知/外项目/清理为空项目不扩大读取，项目无会话仍聚合。源SQLite先失败两轮后通过，最终完整Windows canonical check/全量race及独立build、主generation/handler/repository race与嵌入构建通过。源主实际双本地视频两路查询/分页/未知项目及后端重启完整记录hash不变；主使用状态四PNG、201文件/all201hash、原全局嵌套标签与制作组合完整正文版本双历史/采用/导出hash保护通过。见history-project-session归档。主31456现运行`mediago-server-project-session.exe`，源31450同名final二进制、task-070配置，前端31451不变。无新UI，不声称浏览器切换/截图新验收；第28项使用状态菜单仍待Edge9240恢复，整体030/080/150及原生/外部边界保留，会话2仍`617a80d`。

## 已核实环境

| 用途         | 隔离目录与端口                                                         | 状态                                                  |
| ------------ | ---------------------------------------------------------------------- | ----------------------------------------------------- |
| NLE 专用     | `.cache/parity/s2-nle/`；31438/31439，Edge CDP9237                      | 隔离验收实例；后端mediago-server-accepted.exe，接管前核对进程/配置 |
| 素材目录验收 | `.cache/parity/task-163-isolated/`；31434/31435                        | 可按实际配置只读核对；旧 PID 不作为当前事实           |
| 本轮官方体验 | `.cache/parity/task-166/official-*`；独立 Windows desktop，曾用CDP9226 | 已关闭本项官方实例，补采见复查索引；不接管真实用户EXE |

历史TASK-166的31442/31443启动曾被自动审核拒绝，当轮未跑开发UI全量流程；不代表本次双会话运行失败。本次独立31450/31451和集成31456实际检查见上方各项。启动前仍需核对配置/进程；未执行的真实生成/登录/原生兼容性不得写成通过。
