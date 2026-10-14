# TASK-031 验收结果

2026-10-14。REQ-012首个独立子项完成；TASK-030整体仍开发中。未暂存/提交/推送。

## 实际改动

- 核实实际media-assets/selected-assets与project-assets目录区别，复用assets表，增加tags_json/note/rating默认列及API投影。
- 既有PUT支持部分更新/显式清空，校验标签20×40字符、备注4000字符、评分整数0–5；跨scope写入404、内部错误500。原filename与generation内部重命名兼容。
- 详情真实编辑/保存/取消/失败草稿，key随素材重置；用户标签/备注可搜索。全局媒体用真实所属scope更新。
- 实际浏览器发现Radix先处理Escape，修复为先取消编辑，再允许关闭弹窗；窄短屏改为纵向滚动，防止工具栏挤掉表单。
- 没有移动/删除媒体，ID/URL/hash/引用保持；原四篇文档正文hash/version/updatedAt不变。

## 分项验收

| 层面 | 已执行结果                                                                                                                          |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 界面 | 1582×1056深浅、390×844、390×380，真实详情/表单/搜索可见，弹窗边界正确，短屏可滚动到编辑按钮；沿用现有弹窗密度，不宣称官方整页已对齐 |
| 交互 | 上传PNG、标签去重、多行中文/末尾空白保存、评分5、按钮取消、Escape只取消编辑、标签/备注搜索、刷新重开、窄短屏取消通过                |
| 功能 | API400/404/部分更新/清空、SQLite旧schema迁移/关闭重开、文件hash不变、真实服务重启后API与SQLite一致、原四篇文档不变通过              |

前端3文件23测试通过，lint0警告/错误，完整format以2线程与build退出0。后端首轮check退出0，最终check/test/race/build全部退出0；日志 `.cache/parity/task-031/logs/*-final.log` 与 gates.json。不新增skip、不降低门、不新增依赖；go.mod保留此前x/sys直接依赖变更。本项API/service/repository三组实际回归含14个HTTP分支。生成Swagger缓存已更新。

## 真实数据与证据

专用项目project-74a3e23fa0e87a6f，验收素材asset-c1ea942689374225，保留tags=[主角,夜景]、多行note、rating5。PNG hash `4303165e63ee7d3819203d763a4124d5cff612d103557c1eb96007a5ce241c3b`。

证据在 `.cache/parity/task-031/`：project.json、asset-before/saved.json、metadata-\*.png、browser-errors.json、responsive.json、documents-before/after.json、persistence-accepted.json、gates.json。SQLite迁移前backup保留为app-before-migration.db，仅隔离数据。

运行31430已替换为task-031/bin/mediago-server.exe，重启最终PID71020；同级document/generation工具复制task-003/bin-accepted，ACP修复源码保留。配置/数据仍task-001/server.yaml与workspace。31431原PID61876保留。Chromium专用profile task-031/browser，重启PID68728，CDP9223，仅测试页；未操作用户浏览器。

## 失败与修正记录

- 回归先缺接口失败，再实现通过；实际Escape关闭整库失败，再修复/父弹窗回归/浏览器通过。
- 默认format32线程内存分配失败；2线程完整范围检查通过，未修改格式规则或跳过文件。
- Harness脚本曾有编码、Python变量跨调用、JS转义/定位错误及IPC超时；修正后复验。多个测试页长连接占满HTTP/1.1连接，清理专用测试页并重启已核实Chromium，单页后完整复验通过。
- 首次文件input选中隐藏同路由入口，实际多导入一份PNG，仍属于专用项目；两份均保留。期间另有上传JPEG出现在专用项目，非本脚本创建，不修改/清理；响应式验收明确选定本项PNG，避免依赖列表顺序。
- 主题脚本误写持久化version0触发migration日志，按实际theme.ts version1修正；末轮console/error与window异常为空。响应式边界改为定位素材dialog，避免误测导航dialog。
- 组合浏览器启动被自动策略拒绝、未执行；身份/配置明确的独立脚本隐藏启动成功，无待批准动作。

## 剩余与下一项

官方30/37仍为整页而当前为弹窗；素材文件夹、目录扫描、全局范围页面、用户评分筛选/排序增强、NLE继续独立推进。GAP-001原焦点警告本轮未复现，未经单项核实不关闭。TASK-010原设计继续待评审。下一项TASK-032：项目素材库根目录整页、真实导入/搜索/详情；文件夹作为独立后续，不以禁用入口算完成功能。

未运行Electron、真实登录/Agent prompt/生成/导出、跨平台运行；既有>500kB包体提示保留。
