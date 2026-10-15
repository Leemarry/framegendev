# 当前交接

更新：2026-10-16。只保留活跃事实，历史见 [快照](HISTORY-HANDOFF-2026-10-15.md)。续作入口 [README](README.md)。

## 任务与协作

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

## 已核实环境

| 用途         | 隔离目录与端口                                                         | 状态                                                  |
| ------------ | ---------------------------------------------------------------------- | ----------------------------------------------------- |
| NLE 专用     | `.cache/parity/s2-nle/`；31438/31439，Edge CDP9237                      | 隔离验收实例；后端mediago-server-accepted.exe，接管前核对进程/配置 |
| 素材目录验收 | `.cache/parity/task-163-isolated/`；31434/31435                        | 可按实际配置只读核对；旧 PID 不作为当前事实           |
| 本轮官方体验 | `.cache/parity/task-166/official-*`；独立 Windows desktop，曾用CDP9226 | 已关闭本项官方实例，补采见复查索引；不接管真实用户EXE |

历史TASK-166的31442/31443启动曾被自动审核拒绝，当轮未跑开发UI全量流程；不代表本次双会话运行失败。本次独立31450/31451和集成31456实际检查见上方各项。启动前仍需核对配置/进程；未执行的真实生成/登录/原生兼容性不得写成通过。
