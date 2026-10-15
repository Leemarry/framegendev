# 素材库逻辑目录重挂父级（Reparent Library Folder）— PRD

## 2026-10-15 续作范围校正

原实现已在 `1b497b3` 提交，但旧 result 缺真实 UI 提交、冲突、刷新证据，本轮只补齐此功能闭环。实际 global/project 均支持同 scope 嵌套目录；原文「global 只有根目录」为过时前提，不能用来限制验收。实际 API 是 PATCH 同一 folder 路由、body `{newParentId}`，folderId 身份不变，移动后 URL 保留原 ID，面包屑由最新树重算。循环目标在 UI 排除，直接 API 必须拒绝。Swagger 由 handler 注解生成，无手写 api/openapi.yaml。

首轮复用 task-164 的 31432/31433 时发现旧测试文档独立保存（GAP-004），完整保留旧数据，不作「原文档不变」通过。最终独立 `.cache/parity/task-163-isolated/workspace`、31434/31435 重跑全流程通过。验收包含当前非空目录及子目录移动、空目录回根、取消零 PATCH、冲突保留选择/重试、self/后代排除、scope 隔离、深浅/390px、刷新/重启与文件身份/hash/文档版本不变。真实生成与生产数据不在范围。

## 来源

- 台账 TASK-030/034（素材库开发中，重挂父级为剩余缺口）
- 需求 REQ-012（素材库数据与界面）
- 现状核实：后端 AssetLibraryFolderModel 已有 ParentID 字段，Create/Rename/Delete 已实现；Create 时校验 parent 同 scope 存在。后端 handler 注释明确 "parentId cannot be changed" 为有意缺口。前端 AssetLibraryFolders.tsx 每个 folder item 已有「重命名」「删除」按钮。

## 个人用户必要性

素材分类调整常见（从"草稿"移到"最终"，或反之）；空目录删除已完成，目录重命名已完成，"移动"逻辑上是目录管理的必需补齐项。**跨 scope 移动目录**本次不实施（后端现有逻辑目录全在同一 project scope 内；global scope 只支持根目录）。

## 范围

### 后端（services/server）

1. `internal/service/media/library_folders.go`
   - 新增 `ReparentLibraryFolder(ctx context.Context, projectID, id, newParentID string) (domain.AssetLibraryFolderModel, error)`
   - 校验链：
     - target folder 存在 + 同 scope（GetLibraryFolder）
     - 如果 newParentID 非空：target parent 同 scope 存在
     - **循环检测**：target parent 不能是自己或任何后代（避免 A→B→C→A 结构）
     - **同名冲突**：移动后同 parent 下不能已有同名 sibling
     - 更新 ParentID + updated_at
   - 错误码：404 不存在、400 循环/同名冲突、409 保留给物理层冲突
2. `internal/repository/library_folder_repo.go`
   - 新增 `ReparentLibraryFolder(ctx, folder, newParentID)` 事务实现
   - 新增后代查询辅助 `ListDescendantFolderIDs(ctx, projectID, ancestorID)` 用于循环检测
   - 事务内完成：get → 校验 → update
3. `internal/http/handlers/library_folders.go`
   - 新增 HandleReparentLibraryFolder + 路由注册（PUT/POST /api/v1/.../asset-library-folders/{id}/reparent 或类似）
4. OpenAPI spec 同步（api/openapi.yaml）
5. 单测：
   - 正常移动：根→子、子→根、保持同级换 parent
   - 同名冲突：同 parent 已有同名 → 400
   - 循环拒绝：A 不能挂到自己或后代；B 不能挂到 A（若 A 已挂 B）
   - 跨 scope 404
   - 不影响现有 DeleteLibraryFolder（重挂非空/空目录均应允许移动，Delete 只禁止非空删除）

### 前端（apps/workspace）

1. API 层：`reparentLibraryFolder(folderId, projectId, newParentId)`
2. `AssetLibraryFolders.tsx` 每个 folder item 操作按钮区（重命名、删除旁）加「移动」按钮
3. 移动 Dialog：同 scope 目录列表（用现有 ListLibraryFolders + 前端构建树），排除 self 和后代，选择目标 parent（含「根目录」选项）
4. 提交后：API 调用 → 刷新目录树 + 刷新当前目录内容；若当前目录被移动，更新 URL folderId（位置变了）
5. 单测 + 质量门（lint/format/build/相关 vitest）

## 不做

- **跨 scope 目录移动**：逻辑目录完全属于单一 scope；global scope 只有根目录。本次保持同 scope。
- **物理文件跟随目录移动**：当前 library_folder_id 只影响素材分类视图，物理文件在上传时已存入固定目录结构；这是独立主题。
- **拖拽式移动**：Dialog 选 parent 已足够；拖拽是增强。

## 验收标准

### 后端质量门
- `go build ./...` 通过
- `go vet ./...` 通过
- `golangci-lint run ./...` 通过
- `go test -race ./...` 通过（含新增 ReparentLibraryFolder 单测）
- `task check` + `task test` 均 exit 0

### 前端质量门
- `pnpm lint`（oxlint）通过
- `pnpm format`（oxfmt --check）通过
- `pnpm build` 通过
- 相关 vitest（AssetLibraryFolders 测试）通过

### 功能验收（真实浏览器 31431 + 31430）
1. 创建嵌套目录 A/B/C，移动 C→根目录、B→A 成功；面包屑/URL 正确刷新
2. 移动 A→B（B 是 A 后代）→ 循环拒绝，UI 显示后端错误文案
3. 移动 A→A（自己）→ 循环拒绝
4. 目录 X 下已有同名 Y，移动 Z→X（Z 原在别处）→ 同名冲突 400
5. 刷新后重挂结果持久化
6. 深/浅主题样式正常，窄屏按钮可达
7. 空/非空目录均可移动（与空目录删除不同）
8. 跨 scope 操作（直接 API 调用）→ 404

## 边界与风险

- **循环检测**：每次重挂都要 O(descendants) 代价，对中等规模目录（<1000 folder）可接受。后续可考虑路径闭包优化，当前用 ListDescendantFolderIDs 足够。
- **同名冲突**：沿用 RenameLibraryFolder 的 sibling 唯一性 SQL 模式。移动场景下冲突更常见（用户可能就是想合并同名），本次明确拒绝并提示，后续可扩展为"合并目录"能力（独立功能）。
- **删除行为不变**：重挂后目录非空仍不能 Delete；空目录仍可 Delete。两个操作独立。
