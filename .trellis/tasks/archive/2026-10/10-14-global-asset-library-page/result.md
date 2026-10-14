# TASK-033 全局素材整页验收

2026-10-14。REQ-012全局整页与scope切换完成；TASK-030整体仍未完成。未暂存/提交/推送。

## 实现与边界

根导航素材Link打开/assets?scope=all，项目原链接兼容，icon弹窗保留。唯一AssetLibrary页面扩展全局/项目导航；AssetLibraryScopes负责桌面列表与窄屏Select。scope/folderId由URL持有，scope切换回根、保留原return state；目录/API/媒体workspace沿TASK-035/036复用。全局标题与筛选真实反映scope，global目录/upload/metadata/move使用global接口。

核实旧媒体DELETE只按ID，新增DeleteInScope在service验证owner，handler返回404且不写；前端按asset.owner删除后revalidate当前scope。内部原Delete调用兼容。仅tempDB回归删除，所有运行验收文件均保留。

## 分项验收

- 界面：目视官方37，对齐范围侧栏、目录树、55px标题/工具栏与全局标题；1582×1056深浅、390×844/380菜单和详情操作截图通过，无页面横向溢出。global-folder-dark/light/narrow/short等证据。
- 交互：根入口、scope切换清folderId、中文global目录、PNG/文本分类导入、metadata编辑/标签备注搜索、移动出入、两项目目录隔离、继承global素材不允许项目分类、刷新/设置返回/根返回通过。
- 功能：后端check/test/race/build全部exit0；前端lint0警告错误/完整format2/build/8文件58测试/diff检查通过。新页面与wrong-owner DELETE回归先失败，修复后全门通过。真实替换重启后API/SQLite一致、3份新增文件hash、所有scope原媒体/目录及原四篇文档hash/version/updatedAt不变。

## 环境与失败记录

31430为.cache/parity/task-033/bin/mediago-server.exe，PID51648；同级MCP沿task-035，配置/data仍task-001。31431/PID61876、CDP9223指定MediaGo tab不变；其他Toonflow未操作。证据.cache/parity/task-033/与logs/，替换前app-before-replacement.db保留；两个专用项目、global目录/两素材和project目录/一素材均保留，ID在flow-accepted.json。

初次build因navigation提前返回后仍保留不可达variant比较失败，移除死分支后通过。浏览器编辑按钮被上传toast遮挡，鼠标悬停暂停计时导致等待表单失败；核实elementFromPoint后移开鼠标并等待通知结束，复验成功。临时调试命令PowerShell转义错误未执行，改UTF8文件后通过。没有把失败记作通过。

## 剩余

TASK-034目录删除/目录重挂父级/物理扫描仍待独立核实；评分排序/筛选增强和素材关联详情待补，不能标TASK-030完成。TASK-010待评审、TASK-170另一会话资料保留，DEC-027新自动化方案实施未定。未执行Electron/登录/Agent prompt/生成/导出/生产数据操作。
