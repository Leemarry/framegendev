# TASK-004 实施与验收

日期：2026-10-14。结论：通过。已修改产品源码；不是静态页面演示，也不代表官方完整对齐。

## 根因与修改

- `MarkdownHybridEditor.tsx`：StarterKit 的 trailingNode 默认取 schema 默认节点。
  本文档 schema 默认节点为优先级1100的 sectionMediaPreview；初始化装饰交易
  自动插入空媒体节点，触发 onUpdate/序列化/保存。关闭该编辑器的 trailingNode。
- `extensions/locked-heading.ts`：模板标题 imprint 只写内部属性，却发出内容更新，
  导致原 Markdown 空白被归一化保存。使用 Tiptap 原生 preventUpdate 标记内部交易。
- `MarkdownHybridEditor.test.tsx`：新增10项回归，覆盖中文、实体空段落、标题、列表、
  空文档、图片、表格、外部同步、实际编辑/格式/缓存重开、模板锁定及正文编辑。
  修复前四项无编辑回归均因意外 onChange 失败；模板扩展回归也先失败后修复。

未改接口、保存队列、公共数据模型、设置页或外部服务。未清理任何已有文稿。

## 实际验证

| 检查                             | 实际结果                                                                                       |
| -------------------------------- | ---------------------------------------------------------------------------------------------- |
| 相关7文件                        | 36项通过，包含 editor/hook/cache/save queue/WritingEditor/prewarm/locked-heading               |
| 整个 documents 模块              | `pnpm -C apps/workspace exec vitest run src/domains/documents --maxWorkers=4`，37文件224项通过 |
| lint                             | 0 warnings/errors，退出0                                                                       |
| format                           | 全部匹配文件通过，退出0                                                                        |
| build                            | tsc/Vite通过；已有 >500kB chunk提示仍在                                                        |
| 浏览器连续刷新两次、概览切换重开 | 文件 version13、193字符、281字节及完整SHA256不变；无写请求                                     |
| 浏览器实际中文输入               | 键入【TASK-004 真实编辑】，PATCH文档接口200，version13→14                                      |
| 实际编辑后刷新、server重启恢复   | version14、214字符、314字节及完整SHA256不变；中文内容恢复                                      |
| 浏览器错误                       | 观察窗口无 console.error/JS错误/HTTP4xx或5xx；无操作恢复无XHR写请求                            |
| 原GAP-002                        | 空媒体NodeView初始化造成flushSync警告；本项加载回归与浏览器中未再出现                          |
| Git                              | 分支 codex/task-004-document-reload；diff --check通过；HEAD47322e4未变，暂存区为空             |

SHA256：

```text
无编辑基线version13: 839BE24B7DDA40741F884EE3389398471FA2C35CEF2DC65A14E6637A4B5A9047
实际编辑version14:   20D6E3956D01CE1AA36290BA0ED15CE1D9BB24D85343281187FFE142FAE7130D
```

实际测试数据仍在 TASK-001 workspace，项目 project-667f58e1306b52e8，
文档 doc-1791954637945-opoyqjglmw。原先复现留下的空白保留，不自动清理。
证据在 `E:/AI/framegendev/.cache/parity/task-004/`：snapshots.jsonl、snapshot.ps1、
browser-observer.py、no-edit-reopen.png、edited-restarted.png。截图1560×1050已查看，
为功能回归证据；本项无官方页面视觉改造。

后端重启PID64284，配置task-001/server.yaml；新标准输出日志在task-004/server.\*.log，
应用日志与DB仍在task-001隔离目录。前端PID61876、31431；后端31430，health ready=true。
浏览器为专用缓存profile/CDP9223，验收后关闭；开发服务保留试用。

## 限制与下一步

不登录、生成、导出、不访问生产workspace-v2；原源码、官方项目、源素材、用户测试输出、
toonflowLocal未写入。未执行Electron、全量前端/后端测试；不把局部回归视为产品全流程通过。
MCP缺.exe解析和ACP退出仍由TASK-002/003处理；TASK-010设计仍待评审。
TASK-001严格持久化本轮复验通过，其首次失败记录保留。
