# 素材引用关联详情（Asset Reference Detail）— PRD

## 来源

- TASK-030 / TASK-034 剩余缺口：重挂父级已完成（TASK-163, `1b497b3`），剩「物理扫描」与「关联详情」。
- 需求 REQ-012（素材库：项目/全局、文件夹、导入、标签、备注、评分、排序、筛选、详情）。
- 历史记录：`10-14-global-asset-library-page/result.md`（"评分排序/筛选增强和素材关联详情待补"）、`10-15-asset-rating-filter-sort/result.md`。

## 为什么选它（而不是物理扫描）

只读核实结论（`.trellis/tasks/10-14-official-0-1-17-parity/research/asset-library-next.md`）：
- 物理扫描需要新契约（扫描目标目录范围、路径去重、文件丢失/变更处理），且现有 `projectasset/local_file_sync.go` 的 `scanProjectWorkAssetFiles` 只扫 project work、跳过 Markdown、写 `project_reference_assets`，直接复用会混用文档目录与素材目录并改写元数据。**风险高、需独立设计**，留作后续单项。
- 「关联详情」可直接复用**既有数据表**，无需新增 schema、无物理文件操作、可真实端到端验收。**选为本单项。**

## 数据来源（已按真实写入路径核实，修正原前提）

原稿曾假设"选入资源"写入 `project_reference_assets`，经全仓核实**不成立**。真实的项目侧引用来源只有一处：

| 语义 | 数据表 | 写入方 | 说明 |
|---|---|---|---|
| 选入资源 | `project_selected_assets` | `generation` 服务 `projectSelectedAssetModelFromRequest` | `AssetID = firstNonEmpty(MediaAssetID, libraryAssetIDFromGenerationAssetURL(URL))`；行含 `ResourceTitle`/`ResourceType`/`SortOrder`，软删除 `gorm.DeletedAt` |

`project_reference_assets` 虽也有 `asset_id` 索引，但其两处生产写入方（`projectasset/store.go`、`projectasset/local_file_sync.go`）都设 `AssetID = 该行自身 ID`（自引用）；而媒体素材与项目资源条目是 `assets` 表里**互不重叠**的两类行。因此对媒体素材 ID 查询 `project_reference_assets` 恒为空——已用隔离实例实测确认（见 result.md）。若纳入该来源，就是只在数字上"成功"、实际永不命中的死分支，故**本项不含该来源**。

结论：媒体素材 → 项目的真实关联只有 `project_selected_assets` 一条。只查 `project_reference_assets`（原稿方案）会让接口对媒体库素材几乎恒空，属于"用模拟成功冒充可用"，因此本项改为只覆盖 `project_selected_assets`。

## 个人用户必要性

素材可被项目选入为资源（"选入资源"）。`project_selected_assets` 行有 `OnDelete:CASCADE`：直接删除媒体素材会静默移除项目侧引用。个人用户先看到"该素材被哪些项目选入"再决定是否删除，是真实可用的防误删能力。

## 范围

### 后端（services/server）

1. `internal/repository/media_repo.go`
   - 新增 `ListProjectSelectedAssetReferences(assetID string) ([]domain.ProjectSelectedAssetModel, error)`（查 `project_selected_assets.asset_id`，索引已存在）。
2. `internal/repository/workspace_repo.go`
   - 复用既有 `GetProject` 解析项目名，不新增方法。
3. `internal/service/media/references.go`（新增）
   - `ListAssetReferences(assetID string) (MediaAssetReferencesResponse, bool, error)`：组装 `{ projectId, projectName, resourceTitle, resourceType, sortOrder, createdAt, updatedAt }`；素材不存在 → `found=false`（handler 答 404）；按 `ProjectID → SortOrder` 稳定排序。
4. `internal/http/handlers/media.go`
   - 新增 `HandleMediaAssetReferences`：`GET /api/v1/media-assets/:assetId/references`。
   - 项目 scope 委托路由：`GET /api/v1/projects/:projectId/media-assets/:assetId/references`（同既有 Rename/Delete/Reparent 委托模式）。
5. `internal/http/routes/routes.go`：注册上述两条 GET。
6. `api/openapi.yaml` + `.cache/server-swagger/swagger.json` 同步新增路由（网络不可用时手动补缓存条目，同 TASK-163 做法）。

### 前端（apps/workspace）

1. `domains/workspace/api/media.ts`：新增 `getMediaAssetReferences(assetId)` + SWR key。
2. `domains/workspace/components/AssetLibraryButton.tsx` 的 `AssetLibraryPreview`：
   - 新增「引用」区块：加载中 / 无引用（"未被任何项目引用"）/ 列表（项目名 + 路径面包屑）。
   - 复用现有主题 token 与排版（`text-muted-foreground`、`text-error-foreground` 等），不使用 hex/rgb。
   - 失败时展示错误文案，不假装成功。
3. 删除确认（可选，仅当不增加复杂度时）：在 `AssetLibraryPreview` 的删除按钮上，当引用数 > 0 时给出提示文案。若无既有确认弹窗则**不做**，保持单项最小化。

## 不做

- 物理目录扫描（独立契约，另项）。
- 扫描文档正文查找素材 URL 级引用（Markdown 内嵌，需全文检索，另项；本项只覆盖 `project_selected_assets` 既有行）。
- `project_reference_assets`（项目资源条目自引用表，对媒体素材 ID 恒不命中，见"数据来源"）。
- 删除/级联策略改动（保持现有行为）。
- 跨 scope 语义改动；global scope 素材的引用列表与 project scope 采用同一查询。

## 验收标准

### 后端质量门
- `go build ./...`、`go vet ./...`、`go test ./...` 通过（含新增 repository/service 单测）
- 新增单测覆盖：有引用（多项目）/无引用/素材不存在（404 或空列表语义，需在实现中定死并测试）

### 前端质量门
- `pnpm lint` 0 error、`pnpm format`（oxfmt --check）通过、`pnpm build` 通过
- 相关 vitest（`AssetLibraryButton.test.tsx`、`media` API 测试）通过

### 功能验收（隔离实例：独立数据目录 + 独立端口，不动真实 workspace）
1. 在隔离项目里"选入"一个素材 → 素材库预览面板显示该项目名与资源标题/类型。
2. 同一素材被两个项目引用 → 列表显示两条。
3. 未被引用的素材 → 显示"未被任何项目引用"。
4. 不存在/已删除的素材 ID → 前端展示失败文案，不崩溃。
5. 刷新后引用列表持久（数据来自 DB，不是前端状态）。
6. 深/浅主题样式正常，窄屏可读。
7. 原四篇文档 hash/version 不变；不使用 `%APPDATA%\mediago-drama\workspace-v2` 真实数据。

## 边界与风险

- 本项语义是"该素材被哪些项目选入"，不等价于"文档正文引用"。PRD 明确本项语义，避免过度宣称。
- global 素材（`projectId=""`）通常不会被任何项目引用 → 空态是正确结果，不是缺陷。
- 引用列表为只读；不新增写接口。
- 软删除的 `project_selected_assets` 行由 Gorm 自动过滤，不计入引用。

## 交叉引用

- 上游：TASK-030、TASK-034、REQ-012
- 前置完成：TASK-162（`512f637`）、TASK-163 重挂父级（`1b497b3`）
- 后续待开发：物理扫描、文档正文级引用检索
