# 当前交接

更新：2026-10-15。只保留活跃事实，历史见 [快照](HISTORY-HANDOFF-2026-10-15.md)。续作入口 [README](README.md)。

## 任务与协作

- 2026-10-15 双会话隔离：源码共同起点 `c5a173841473210ea1b100f83c4a6b11ef54cba7`；共同约定基线 `3265748c88f795bf8dc468b45eb83290e843e9a1` 已由双方同步（会话2并发先建于源码起点，随后自行快进约定提交）。主目录 `E:/AI/framegendev`（`codex/nle-export`）只做串行集成；会话1 `E:/AI/framegendev-wt/session-1` / `codex/parity-s1`；会话2 `E:/AI/framegendev-wt/session-2` / `codex/parity-s2`。不覆盖或重置已有分支；只合并对方已提交且有实际验证的独立项，不修改对方工作树/实例。
- 会话1负责 TASK-181 → 070/050/030/034/080（按真实依赖）、040/041剩余验收与150组合流程；拥有前端 `domains/documents/`、`generation/`、`episode/`、`agent/`、`pages/AssetLibrary.tsx` 及对应测试/后端 document/generation/episode/media/projectasset 服务。会话2负责项目管理、导航、设置、桌面与商业页；拥有 `domains/projects/`、`settings/`、`pages/Projects.tsx`、`pages/Settings.tsx`、`electron/`、`shared/desktop/`，以及对应后端 projects/settings/billing 服务与测试。TASK-010仍待评审，TASK-042及170~178不自动实施。
- `domains/workspace/` 不作整目录认领。会话1独占：`api/workspace.ts`、`api/media.ts`、`api/project-assets.ts`、`api/library-folders.ts` 及测试；`components/AssetLibraryButton*`、`AssetLibraryFolders.tsx`、`AssetLibraryMetadataEditor*`、`AssetLibraryScopes.tsx`、`NewDocumentDialog*`、`NewReferenceDocumentDialog*`、`GenerationNotificationButton*`、`GenerationConversationCreateDialog.tsx`、`AgentProjectCreateDialog.tsx`、`AgentWorkbenchTopBar*`、`ProjectDirectory.tsx`、`ProjectDirectoryTree*`、`directory/*`；`lib/asset-library*`、`lib/library-folders.ts`。会话2独占其余现有 workspace 组件（含 AppLayout/ProjectNavigator/ProjectWorkspaceShell/ProjectDocumentSearchDialog/WorkspaceUserMenu）与其测试及导航、路由描述/设置返回等 lib 文件。新增跨界文件先在本节登记。
- 公共文件唯一负责人为会话1：本交接、TASKS/REQUIREMENTS/DECISIONS/BASELINE-REVIEW、AGENTS自定义区、共享模型 `src/types/`、`router/`、`shared/components/ui/`、`shared/lib/`、`shared/stores/`、样式与依赖/锁文件、后端 `domain/`、`repository/`、`app/`、`http/routes/routes.go`、`service/workspace_state_service*`、`http/handlers/workspace.go`。会话2仅在自己任务目录记录结果/所需公共契约，通过独立提交供会话1读取；公共修改由会话1小提交提供契约。各自 Trellis 任务目录独立；公共日志由会话1串行维护。
- 公共契约更新（TASK-020，回应会话2 `8296b0e` 的 result）：`apps/workspace/src/App.tsx` 本项唯一写入人指定为会话2，仅限向既有 AppLayout 传入 `globalSettings={routeIsSettings && !projectWorkspace}`、相关导航 key/类型连接与必要回归；AppLayout 仍由会话2拥有。复用原窄屏抽屉，不将 projectWorkspace 全局化。会话1在会话2提交该修复前不编辑 App.tsx。共享 `services/server/internal/service/model/workspace.go` 归会话1；TASK-181增加可选 `expectedVersions` 原子校验契约，公共API小提交验收后提供。此处不授权TASK-010/042/170~178。
- 已读取会话2 `8296b0e`：TASK-020桌面导航20次点击/42测试/lint/build通过，但390px全局壳失败，保持开发中/不归档，暂不作为已验证项合并。修复后由会话1读取新result并组合验收。
- 运行约定（启动前重新检查占用）：会话1 backend/frontend `31450/31451`，浏览器CDP `9240`，官方CDP `9242`；会话2 `31452/31453`、`9241`、`9243`。各自在自己的 `.cache/parity/<任务>/` 保存配置/DB/workspace/log/profile，BU_NAME 分别以 `parity-s1-` / `parity-s2-` 开头，desktop以 `MediaGoParityS1` / `MediaGoParityS2` 开头。当前这些预留端口均空闲。真实 workspace-v2 禁止访问；既有NLE/素材/用户官方实例不接管。冲突改号并在本节记录。

- TASK-166 已完成：本轮新截图与源码复查、隔离官方体验、任务补项和资料收敛；结果与证据见 [复查索引](BASELINE-REVIEW.md)。产品整体仍未验收。
- NLE会话已实现 TASK-040 M1/M2/M3（`45fafa2`、`48ba31f`、`cdc01a6`）和 TASK-041 字幕/真实音频波形。浏览器、保存重启与实际导出文件验收通过，21文件100测试和前后端/剪映包完整门通过。原生剪映重开与字幕排版仍待验收，TASK-040/041不标整体完成；详情见 `.trellis/tasks/10-15-nle-workbench/result.md`。
- TASK-010 模型接入仍待评审；TASK-170~178 自动化新方案实施未定。豆包四会话方案仅参考，未启用额外 agent。

## 下一步与限制

1. TASK-181 已实现并通过隔离验收，待本次提交串行集成：409暂停/SSE与stream保护、窗口恢复稿、显式合并与备份重载、全量workspace可选CAS；双窗口/真实409/离线失败/下载/重启v7正文历史、232测试和前后端质量门通过。详见 `.trellis/tasks/10-15-document-conflict-protection/result.md`。不宣称 GAP-004 已解决，也不宣称旧外部无CAS客户端受保护。下一单项为TASK-070历史/视图。
2. TASK-030/034 新图聚合验收，以及 TASK-050 已有批注流程、TASK-080 本地生成历史与引用链路。按台账逐单项推进，优先复用现有实现。
3. 项目导入/导出/新窗口归 TASK-060/062；设置入口/存储/商业结构分归原任务。不要把参考候选清单当成缺失实现的事实。

GAP-004 保留未解决：旧共享测试 doc-ref-a 在 20:22:14 经 workspace_save 变更，调用来源尚未确认。原 baseline 失败不能用新隔离数据通过替代，不重置原文件。

## 已核实环境

| 用途         | 隔离目录与端口                                                         | 状态                                                  |
| ------------ | ---------------------------------------------------------------------- | ----------------------------------------------------- |
| NLE 专用     | `.cache/parity/s2-nle/`；31438/31439，Edge CDP9237                      | 隔离验收实例；后端mediago-server-accepted.exe，接管前核对进程/配置 |
| 素材目录验收 | `.cache/parity/task-163-isolated/`；31434/31435                        | 可按实际配置只读核对；旧 PID 不作为当前事实           |
| 本轮官方体验 | `.cache/parity/task-166/official-*`；独立 Windows desktop，曾用CDP9226 | 已关闭本项官方实例，补采见复查索引；不接管真实用户EXE |

新建开发实例 31442/31443 的 Start-Process 操作被工具自动审核拒绝（仅返回 blocked by policy），未启动；本轮没有开发 UI 全量端到端验收。启动前检查端口/进程/配置，复用被验收的本地二进制不代表当前后端源码已重新构建。入口与报告不能把未执行的 lint/build/真实生成/登录写成通过。
