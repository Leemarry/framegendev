# TASK-036 素材文件夹页面验收

2026-10-14。REQ-012/TASK-034基础分类闭环完成；TASK-030整体未完成。未暂存、提交或推送。

## 实际实现

目录API/types与路径推导归workspace领域；AssetLibraryFolders共用目录导航/创建重命名表单及移动控件。AssetLibrary页面持有scope内SWR与URL folderId，沿原AssetLibraryWorkspace增加当前目录文件/子目录、真实计数、面包屑、上级导航与当前目录直接上传。元数据/重命名/移动复用唯一media PUT请求，原弹窗兼容。global继承素材和selected-only资源保留根兼容，全局素材不提供移入项目目录操作。

创建/重命名取消及Escape零写入，失败保留草稿；移动先选目标、确认或取消，失败保留目标与素材。不存在目录明确错误、禁用上传且可回根。移动后素材自然离开原目录。窄屏菜单保留全部目录操作；长名称树/路径/移动选择有截断、滚动和完整title。

## 验收

- 前端lint0警告错误、完整format(threads2)、build、7文件46测试与git diff --check通过。日志.cache/parity/task-036/logs/*-final.log及build-final2.log。回归含目录scope/部分请求、分类上传单请求、URL恢复、创建/重命名失败重试取消、移动失败重试与global移动禁止、旧弹窗/元数据/AppLayout/GlobalToolboxDrawer。
- 浏览器真实创建中文目录与嵌套、重命名、重名失败保留输入、取消移动/移出回根/移回、PNG和文本当前目录上传、搜索、文本预览、刷新URL通过。flow-accepted.json与截图。
- 1582×1056深浅、390×844与390×380操作和截图通过；窄屏目录创建/重命名取消及Escape、元数据取消均零写入；无页面横向溢出，菜单在viewport内。80字符中文目录树/面包屑/移动菜单边界通过，长目录验收文件保留。
- 设置刷新后返回原目录URL、素材库刷新后返回原文档通过。服务重启后API/SQLite目录与资产一致；ID/URL/路径/hash保持，原四篇文档hash/version/updatedAt与既有素材未变。浏览器重开图片naturalWidth>0，末轮console/exception为空。

## 环境与证据

project-a882fb13175d1f80，三目录（含80字符子目录）、两真实素材全部保留；证据.cache/parity/task-036/。后端31430/task-035/bin/mediago-server.exe最终PID77944，配置/数据task-001；前端31431/PID61876，CDP9223指定MediaGo测试tab，其他Toonflow标签未操作。

## 失败与修正

测试误用ByRoleOptions.exact导致build失败，修正后完整门通过，初次日志保留。harness中文直接管道编码失败，改ASCII启动UTF8文件；等待DOM对象触发CDP序列化错误，改布尔条件并从已创建目录/素材继续，不重复创建。设置按钮错用可见文案，按实际AX名称修正；复跑前恢复正确路由。80字符选择菜单补viewport宽度/截断后通过，最终门重跑通过。

## 剩余

TASK-034基础分类功能完成；目录删除、目录重挂父级、物理扫描另项待开发。TASK-033全局整页接下来核实与实施；TASK-010保持待评审，TASK-170其他会话资料保留。未运行Electron/真实登录/Agent prompt/生成/导出/外部商业服务。
