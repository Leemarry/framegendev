# TASK-021 验收结果

2026-10-14；参考截图06；关联REQ-010/025。本项完成不代表TASK-020/140或全产品已对齐。

## 实际修改

- WorkspaceUserMenu.tsx及测试：本地身份、积分待接入、技能/主题/语言/设置、公告待接入、反馈/帮助分组；开合箭头同步。
- ProjectNavigatorProjectPanels.tsx及测试接入菜单；ProjectNavigator.tsx设置prompt-packs后导航/settings。软件设置保留现有appearance入口。
- user-menu.css、tokens.css、index.css：320px弹层、35px行高、8px圆角、深浅背景和可滚动高度。窄屏语言在同一弹层内显示并支持返回/焦点恢复。
- 无后端/API/模型/依赖更改，保留此前TASK-004/061和用户工作树改动。

## 验收

| 类别 | 实际结果                                                                                                                                                                              | 边界                                                                                                                                                                                                            |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 视觉 | 1600×1066：弹层x10/y614/320×370，每行35，背景rgb(44,47,51)。390×844：x10/right330/bottom722，深浅主题无横向溢出；语言320×164/right330。390×360：高228、scroll368/client226，End到帮助 | 官方全窗口1600×1136，标题菜单70px、外框左9px；参考弹层扣标题/左框x10/y613/320×371，本次高/位置约1px差异。截图使用归档空态，隔离垃圾箱已有555，未改项目状态以造空态。身份/头像/余额/语言反映本地能力，外框未仿造 |
| 交互 | 鼠标切换主题保持打开；Escape关闭并聚焦触发器，Enter/ArrowDown/空格切换；桌面语言子菜单、窄屏列表返回、低高度滚动通过                                                                  | 官方语言展开态未截，仅验收当前可用交互；未知会员/公告流程待补                                                                                                                                                   |
| 功能 | app.theme.v1真实保存dark，Page.reload恢复dark；技能菜单打开现有技能包页面并读取默认技能内容；设置页显示隔离workspace路径；帮助/反馈调用现有helper的仓库/issues目标                    | 浏览器外链通过拦截window.open核实URL，不访问外站；异常反馈由mock拒绝单测验证。未安装/编辑技能、登录、生成、发送Agent任务或导出                                                                                  |

## 检查

- 修改前根侧栏测试：9通过、1失败（软件设置不存在），确认行为差距。
- 最终命令 `pnpm -C apps/workspace exec vitest run src/domains/workspace/components/WorkspaceUserMenu.test.tsx src/domains/workspace/components/ProjectNavigatorProjectPanels.test.tsx src/pages/Projects.test.tsx src/domains/workspace/components/AppLayout.test.tsx src/domains/settings/components/debug/PromptPacksPanel.test.tsx`：5文件33测试通过。
- `pnpm -C apps/workspace lint`：0错误/警告；`format`全通过；`build`tsc/Vite退出0，既有>500kB bundle提示保留。后端、Electron与全量测试未运行，未改后端。
- Trellis task validate通过；git diff --check收尾执行。HEAD仍47322e4，暂存区为空，无提交/推送。
- 浏览器最终菜单动作window error/unhandledrejection数组为空；不宣称全程console无警告。既有ACP/MCP及素材焦点缺陷仍保留。
- 健康真实 `/api/v1/health` 返回ready=true。数据E:/AI/framegendev/.cache/parity/task-001/workspace，DB其.mediago-drama/db/app.db；server.yaml指定路径与界面读取一致；后端31430/PID64284、前端31431/PID61876保持运行。

## 失败与修正

- 测试初版把无CSS的相邻span名称误判为空格拼接，添加明确aria-label；系统主题测试混入Sonner监听，mock独立Toaster后目标订阅清理验证通过。
- 窄屏Radix子菜单right561溢出，改同一弹层语言列表；最终right330与返回通过。首次Space脚本用错误键名，按harness实际接口空格复验通过。
- Chrome默认安装路径不存在，Playwright Chromium复用旧profile启动失败；使用task-021专用profile启动。中途Chrome compositor/CDP超时，关闭该专用进程树、重启后完整browser-final.py退出0；未操作用户浏览器。
- 脚本最初假设垃圾箱为空，实际有555，改检查归档空态；未还原/删除或编辑项目。主题脚本初始状态假设失败，明确设置初始dark后复验，最终截图覆盖中间版本。
- 文档格式命令首次因包含..路径被拒绝，根pnpm exec又找不到oxfmt；改为从根目录调用workspace安装的oxfmt.cmd核对本项文档。产品format检查已独立通过。

## 截图与后续

E:/AI/framegendev/.cache/parity/task-021/：menu-desktop-dark/light、menu-mobile-dark/light、language-desktop/mobile、menu-short、skills-entry、settings-entry.png；browser-check.py和browser-final.py通过browser-harness执行。

专用Chrome65956/9223收尾关闭，服务保留。未修改原始源码/截图/官方项目、素材源或测试输出、toonflowLocal；不访问生产workspace-v2。

下一项TASK-022单独设计截图01/02的项目工作区壳与导航。TASK-062导入、TASK-140商业服务、完整国际化仍待补；TASK-010设计待评审、TASK-002/003待修复。
