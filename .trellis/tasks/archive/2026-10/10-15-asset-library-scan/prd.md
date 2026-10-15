# 素材目录物理扫描（刷新）

## Goal

让素材库「刷新」按钮真正扫描素材目录（项目/全局），把磁盘上新增的媒体文件登记为素材、同步已存在素材的元数据，再重取列表；并补齐官方空态提示文案「导入文件，或把文件放入素材目录后刷新。」

## 来源与必要性

- 需求：REQ-012（素材库：项目/全局、文件夹、导入、标签、备注、评分、排序、筛选、详情），台账 TASK-030 / TASK-034。
- 官方证据：`E:\AI\mediago-gap-shots\exe-flow\30-ws-assets-lib.png` —— 顶部有「刷新」图标按钮；空态正文为「导入文件，或把文件放入素材目录后刷新。」说明「把文件放进素材目录再刷新」是官方真实行为。
- 当前差距（只读核实）：
  - `apps/workspace/src/domains/workspace/components/AssetLibraryButton.tsx` 的 `refresh` 只调用 `mutateMediaAssets()` / `mutateSelectedAssets()` / `mutateDocuments()`，即重新拉取数据库列表，**不扫描磁盘**。
  - 后端 media 领域没有任何 `WalkDir` 扫描（全仓 `WalkDir` 命中仅在 `app/workspace_file_watcher.go`、`service/document`、`service/projectasset`、`service/shared`）。`workspace_file_watcher` 只监听项目 `work` 目录并同步 Markdown 文档，不监听 `library/`。
  - 因此用户把文件放进素材目录后点刷新，列表不会出现该文件 —— 与官方文案不符。
- 个人用户必要性：个人用户常用资源管理器往素材目录拷贝参考图/音频/视频，再在应用内使用；不实现则该官方入口是空壳。

## 物理位置（已核实）

- 全局素材根：`shared.WorkspacePathsFor(workspaceRoot).LibraryAssetsDir()` = `<workspaceRoot>/library`（`MediaAssets.dir` 即此）。
- 项目素材根：`shared.ProjectLibraryAssetsDir(projectDir)` = `<projectDir>/library`。
- 上传/生成文件落盘在 `<根>/library/<YYYY-MM-DD>/`；`domain.AssetModel.RelPath` 约定为 `library/...`（`assetFilePath` 反向拼接、`mediaAssetDBRelPath` 正向计算）。
- 文档工作目录是项目 `work/`，与 `library/` 分离 —— 扫描 `library/` 不会混入文档目录（回应 `research/asset-library-next.md` 的风险点）。

## 范围（本次实现）

1. 后端 `POST /api/v1/media-assets/scan` 与 `POST /api/v1/projects/{projectId}/media-assets/scan`（项目 scope 委托 global handler，沿用既有委托模式）。
2. Service `MediaAssets.Scan(projectID, folderID)`：
   - 解析该 scope 的素材根目录，`filepath.WalkDir` 遍历；
   - 跳过忽略项（`.` 开头、`.ds_store`、`thumbs.db`、`~`/`.tmp`/`.temp`/`.swp`/`.part` 结尾）；
   - 用 `shared.DetectFileMIMEType` 判定类型，`shared.KindFromMIMEType` 映射 kind；仅登记 image/video/audio/text（`isSupportedMediaAssetKind`），其余跳过；
   - `relPath` 用 `store.mediaAssetDBRelPath(projectID, absPath)`；与数据库**同 scope 精确**行按 relPath 比对；
   - 磁盘新文件 → 新建素材行（`source` = `imported`，`folderID` = 请求传入的当前逻辑文件夹，默认根；`storageStatus` = ready；`createdAt/updatedAt` = 请求时刻）；
   - 已存在行 → 仅当 `mimeType` 或 `sizeBytes` 不同，或（该行 `source` = `imported` 且 `filename` 不同）时更新：`filename` 只对扫描登记（imported）的素材同步磁盘文件名；上传/生成素材盘上存储名是 `<assetId>.<ext>` 而 `filename` 是用户可见标题，绝不覆盖。**不**用文件 mtime 覆盖 `updated_at`，避免「最近添加」排序抖动；**不**改动既有 `folder_id`，保持用户逻辑分类；
   - 返回 `{added, updated, scanned}`。
3. Repository 新增 `ListMediaAssetsInScope(projectID)`：`project_id IS NULL`（全局）或 `project_id = ?`（项目）的精确 scope 列表（既有 `ListMediaAssets` 对项目 scope 会并入全局行，不能用于物理路径比对）。
4. 前端：
   - `api/media.ts` 新增 `scanMediaAssets(projectId?, folderId?)` 与 `mediaAssetsScanPath`；
   - `AssetLibraryButton.tsx` 的 `refresh` 改为「先 `POST scan`，再重取列表/文件夹/已选资源/文档」，成功提示扫描统计（新增/更新/共扫描），失败沿用现有错误提示；
   - 页面空态补充官方提示文案「导入文件，或把文件放入素材目录后刷新。」
5. 测试：后端 service 扫描单测（新增/幂等/元数据变更/忽略项/scope 隔离）；前端 media.ts 路径断言 + 刷新触发扫描与提示。

## 不做（明确留在本项之外，登记为遗留）

- 磁盘文件丢失/删除的清理与 `storageStatus = missing` 标记（官方未见证据，另有契约）。
- 物理子目录 → 逻辑文件夹的自动映射（逻辑文件夹无物理路径字段，不做臆造映射）。
- 文档正文（Markdown 内嵌 URL）级引用检索 —— 另项。
- 自动定时/监听式扫描；本次只做用户点击「刷新」触发的按需扫描。

## 契约与边界

- 只扫描该 scope 自己的素材根目录，不跨 scope、不写其它项目目录。
- 不修改已有素材行的 `folder_id`/`tags`/`note`/`rating`/`source`/`sourceUrl`。
- 幂等：同一目录重复扫描，`added` 为 0（除首次），已存在项内容一致时不产生写入。
- 单用户本地规模，扫描不做分页；如目录极大仍以一次遍历为限（不做增量游标）。
- 不得用模拟成功冒充：`added` 必须来自真实落库行。

## Acceptance Criteria

- [x] 后端 `go build ./...`、`gofmt -l ./internal`、`go vet ./internal/...`、定向 `go test` 全部通过。
- [x] 隔离实例（不触碰 `%APPDATA%\mediago-drama\workspace-v2`）API 实测：向 `library/<date>/` 放入 PNG → `POST /media-assets/scan` 返回 `added>=1` 且列表出现该文件；再次扫描 `added=0`；改动文件大小后扫描 `updated>=1`。
- [x] scope 隔离实测：全局扫描不登记项目目录文件；项目扫描不登记全局目录文件（用两个隔离目录双向验证）。
- [x] 忽略项实测：`.hidden`、`thumbs.db`、`x.tmp`、二进制不支持类型文件不被登记。
- [x] 前端 `pnpm lint`、`pnpm format`、`pnpm build`、定向 vitest 通过。
- [x] 真实浏览器（31432 后端 + 31433 前端）：磁盘放文件 → 点「刷新」→ 列表出现该项并提示统计；刷新页面后仍在；深色主题可读。
- [x] 空态页面显示官方提示文案。
- [x] `TASKS.md` 台账、`result.md`、会话记录与本项本地提交（不推送）完成。

## 交叉引用

- 台账：`docs/parity-0.1.17/TASKS.md`（TASK-030 / TASK-034）。
- 需求：`docs/parity-0.1.17/REQUIREMENTS.md` REQ-012。
- 前置研究：`.trellis/tasks/10-14-official-0-1-17-parity/research/asset-library-next.md`。
- 前序任务：`10-15-asset-reference-detail`（`a300139`）、`10-15-asset-folder-reparent`（`1b497b3`）。
- 规范：`.trellis/spec/backend/index.md`、`.trellis/spec/frontend/index.md`。
