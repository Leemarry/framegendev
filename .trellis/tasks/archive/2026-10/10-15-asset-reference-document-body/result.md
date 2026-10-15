# TASK-164 文档正文引用补充：验收结果

2026-10-15。前序 `a300139` 仅覆盖选入资源，本项补齐文档正文图片引用，未改变素材删除策略。

## 实现与架构

- `shared.MediaAssetIDFromURL` 统一 generation/document 的 URL 解析，使用 EscapedPath 后只解码一次，支持当前/旧路径、相对/绝对 URL。
- document 服务复用既有文稿读取，使用已安装 goldmark 解析图片节点，覆盖段落内/引用式图片；排除代码块、行内代码和占位图。同文档/素材去重，不保存正文。
- media 服务通过消费者接口合并选入资源与文档引用，枚举全部生命周期项目（包括归档/回收站）；保留 documentId/source，稳定排序，读取失败真实返回错误。app 负责注入，无新表、迁移或索引。
- 原详情组件显示「文档」「选入资源」，复用加载/失败/空态；未知来源不假定为选入资源。goldmark 版本不变，仅从间接依赖改为直接依赖。

## 自动检查

- 后端定向 shared/document/media/generation 测试及新增真实 SQLite/API 集成测试通过；集成测试验证两路由、去重、身份、404、查询不改文档。
- `./scripts/check-windows.ps1 -Gate check` 退出 0，含 tidy/fmt/vet/lint/build、Swagger 和全量 `go test -race ./...`；显式 `go build ./...` 退出 0。
- 前端 lint、format、build 通过；`AssetLibraryButton.test.tsx` 与 `library-folders.test.ts` 共 21 测试通过，包括混合来源及失败不伪装为空态。
- 首轮 lint 的 appendAssign、废弃 image.Text 已修复，原失败日志保留；末轮成功证据为 `.cache/parity/task-164/backend-check-final.log`。

## 界面、交互与真实功能

验收数据只在 `.cache/parity/task-164/workspace`，后端 31432、前端 31433，未访问生产 workspace-v2。

- 两隔离项目、三导入 PNG：全局素材两份文档引用加一份 selection 共 3 条，项目自有素材 1 条文档引用；代码示例中的图片无真实引用。浏览器实际点击预览与切换素材，空态与来源正确。
- browser-harness 真实验证桌面浅色/深色、刷新、390×844 窄屏及内部滚动，引用可读且无页面横向溢出。截图 `references-desktop-light.png`、`references-desktop-dark.png`、`references-empty.png`、`references-narrow-dark.png`、`references-project-narrow.png`；流程结果 `accepted-browser.json`。
- 对照安装目录 `E:/AI/MediaGo Drama` 及官方 `exe-flow/37-global-assets.png` 核实素材库导航、范围、工具栏与列表结构。本项保留已有框架，仅补真实引用；参考图是空态，未宣称未知引用详情逐像素一致。PNG 为 1px 测试图，预览中为小点，列表缩放填充属预期。
- 最新代码构建到 `mediago-server-next.exe`，核验旧专用进程路径/config 后仅重启该实例（新 PID 32600）。3/1 引用持久，原两文档完整字段（含正文、version、updatedAt）与 7 个 md/png hash 均不变。
- 独立新增 `doc-removal-0f2d6b45` 验证图片加入→1 条→PATCH 移除→0 条，原测试文档/图片全部保留；不存在素材 404。证据 `accepted-restart.json`、`verify-restart.ps1`。
- 浏览器前几轮因标签页焦点、视口及 AX 文字拆分定位失败；固定专用标签页、实际坐标点击及滚动后完整流程通过。初始不完整截图不作最终证据。其他浏览器标签页未操作。

## 剩余与下一项

TASK-164 本次范围已完成。按需全项目读取是个人本地规模方案；删除前拦截、全文索引、非 Markdown 图片引用未实现，未来有独立需求再设计。未运行 Agent、真实生成、登录、付费或导出。

TASK-030/034 整体不标完成：TASK-163 旧 result 明确缺少真实页面提交移动、冲突反馈及刷新验收，下一单项补齐该闭环。TASK-010 待评审，TASK-170 新设计实施未定。其他会话改动与运行产物排除本地提交，不推送。
