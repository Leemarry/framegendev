# 结果：素材目录物理扫描（刷新）

任务：`10-15-asset-library-scan`（TASK-165，父任务 TASK-030/034，需求 REQ-012）
状态：已完成并真实验收（后端 + 前端 + 隔离实例真实浏览器）。按 DEC-029 本地提交，不推送。

## 实际改动

### 后端（`services/server`）

- `internal/service/shared/asset_files.go`：新增共享能力 `DetectFileMIMEType`（先按扩展名，再嗅探前 512 字节）与 `ShouldIgnoreAssetEntry`（`.` 开头、`.ds_store`、`thumbs.db`、`~`/`.tmp`/`.temp`/`.swp`/`.part`）。
- `internal/service/projectasset/local_file_sync.go`：两个原有私有实现改为委托 `shared`，删除重复代码与不再使用的 import。
- `internal/repository/media_repo.go`：新增 `ListMediaAssetsInScope(projectID)` —— `project_id IS NULL`（全局）或 `project_id = ?`（项目）的**精确 scope** 列表（既有 `ListMediaAssets` 对项目 scope 会并入全局行，不能用于物理路径比对）。
- `internal/service/media/scan.go`（新增）：`MediaAssets.Scan(ctx, projectID, folderID)`，`MediaAssetScanResult{scanned, added, updated}`。
  - 复用 `CheckLibraryScope` / `GetLibraryFolder` 做 scope 归属校验，失败映射 `ErrLibraryFolderNotFound`；根目录不存在返回零结果。
  - `WalkDir` 遍历该 scope 素材根（项目 → `ProjectLibraryAssetsDir`；全局 → `store.dir`/`LibraryAssetsDir`/`defaultMediaDir`），忽略项跳过、`seen` 去重、`shared.DetectFileMIMEType` + `shared.KindFromMIMEType` + `isSupportedMediaAssetKind` 过滤。
  - 与数据库**同 scope 精确**行按 `relPath` 比对；新文件新建行（`source=imported`、`storageStatus=ready`、`createdAt/updatedAt`=请求时刻、`url=/api/v1/media-assets/<id>/content`）。
- `internal/service/media/store.go`：常量 `MediaSourceImported = "imported"`；请求体 `MediaAssetScanRequest{FolderID}`。
- `internal/http/handlers/media.go`：`HandleScanMediaAssets`（`decodeOptionalJSON`；`ErrLibraryFolderNotFound`→404 其它→500）；`HandleScanProjectMediaAssets` 委托前者；含 Swagger 注解。
- `internal/http/routes/routes.go`：注册 `POST /api/v1/media-assets/scan`（L113）与 `POST /api/v1/projects/:projectId/media-assets/scan`（L294）。
- `.cache/server-swagger/swagger.json`（未跟踪缓存）：手工补两条新路由条目（网络不可用无法重跑 swag）。

### 前端（`apps/workspace`）

- `src/domains/workspace/api/media.ts`：新增 `MediaAssetScanResult`、`mediaAssetsScanPath(projectId?)`、`scanMediaAssets(projectId?, folderId?)`。
- `src/domains/workspace/components/AssetLibraryButton.tsx`：`refresh` 改为「先 `POST scan`，再重取素材/文件夹/已选资源/文档」，成功 toast「素材已刷新 新增 X，更新 Y，共扫描 Z」，失败沿用原错误提示；页面空态补官方文案「导入文件，或把文件放入素材目录后刷新。」（无筛选时显示）。

### 测试

- 后端：`internal/service/media/scan_test.go`（新增 4 个用例：登记+忽略项+幂等+元数据变更、非 imported 显示名保留、scope 隔离、缺失 scope/folder 报错）；`internal/repository/media_repo_test.go`（新增 `ListMediaAssetsInScope` 精确性）。
- 前端：`src/domains/workspace/api/library-folders.test.ts`（新增 scan 路径与请求断言）；`src/pages/AssetLibrary.test.tsx`（空态文案断言、刷新触发扫描断言；并补齐 media mock 缺失的 `mediaAssetReferencesPath`/`getMediaAssetReferences`，修复该文件 2 项**预存失败**）。

## 关键修正（实施中发现并纠正）

原 PRD 契约「已存在项仅当 mime/size/filename 变化时更新」在实测中暴露缺陷：上传/生成素材盘上存储名是 `<assetId>.<ext>`，而 `filename` 存的是用户可见标题，逐次扫描会把标题覆盖为存储名（隔离实测首次即 `updated=2`，标题 `lonely.png`→`asset-*.png`）。修正为 **`filename` 仅对 `source=imported` 的素材同步磁盘文件名**，其余来源绝不覆盖（PRD 契约与单测同步更新）。

## 验证证据

- 后端质量门：`go build ./...`（0）、`gofmt -l ./internal`（无输出）、`go vet ./internal/...`（无输出）、定向 `go test ./internal/service/media/... ./internal/service/projectasset/... ./internal/service/shared/... ./internal/repository/... ./internal/app/... ./internal/http/...`（全 ok）。
- 隔离实例（后端 31432，工作区 `.cache/verify/workspace`，**未触碰** `%APPDATA%\mediago-drama\workspace-v2`）API 实测：
  - 全局扫描：`scanned=2 added=1 updated=0`；忽略项（`.hidden.png`/`thumbs.db`/`half.tmp`/`blob.bin`）未登记；二次 `added=0 updated=0`；改文件大小后 `updated=1`；上传资产标题 `lonely.png` 被保留。
  - 项目扫描：`scanned=1 added=1`（`proj-a.png`）；末次全局扫描 `added=0`，全局列表不含项目文件（scope 双向隔离）。
- 前端质量门：`pnpm lint`（0）、`pnpm format`（All matched files use the correct format）、`pnpm build`（成功）、定向 vitest 31/31 通过。
- 真实浏览器（31433 前端 + 31432 后端，`localhost`）：
  - 项目页刷新：登记新增 1 个文件（页脚 2→3），toast 精确文本「素材已刷新 新增 1，更新 0，共扫描 3」，新素材 `browser-probe2.png` 出现；整页 reload 后仍在。
  - 深色主题：标题与素材名在深色背景可读。
  - 全局空态：显示标题「这里还没有素材」与文案「导入文件，或把文件放入素材目录后刷新。」

## 遗留（明确留待后续，不在本项范围）

- 磁盘文件丢失/删除清理与 `storageStatus=missing` 标记。
- 物理子目录 → 逻辑文件夹自动映射。
- 文档正文（Markdown 内嵌 URL）级引用检索 —— TASK-030/034 剩余项。
- 自动定时/监听式扫描（本项仅用户点「刷新」触发的按需扫描）。
- `10-15-asset-folder-reparent` 任务目录仍为 `in_progress` 未归档（上会话遗留，非本项范围）。
