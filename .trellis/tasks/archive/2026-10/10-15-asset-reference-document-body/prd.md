# 素材引用详情补充文档正文内嵌引用 — PRD

## 需求来源
- 台账：TASK-030（素材库数据与界面）、TASK-034（素材文件夹数据/API）
- 需求：REQ-012（素材库：项目/全局、文件夹、导入、标签、备注、评分、排序、筛选、详情）
- 前序：TASK-164「引用关联详情」（`a300139`）只覆盖 `project_selected_assets`（选入资源），其 `result.md` 明确遗留「文档正文级引用检索（Markdown 内嵌 URL）」。

## 为什么选本项
只读核实：
- 文档（角色/场景/道具/分镜等）正文会把生成或选中的图片内嵌为 `![标题](/api/v1/media-assets/<id>/content)`（`workspaceMarkdownImagePattern`、`generationImageReferencesFromMarkdown`、`applyGeneratedImageCounts` 均可证）。
- 现有引用面板只列「选入资源」。若素材仅被文档内嵌（未选入），面板显示「未被任何项目引用」；个人用户据此删除素材，会使文档图片失效且无任何提示。
- 属真实、可复现的误删风险，且可只读复用既有文档状态与图片行解析，无需新 schema、无需物理文件操作。

## 个人用户必要性
打开素材详情前，需要看到「这个素材被哪些项目/文档实际用到」。文档正文内嵌是其中一类真实引用，当前完全缺失。本项补齐后，面板可提示用户该素材仍被某文档正文使用。

## 复用方案
- URL→素材 ID 解析：抽取到 `internal/service/shared`（`MediaAssetIDFromURL`）。沿用 TASK-165 中 `projectasset/local_file_sync.go` 委托 `shared` 的既有模式，`generation.libraryAssetIDFromGenerationAssetURL` 改为委托，消除重复解析逻辑。
- 文档读取：复用 `document.Service` 的 `load(projectID)` 与 `RegularWorkspaceDocuments`；使用已安装 goldmark 解析图片节点，覆盖段落内/引用式图片，排除代码示例。
- 项目枚举：复用 `repository.WorkspaceRepository.ListProjectsByStatus(all)`，保留归档/回收站文稿的真实引用。
- 前端：复用既有 `AssetLibraryReferences` 面板与 `MediaAssetReference` 类型，仅新增来源标注。

## 实施范围
后端共享解析 + document 检索方法 + media 合并/透出 + 依赖注入 + 单测；前端类型/UI 来源标注 + 测试；隔离实例真实浏览器验收。

## 不做（本次范围外）
- 不做删除前拦截/二次确认（需产品决策，另项）。
- 不做跨项目全文检索索引或缓存；仅按项目逐个读取文档状态（个人用户量级）。
- 不修改素材删除行为、不新增数据库表/字段。
- 不检索文档正文里对素材的纯文本提及（无 URL 的裸 ID），仅识别可解析出素材 ID 的 Markdown 图片 URL。

## 契约（后端）
- 新增 `shared.MediaAssetIDFromURL(value string) string`：识别 `…/media-assets/<id>/content` 与旧式 `…/media/assets/<id>/content`（含绝对主机、相对路径），ID 做 `url.PathUnescape`；不匹配返回 `""`。
- 新增 `shared.DocumentMediaAssetReference{ DocumentID, DocumentTitle, DocumentCategory, AssetID }`。
- 新增 `document.Service.ListDocumentMediaAssetReferences(projectID string) ([]shared.DocumentMediaAssetReference, error)`：
  - 仅扫 `RegularWorkspaceDocuments`；解析 Markdown 图片节点；
  - `mediago-drama-section-image-pending:` / `media-cli-section-image-pending:` 前缀 alt、`data:image/svg+xml` 来源视为占位，不计引用；
  - 同一（文档，素材）去重；结果排序稳定（文档 ID → 素材 ID）。
- `media.MediaAssets.ListAssetReferences(assetID)` 扩展：
  - 既有「选入资源」引用标记 `Source: "selection"`；
  - 追加文档内嵌引用，标记 `Source: "document"`，`ResourceTitle` = 文档标题、`ResourceType` = 文档 category；
  - 通过 `WorkspaceRepository.ListProjectsByStatus(all)` 逐个调用注入的文档检索源，命中目标素材才追加并保留 documentId；
  - 文档检索源未注入（`nil`）时，仅返回选入资源引用（不报错、不伪造）。
- `MediaAssetReference` 新增 `Source string json:"source"`。

## 契约（前端）
- `MediaAssetReference` 新增 `source?: "selection" | "document" | string`。
- 引用面板在文档来源条目上显示来源标注（如「文档」），选入资源条目显示「选入资源」；两来源混排时仍按既有排序稳定展示。
- 全部使用主题 token，无 hex/rgb；长名 `min-w-0` + `truncate` 保持。

## 验收标准
- [x] 文档正文含 `![x](/api/v1/media-assets/<assetId>/content)` 时，该素材引用面板列出对应项目与文档（来源「文档」）。
- [x] 选入资源引用仍正常列出（来源「选入资源」），行为不回归。
- [x] 同一素材同时被选入与内嵌时，两类引用都出现。
- [x] 识别 `<>` 包裹、绝对主机（如 `http://127.0.0.1:48273/...`）、旧路径 `/api/media/assets/<id>/content`、URL 编码 ID。
- [x] 占位图（`*-section-image-pending:`、`data:image/svg+xml`）不计为引用。
- [x] 无任何引用时面板仍显示空态「未被任何项目引用」；素材不存在仍返回 404。
- [x] 后端：完整 Windows check（tidy/fmt/vet/lint/build/Swagger/全量 race 测试）、显式 `go build ./...`、定向测试通过。
- [x] 前端：`pnpm lint`、`pnpm format`、`pnpm build`、两文件 21 项定向 vitest 通过。
- [x] 隔离实例（31432 后端 + 31433 前端）：真实导入素材被文档内嵌后，面板出现文档来源引用；刷新/重启持久，深浅及 390px 窄屏可读；独立测试文档移除图片后引用消失，原素材与原文档保留。未运行真实生成。

## 边界与约束
- 不读写 `%APPDATA%\mediago-drama\workspace-v2`；验收使用独立目录 `.cache/parity/task-164/workspace`。
- 不推送远端；本地提交，明确路径暂存。
- 界面、交互、功能分别验收；未运行的检查不得记为通过。
