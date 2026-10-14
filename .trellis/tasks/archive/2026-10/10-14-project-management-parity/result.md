# TASK-061 验收结果

2026-10-14产品源码已修改。本任务仅完成根项目管理首屏。

## 改动

Projects.tsx改为单标题/页签/创建和真实项目卡片/更新时间/kebab与右键共用动作，复用原API。App.tsx/AppLayout.tsx只在根页面取消重复标题并使用325px侧栏。ProjectNavigatorProjectPanels.tsx/ProjectNavigator.tsx实现最近项目、底部导航、本地用户设置菜单。素材和历史按钮增加navigation变体，默认保持。创建弹窗标题和本地保存说明已纠正。

projects.css/tokens.css/index.css实现参考尺寸/颜色/深浅主题和<=700px图标侧栏；public/parity提供两张参考空态插图及来源。两份组件测试覆盖创建取消/成功/拒绝、kebab不误导航/归档、侧栏操作和旧生命周期。

## 验收

| 类别 | 结果 | 边界 |
| --- | --- | --- |
| 视觉 | 1600×1066：侧栏325px、header56px、卡片230×307px、gap20px、创建卡351,126；仅一个h1。空态220px图片真实加载。390×844深浅截图复核，无横向溢出 | 官方窗口需减70px标题菜单和左9px外框；网页未仿原生标题栏；长标题保留tooltip，身份/时间/数据来自本地 |
| 交互 | 真实创建取消/中文创建/重命名/归档/恢复/垃圾箱/恢复/刷新、素材/历史/搜索、本地用户设置入口通过。稳定窄屏侧栏64px，最近列表隐藏 | 官方创建/kebab无截图，复用已有对话框，不宣称未知细节一致 |
| 功能 | project-caed121474325725中文名称、active状态与API/隔离project.media.json一致。取消卡片数2不变，创建后3。真实/api/v1/health ready=true | 没有登录、发送Agent消息、生成或导出；ACP/MCP独立缺陷保留 |

数据：E:/AI/framegendev/.cache/parity/task-001/workspace，DB .mediago-drama/db/app.db。后端31430/PID64284、前端31431/PID61876保持运行。专用测试Chrome28308/9223结束关闭。
未修改原始源码、官方项目、素材源/输出或toonflowLocal；验收项目保留active供复核，其他项目未修改。

## 检查与失败记录

- 实施前Projects测试8项中5失败（新卡片/kebab不存在）、3通过。
- 中途旧测试模糊名称匹配两个按钮，改精确name；首次build发现ByRoleOptions不支持exact，删除参数后通过。
- 最终Vitest 7文件51测试通过：Projects、侧栏、素材、历史、AppLayout、route descriptor、screen stack。全量/Electron/后端检查未运行，后端未改。
- lint 0 warning/error；format全通过；build的tsc/Vite退出0，既有>500kB bundle提示保留。Trellis validate、git diff --check通过，未暂存/提交/推送。
- 收尾移除tooltip里的任务编号后，最后format发现一处换行需要更新；仅对Projects.tsx执行oxfmt，重跑format全部通过。最终lint/build再次通过，HEAD仍47322e4、暂存区为空。
- 浏览器首次重命名早于自动焦点，名称未更新；AX定位textbox后键盘输入复验通过。窄屏首次截图动画宽75px，稳定后64px，最终截图覆盖中间图。
- 最后空态切换window error/unhandledrejection数组为空，仅证明最后检查窗口；不声称全程console无警告。素材焦点GAP-001保留。
- server日志仍document MCP disabled、ACP exit1和agent/runtime-config503，属于TASK-002/003。打开新项目自动初始化已有Agent配置，未发送任务，Agent业务未通过。
- 初查/health为SPA HTML未算健康；核实源码后/api/v1/health真实就绪JSON通过。

## 证据与后续

截图在E:/AI/framegendev/.cache/parity/task-061/：before、after-desktop、archive-desktop、trash-desktop、create-dialog、project-menu、archive-project、trash-project、user-menu、desktop-light、mobile-light、mobile-dark.png。
三个browser脚本通过browser-harness执行；extract-empty-assets.ps1只提取参考插图，原图只读。
TASK-062导入/已有目录入口禁用、tooltip和无障碍名称标待接入；TASK-130 Drami、TASK-140商业菜单、TASK-020/070/040/090工作区/正文资源栏/NLE/设置未整体对齐。TASK-002/003待修复，TASK-010仍待评审。下一项单独规划TASK-062，可按用户指定页面调整优先级并记录。
