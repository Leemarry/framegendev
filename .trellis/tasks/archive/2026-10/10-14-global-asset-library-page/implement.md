# TASK-033 Implementation Plan

Superpowers writing-plans；按已持续授权inline执行，无并行agent/暂存/提交/推送。

**Goal:** 全局素材整页范围导航和真实数据操作可用。
**Architecture:** 扩展唯一AssetLibrary page/workspace，共用目录API；补现有删除owner校验。
**Tech Stack:** React/Router/SWR/Radix/Go/Gin/SQLite，无新依赖。
**Spec:** design.md，REQ-012/官方37，TASK-036已验收契约。

## 单一可验收交付

- [x] 写页面回归：mount无project进入global；选择scope更新URL清folderId；global创建上传使用空scope；project选入后媒体与目录隔离。新回归先观察失败。
- [x] AssetLibraryScopes负责桌面列表和窄屏Select；Page持有projects SWR/URL，workspace识别global标题/筛选，navigation入口用Link，icon弹窗兼容。
- [x] 修DELETE scope root：store.DeleteInScope+handler调用；tempDB HTTP对project/global/wrongowner404及零写入回归，前端delete用owner并重新读取当前范围。
- [x] 前端相关测试、lint、format2、build；后端check/test/race/build。失败修复，全部门通过再替换隔离服务（备份保留）。
- [x] 真实global目录分类导入PNG文本/编辑/移动/搜索，global与专用project互切/刷新/设置返回；深浅390窄短屏，长名沿TASK-036已验收控件；重启API/SQLite/hash/原四文档/既有素材不变。全局baseline快照不覆盖。
- [x] result/spec/台账/交接/会话，无提交归档，按依赖继续下一单项；TASK-030整体未完成，未跑检查不记通过。
