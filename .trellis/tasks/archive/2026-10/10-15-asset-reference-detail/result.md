# 任务 10-15 素材引用关联详情 — 完成结果

## 需求来源
- 台账：TASK-030（素材库）、TASK-034（素材文件夹数据/API）
- 需求 REQ-012（素材库：项目/全局、文件夹、导入、标签、备注、评分、排序、筛选、详情）
- 缺口：TASK-162（删除 + 评分筛选排序，`a0f1dd8`）、TASK-163（重挂父级，`1b497b3`）后，剩「物理扫描」与「关联详情」

## 为什么选「关联详情」而不是「物理扫描」
只读核实（`.trellis/tasks/10-14-official-0-1-17-parity/research/asset-library-next.md`）：物理扫描需新契约（扫描范围、路径去重、丢失/变更处理），且复用 `projectasset/local_file_sync.go` 会混用文档目录与素材目录并改写元数据，风险高、需独立设计。「关联详情」只读复用既有数据表，无新 schema、无物理文件操作，可真实端到端验收。

## 数据来源（修正原 PRD 前提）
原稿假设「选入资源」写入 `project_reference_assets`。全仓核实后**不成立**：
- `project_reference_assets` 两处生产写入方（`projectasset/store.go`、`projectasset/local_file_sync.go`）都设 `AssetID = 该行自身 ID`（自引用）；且它与媒体素材是 `assets` 表里互不重叠的两类行 → 对媒体素材 ID **恒不命中**。
- 真正的「选入资源」写的是 `project_selected_assets.asset_id`，写入方 `generation` 服务 `projectSelectedAssetModelFromRequest`（`AssetID = firstNonEmpty(MediaAssetID, libraryAssetIDFromGenerationAssetURL(URL))`），行含 `ResourceTitle`/`ResourceType`/`SortOrder`，软删除 `gorm.DeletedAt`。

若照原稿实现，接口对媒体库素材几乎恒空 = 「用模拟成功冒充可用」。故**本项只覆盖 `project_selected_assets` 单源**，删除了 `project_reference_assets` 分支与 `kind/folderId/parentId` 字段。

## 实施范围
后端 Repository/Service/Handler/路由三层完整链路 + 前端 API/UI + 质量门 + 隔离实例真实浏览器验收

## 后端改动

| 层 | 文件 | 新增/修改 |
|---|---|---|
| Repository | `internal/repository/media_repo.go` | 新增 `ListProjectSelectedAssetReferences(assetID)`（查 `project_selected_assets.asset_id`，`updated_at DESC`；索引已存在） |
| Service | `internal/service/media/references.go`（新增） | `MediaAssetReference`/`MediaAssetReferencesResponse` 类型 + `ListAssetReferences(assetID) (resp, found, err)`：素材不存在 → `found=false`（handler 答 404）；`GetProject` 解析项目名（失败直接返回错误，FK 保证项目存在）；按 `ProjectID → SortOrder` 稳定排序 |
| Handler | `internal/http/handlers/media.go` | `HandleMediaAssetReferences`（GET `/:assetId/references`）：空 ID→400、service 错误→500、`!ok`→404 `media asset not found`；`HandleProjectMediaAssetReferences`（项目 scope 委托，同既有 Rename/Delete/Reparent 委托模式） |
| 路由 | `internal/http/routes/routes.go` | 2 条 GET：`/media-assets/:assetId/references`（global）+ `/projects/:projectId/media-assets/:assetId/references`（project） |
| 测试 | `internal/repository/media_repo_test.go` | `TestMediaAssetRepositoryListsReferences`：活引用返回、软删除被过滤、他 asset 不串、无引用为空 |
| 测试 | `internal/service/media/asset_references_test.go`（新增） | `TestListAssetReferencesReportsProjectUsages`（2 项目 + 软删过滤 + 顺序 + 项目名）、`TestListAssetReferencesReportsMissingAsset`（found=false） |

Swagger：由 `swag` 从 handler 注解生成，网络不通时按 TASK-163 既定做法手动补 `.cache/server-swagger/swagger.json`（该缓存未被 Git 跟踪）；`internal/app` 的 `TestDevelopmentDocsRoutes` 已通过（每条注册路由都在 swagger 中有 summary+tags）。

## 前端改动

| 层 | 文件 | 新增/修改 |
|---|---|---|
| API | `domains/workspace/api/media.ts` | `MediaAssetReference`/`MediaAssetReferencesResponse` 类型、`mediaAssetReferencesPath(assetId, projectId?)`（无 id→null；有 project→`/projects/{p}/media-assets/{id}/references`，否则 `/media-assets/{id}/references`）、`getMediaAssetReferences(assetId, projectId?)` |
| 组件 | `domains/workspace/components/AssetLibraryButton.tsx` | `AssetLibraryPreview` 中新增 `AssetLibraryReferences` 子组件（`AssetTagList` 之后、folder actions 之前）：四态 = 加载中（「正在读取引用」）/错误（`text-error-foreground` + 失败文案）/空（「未被任何项目引用」）/列表（项目名 + 资源标题或类型）；全部使用主题 token，无 hex/rgb；长名 `min-w-0` + `truncate` |
| 测试 | `domains/workspace/components/AssetLibraryButton.test.tsx` | media 模块 mock 补 `getMediaAssetReferences` + 等价 `mediaAssetReferencesPath`；`beforeEach` 默认 resolve `{ references: [] }`；新增 `reference(...)` helper；新增 3 用例：列出两个项目引用、无引用空态、请求失败不假装成功 |
| 测试 | `domains/workspace/api/library-folders.test.ts` | 新增引用路由断言（asset scope / project scope / 无 id 为 null） |

## 质量门结果

### 后端
- `go build ./...` ✅（EXIT=0）
- `gofmt -l ./internal` ✅（无输出）
- `go vet ./internal/...` ✅（EXIT=0）
- `go test ./internal/repository/... ./internal/service/media/... ./internal/app/...` ✅（全部 `ok`）

### 前端
- `pnpm lint`（oxlint）✅ 0 warnings / 0 errors
- `pnpm format`（oxfmt --check）✅
- `pnpm build`（tsc -b && vite build）✅
- 定向 `pnpm exec vitest run --no-file-parallelism AssetLibraryButton.test.tsx library-folders.test.ts` ✅ 2 files / 19 tests passed

> 说明：全量 `pnpm test` 曾报 `JavaScript heap out of memory`（机器同时跑 2 个服务 + 构建），改用 `--no-file-parallelism` 顺序运行；`ProjectNavigatorProjectPanels.test.tsx` 10 项失败经 `git stash` 在已提交基线上复现同样失败（`useLocation() may be used only in the context of a <Router>`，堆栈指向基线第 182 行），确认是**预先存在的失败，与本次改动无关**。

## 功能验收

### 后端 API（隔离实例：数据目录 `e:\AI\framegendev\.cache\verify\workspace`，端口 31432，未触碰 `%APPDATA%\mediago-drama\workspace-v2`）
| 场景 | 预期 | 实际 |
|---|---|---|
| 同一素材被两个项目选入 | 返回两条、项目名正确 | ✅ `asset-4a2fd9a774a0dc1e` → 项目甲/主角/character + 项目乙/场景/scene |
| 项目 scope 路由 | 与 global 一致 | ✅ `/projects/{A}/media-assets/{id}/references` 返回同样两条 |
| 项目资源条目 ID（`project_reference_assets` 自引用行） | 空（印证恒不命中） | ✅ `asset-d85e48b65312f644` → `{"references":[]}` |
| 不存在 ID | 404 | ✅ `GET /media-assets/nope/references` → 404 `media asset not found` |

### 前端 UI（browser_use，前端 31433 + 后端 31432）
| 场景 | 预期 | 实际 |
|---|---|---|
| `/assets?scope=all` 预览被两项目引用的 probe.png | 显示「引用（2）」+ 项目甲/主角 + 项目乙/场景 | ✅ 截图 step3-probe-png-detail-panel.png |
| 预览无引用的 lonely.png | 显示「未被任何项目引用」，无「引用（2）」 | ✅ 截图 step4-lonely-empty-state.png |
| 刷新页面后重新预览 probe.png | 引用仍在（来自 DB 持久化） | ✅ 截图 reload-probe-references.png |
| 深色主题（`app.theme.v1=mode:dark`，`documentElement` 含 `class="dark"`） | 文字对比清晰可读 | ✅ 截图 dark-theme-references.png |

### 未单独像素验证
- 窄屏可读性：由 `min-w-0` + `truncate` 与主题 token 保障，未单独做窄屏截图。

## 关键设计决策
- **单源**：只查 `project_selected_assets`；`project_reference_assets` 对媒体素材 ID 恒不命中，纳入即死分支。
- `GetProject` 失败**直接向上返回错误**：`project_selected_assets.project_id` 有 FK 约束，「项目不存在」不可达，不为不可能场景加防御。
- 素材不存在用 `found=false`（而非返回空列表）让 handler 明确答 404，避免「不存在」与「无引用」混淆。
- 项目 scope 路由直接委托 global handler，与既有 Rename/Delete/Reparent 委托模式一致。

## 遗留事项
- 物理目录扫描（独立契约，另项）。
- 文档正文级引用检索（Markdown 内嵌 URL，需全文检索，另项）。
- `services/server/mediago-server.exe`、`services/server/server.log` 为构建/运行产物，未跟踪且未在 .gitignore 内，本次提交不纳入。
- `.trellis/tasks/10-14-automation-workbench-design/result.md` 与 `docs/superpowers/specs/2026-10-14-automation-workbench/*.txt` 为上会话遗留，不在本项提交范围。
