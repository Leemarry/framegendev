# TASK-163 续作设计

保留现有 repository/service/handler/API 与 AssetLibraryFolderMoveDialog。目录身份、素材分类 ID 与物理文件路径不因重挂改变；前端收到保存结果后更新 scope-keyed SWR，URL 的 folderId 仍是同一对象，面包屑重新计算。

本轮行为差距为缺少真实提交、冲突、刷新证据及页面回归测试。预期修改页面测试（API mock 与真实用户交互回归）及本任务/台账记录。先实测既有流程，若发现本功能缺陷，在实际所属函数修复并补回归；不扩展跨 scope 移动、目录合并、物理文件迁移或拖拽。原后端已由 Session24 完整门覆盖。
