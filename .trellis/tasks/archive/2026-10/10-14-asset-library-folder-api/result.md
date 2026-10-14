# TASK-035 实际验收

2026-10-14。REQ-012/TASK-034 API层完成，页面仍由TASK-036承担。未暂存、提交或推送。

独立asset_library_folders表与assets.library_folder_id默认空串；全局/项目目录列表、创建/嵌套/重命名及媒体PUT移动。multipart直接接受folderId，先验证owner再保存。非法/重名400，缺失/跨scope404，验证全部更新字段后一次写入。项目永久删除同事务清除逻辑目录。分类不移动物理文件，不改ID、URL、路径或生成引用；旧schema默认根目录。

## 已执行验证

- 完整后端check/test/race/build全部exit0，日志.cache/parity/task-035/logs/*-mirror.log，gates.json。包含HTTP/service/repository目录回归、旧schema迁移、DB关闭重开、非法混合patch零写入及引用稳定。
- 真实HTTP18次检查通过：中文目录、嵌套、重命名、重名/非法/跨scope拒绝、目录直接上传、移动回根再归类，文件hash不变。api-accepted.json保存专用项目与资产ID。
- 再重启后11次检查通过：目录/媒体持久化、SQLite/API一致、文件hash、既有素材与原四篇文档hash/version/updatedAt不变。persistence-accepted.json。
- 运行31430为task-035/bin/mediago-server.exe，最终PID7092，配置/数据仍task-001；MCP工具保留task-031同级版本。31431/PID61876保留。隔离DB迁移前备份与所有验收文件保留。

## 失败与修正

初次完整check退出201：Swagger注解不能解析外包DTO；修复后未设镜像的下载超时、回退旧缓存导致路由覆盖测试失败。以既有镜像真正生成新Swagger，再完整门通过。旧check-final.log保留。

Windows PowerShell5日志重定向将task的stderr误当终止错误，未执行完整门；当前PowerShell7通过。验收二进制复制首次相对路径误以server模块为根，工具未复制；绝对路径修正后才替换服务。无失败记作通过。

## 下一项

紧接TASK-036页面闭环；两个验收层完成同一文件夹功能后才推进其他功能。目录删除/重挂父级/扫描待开发；TASK-030整体未完成，TASK-010仍待评审，TASK-170其他会话材料保留。
