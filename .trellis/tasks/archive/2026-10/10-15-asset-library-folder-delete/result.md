# TASK-162 验收记录

## 实际改动

- 后端 repository/service/handler/routes 增加 global/project 空逻辑素材文件夹删除。
- 删除在同一事务内校验 owner scope、媒体引用和子目录；非空返回 `409`，缺失或跨 scope 返回 `404`；空目录只删除逻辑行，不触碰物理媒体、ID、URL、路径、hash、元数据或引用。
- 前端增加删除入口、确认/取消、失败错误、SWR 更新和成功后回父目录。
- 验收中修复删除弹窗错误消息：`AssetLibraryFolderDeleteDialog` 的 catch 现按代码库既有约定（`folder-actions.ts` / `generatedResultActions.ts` / `EpisodeTimelineView.tsx`）从 `Error` 或 `ApiError` 形状对象读取 `.message`，通用文案仅作最后兜底。
- 更新数据库规范、任务台账、交接摘要，并同步删除失败单测为真实 `ApiError` 形状。

## 已执行验证

- 后端 Windows `check`：通过 tidy、gofmt、vet、golangci-lint、Swagger、构建和 `go test -race ./...`（上一轮）。本轮从当前工作树用 gap-003 mingw gcc + CGO 重建 `mediago-server.exe`（fallback 嵌入），隔离启动于 31430，`/api/v1/health` 返回 `ready=true`。
- 前端：`vitest` 2 文件 13 项通过；`pnpm lint` 0 警告 0 错误；`pnpm format`（oxfmt --check）通过；`pnpm build`（tsc -b + vite build）通过（>500kB 分包警告为既有登记项）。
- 真实浏览器验收（browser-use MCP 驱动 in-app 浏览器，真实 DOM 点击 + 真实 fetch + 网络日志 + 可访问性快照；替代上一轮损坏的 browser-harness.exe）：
  - A1 全局取消：打开 acc-empty-global 删除弹窗→取消→弹窗关闭、目录保留、**未发任何 DELETE 请求**。
  - A2 全局非空 409：删除 acc-parent-global（含子目录）→ `DELETE .../library-folder-cbd35a381c56d8ad [409]`，弹窗保持打开、父子目录保留、URL 不变；修复后 alert 显示真实原因 `library folder is not empty`（修复前为误导性通用"请重试"）。
  - A3 全局空目录删除成功：进入 acc-empty-global→删除→ `DELETE .../library-folder-bdef800ea43e75a0 [200]`，弹窗关闭无错误、目录移除、folderId 清空**回父级（根目录）**、状态 2→1 个文件夹（SWR 更新）、acc-parent-global 保留。
  - B2 项目非空 409：项目路由 `DELETE /projects/{pid}/asset-library-folders/... [409]`，真实消息、父子目录保留。
  - B1 项目空目录删除成功：项目路由 `DELETE ... [200]`，目录移除、回项目根、acc-parent-proj 保留。
  - 持久化：API/DB 与 reload 后 UI 一致——已删的 acc-empty-global/acc-empty-proj 消失，非空的 acc-parent-global+child、acc-parent-proj+child 完整保留，证明只删逻辑行且失败不误删。
  - 深浅主题：暗色 `--background rgb(25 27 28)`/`--error-foreground rgb(232 112 107)`；经真实持久化路径（localStorage `app.theme.v1`=light + reload）切浅色后 `--background rgb(243 246 250)`/`--error-foreground rgb(229 72 77)`，删除确认按钮 bg=destructive token、错误提示文字色=error-foreground token，弹窗与错误提示在两主题下均用 token 适配（无硬编码色）。
  - 窄屏：删除按钮位于桌面/窄屏共享的 `rows`；强制窄屏布局后"选择素材文件夹" popover 内含删除/重命名/新建入口，删除入口在窄屏可达。
- 回归覆盖（上一轮原生测试）：空目录删除成功；含媒体/子目录拒绝；跨 scope/缺失目录 404；关闭数据库重开后目录、媒体文件身份和引用保持；项目删除清理目录。
- `git diff --check`：通过。

## 验收中发现并修复的缺陷

- 症状：非空 409 删除显示通用"文件夹删除失败，请重试。"，对结构性非空目录"请重试"具误导性（重试永不成功）。
- 根因：`httpClient` 响应拦截器 reject 的是普通 `ApiError` 对象 `{code,message,details}`，非 `Error` 实例；删除弹窗用 `err instanceof Error ? err.message : 兜底`，导致 ApiError 落到通用兜底。单测以 `new Error(...)` mock，故通过却与生产分歧（REQ-044/DEC-029 所指"通过单测≠真实流程完成"）。
- 修复范围：仅删除弹窗（TASK-162）。同文件的重命名弹窗与移动组件沿用既有 `err instanceof Error` 模式（属 TASK-033/035/036 先前验收范围），与全应用一致的 ApiError 消息提取及英文服务器消息本地化留待已登记的 i18n/错误处理项。

## 证据与限制

- 流程证据：`.cache/parity/task-162/acceptance/flow-evidence.json`（含环境、种子、各场景、网络状态、主题计算样式、缺陷与修复）；`.cache/parity/task-162/logs/` 保留后端/前端运行日志。`.cache/` 按忽略规则不入库。
- 像素截图未捕获：Qoder in-app Browser 面板不可见（`visibilityState=hidden`），`take_screenshot`/原生 click 返回 `NATIVE_BROWSER_VIEWPORT_UNAVAILABLE`，需用户手动聚焦面板，无法程序化解决。经用户确认以 DOM/网络/计算样式**流程证据**替代截图（交接文档允许"截图/流程证据"二选一）。
- 视口无法程序化调整（`window.resizeTo` 无效），窄屏经强制移动 CSS 规则验证。
- 服务器错误消息为英文（`library folder is not empty`），完整 i18n 为已登记待开发项，故中文弹窗内浮现的真实消息为英文。

## 结论

界面（主题 token 适配、窄屏入口可达）、交互（确认/取消/失败保留/成功回父级）、功能（global+project 真实 API、409/200、DB 持久化、物理媒体与引用不变）分别验收通过；验收中发现的错误消息缺陷已修复并回归。TASK-162 验收完成，可归档。TASK-030/TASK-034 整体仍开发中：重挂父级、物理扫描、评分筛选排序与关联详情未实施。
