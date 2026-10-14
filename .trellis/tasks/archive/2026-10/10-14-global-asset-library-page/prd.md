# TASK-033 全局素材整页与范围切换

## Goal

REQ-012：复用素材目录workspace，全局与项目scope导航、真实上传编辑移动、刷新重开返回与隔离验收

## Requirements

- TBD

## Acceptance Criteria

- [ ] TBD

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
# TASK-033 全局素材整页与范围切换

REQ-012，官方37-global-assets.png；依赖TASK-032/035/036。DEC-023/028持续授权，inline且不Git提交。

从根素材入口打开全局整页，可在同一页面切换全局/真实项目范围，目录导航/搜索/预览/编辑/当前目录上传/移动复用已有功能。范围和folderId保存在URL，切换范围回对应根目录；刷新/设置返回/原页面返回正确。全局API不读项目素材，项目读行为继续包含可见global素材；写入按实际owner，禁止跨scope分类。创建目录/上传等失败不伪造成功。

验收：全局真实PNG/文本目录导入/元数据保存/移动重开；切换两个项目目录不串数据，global继承素材不能进项目目录，页面刷新返回及深浅/窄短屏通过；完整前端门、相关后端回归及完整门通过；服务重启、原项目文档与既有素材hash不变。保留全部隔离文件。

核实发现旧DELETE只按ID删除，项目API无owner校验；本项范围功能需补同scope删除验证并让前端按asset.owner发请求后重新读当前范围。仅tempDB回归执行删除，不删除任何真实验收文件。不增加新服务/媒体逻辑，不改TASK-010/170，不实现磁盘扫描/目录删除/生产生成。
