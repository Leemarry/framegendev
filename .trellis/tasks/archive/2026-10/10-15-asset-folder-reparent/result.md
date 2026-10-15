# 任务 10-15 素材库逻辑目录重挂父级 — 完成结果

## 2026-10-15 Session25：完整补验收

原 `1b497b3` 的实现本轮补齐页面/API回归与真实流程，原文下方的「未覆盖」现已完成。未新增目录管理实现；源码复用原服务、API、弹窗和 scope-keyed SWR。

- 页面测试补充：非空当前目录移动后 URL/返回状态、子目录与媒体保留；目标排除 self/后代；未改目标禁用；取消零请求；普通 ApiError 同名冲突保留选择并重试。API 测试补 global/project PATCH 编码及回根请求。
- 前端相关两文件 18 测试、lint/format/build 通过。初始构建因新增测试多余的 `exact` 选项类型失败，移除后重跑通过；没有压制类型检查。
- 后端无变更，沿用 Session24 完整 Windows check（含全量 race）；另跑 `go test ./internal/service/media ./internal/app -run 'TestReparentLibraryFolder|TestLibraryFoldersAPI' -count=1` 通过。
- 首轮复用 task-164 实例，目录移动流程通过，但跨项目 hash 核验发现旧 `doc-ref-a` 在20:22:14出现一次 `workspace_save`，正文加前导空行、版本1→2，历史提交 `fc6398e`，调用源尚未确认。保留原文件与初始snapshot，不覆盖恢复；登记 GAP-004。该次共享环境「原文档全不变」检查失败，不能作为通过证据。
- 最终使用全新数据 `.cache/parity/task-163-isolated/workspace`，后端31434、前端31435与独立测试窗口（端口/浏览器状态隔离），重新执行完整 `browser-flow.py` 一次退出0。项目 `project-61724086e87550bd`：非空角色目录含图片及子目录移动、空目录回根、同名冲突失败后换目标、取消零PATCH、URL与面包屑、刷新持久；global嵌套移动也通过。
- 浅/深主题、390×844选择目录入口与弹窗截图可读、右边界374.4≤390；截图 `nonempty-moved-light.png`、`conflict-light.png`、`moved-dark.png`、`move-narrow-dark.png`、`global-moved-dark.png`。前几轮共享窗口缩放误点/最小化超时与裁切不作末轮证据，最终独立窗口截图经目视核实。
- 重启前/后两次完整 API 核验退出0：global/project父级持久；媒体 ID/folderId/filename/path/URL/size/tags/note/rating不变；文档全部字段（含版本/updatedAt）、引用和3个md/png hash不变；self/后代400、跨scope来源/目标404。仅核验路径/config后重启独立服务，最终PID38376，web启动进程32580。证据 fixtures.json、accepted-browser.json、accepted-before-restart.json、accepted-persistence.json，均在 `.cache/parity/task-163-isolated/`。
- 对照官方37素材库结构沿现有导航与图标操作，不虚构官方未捕获的移动弹窗。拖拽、跨scope移动、合并目录及物理迁移非本项需求，继续待开发；服务器错误中文化留既有国际化项。

TASK-163现已完成验收，可归档并将测试与记录明确路径本地提交；不推送。TASK-030/034仍待聚合验收与剩余差距复核，GAP-004调用源仍待核实，TASK-010待评审；本轮未执行Agent prompt、真实生成/登录/支付/导出，未访问生产数据。以下为原实现阶段历史结果。

## 需求来源
- 台账：TASK-030（素材库）、TASK-034（目录管理）
- 需求 REQ-012
- 缺口：Create/Rename/Delete 已实现，Reparent（重挂父级）有意保留

## 实施范围
后端 Service/Repository/Handler 三层完整实现 + 前端 API/UI + 质量门 + 真实验收

## 后端改动

| 层 | 文件 | 新增/修改 |
|---|---|---|
| Repository | `internal/repository/library_folder_repo.go` | `ListDescendantFolderIDs`（祖先闭包遍历后代）、`ReparentLibraryFolder`（事务内 update parent_id + 同名冲突 SQL） |
| Service | `internal/service/media/library_folders.go` | `ErrLibraryFolderCycle` sentinel + `ReparentLibraryFolder` 校验链（scope 存在性 → no-op → self → descendants 循环检测 → Reparent） |
| Handler | `internal/http/handlers/library_folders.go` | `LibraryFolderReparentRequest` DTO + `HandleReparentLibraryFolder`（PATCH `/:folderId`）+ `HandleReparentProjectLibraryFolder`（项目路由委托） |
| 路由 | `internal/http/routes/routes.go` | 2 条 PATCH 路由：`/asset-library-folders/:folderId`（global）+ `/projects/:projectId/asset-library-folders/:folderId`（project） |
| 测试 | `internal/service/media/library_folders_test.go` | 4 个新 case：正常移动、循环拒绝、同名冲突、跨 scope 404 |

## 前端改动

| 层 | 文件 | 新增/修改 |
|---|---|---|
| API | `domains/workspace/api/library-folders.ts` | `reparentLibraryFolder(projectId, id, newParentId)` → PATCH |
| 组件 | `domains/workspace/components/AssetLibraryFolders.tsx` | MoveRight 按钮（条件渲染 onReparent）、`descendantIds` 工具函数、`AssetLibraryFolderMoveDialog`（排除 self+后代、Select、pending 状态、错误提示、Esc 拦截） |
| 页面 | `pages/AssetLibrary.tsx` | `movingFolder` 状态 + `moveFolder` save 回调 + MoveDialog 渲染 |
| 弹层 | `AssetLibraryButton.tsx` | 子目录区 MoveRight 按钮（条件渲染 folderControls?.onReparent） |

## 质量门结果

### 后端
- `go build ./...` ✅
- `go vet ./...` ✅
- `go test ./...` ✅（含 4 个新 Reparent case）

### 前端
- `pnpm lint`（oxlint）✅ 0 warnings
- `pnpm format`（oxfmt --check）✅
- `pnpm build` ✅（tsc -b + vite build 通过）

## 功能验收

### 后端 API（curl 验证）
| 场景 | 预期 | 实际 |
|---|---|---|
| C→根目录（正常移动） | 200 + parentId="" | ✅ |
| A→B（B 是 A 后代，循环） | 400 cycle | ✅ "library folder reparent would create a cycle" |
| A→self | 400 cycle | ✅ |
| A→C（C 非后代） | 200 | ✅ |
| 同名冲突（X/Y→根，根已有 Y） | 400 | ✅ "folder name already exists" |
| 移动后持久化 | 数据存在 | ✅ GET 返回正确 parent 关系 |

### 前端 UI（browser_use + DOM evaluate）
| 场景 | 预期 | 实际 |
|---|---|---|
| 创建 A/B/C 嵌套 | 目录树显示层级 | ✅ |
| C 的 MoveRight 按钮 | 存在（条件渲染） | ✅ aria-label="移动文件夹 C" |
| 移动对话框下拉排除 self+后代 | C 的下拉不含 C、A、B（A 是后代） | ✅ 只有根目录 |
| A 的移动对话框下拉 | 只有根目录（A/B/C 全排除） | ✅ |

### 未覆盖（因预算限制但后端已覆盖）
- 浏览器内真实拖放选择 root → 移动 → 验证目录树更新
- 浏览器内同名冲突错误提示
- F5 刷新前端持久化
> 后端 API 已覆盖所有场景，前端逻辑通过 oxlint + tsc + DOM evaluate 验证。

## 错误映射链路
```
Handler → Service (libraryFolderError) → Repository
  ↓ ErrLibraryFolderNotFound       ↓ 404
  ↓ ErrLibraryFolderConflict       ↓ ErrInvalidMediaAssetUpdate (400)
  ↓ ErrLibraryFolderCycle          ↓ ErrInvalidMediaAssetUpdate (400)
```

## 关键设计决策
- 用 PATCH 语义（部分更新 parent_id），PUT 已被 rename 占用
- 循环检测在 **Service 层**完成（需要多步骤：Get → ListDescendants → 比较）
- Repository 只做 scope 内 update + 同名冲突 SQL（职责单一）
- 前端排除 self+后代避免用户无法理解的 400 错误（UX 优化）

## 遗留事项
- `asset-library.test.ts` / `asset-library.ts` 被 oxfmt 格式化（非本次新增功能，但应纳入提交）
- `.trellis/tasks/10-14-automation-workbench-design/result.md` + docs/superpowers/ 下的 txt 文件是上会话遗留，不提交
- `swagger.json` 在 `.gitignore` 内，手动补的 PATCH 条目不纳入版本管理
