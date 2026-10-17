# workspace 域问题清单

分析范围：`apps/workspace/src/domains/workspace`。仅静态阅读（未改业务代码、未扫构建产物、未跑测试）。

1. **拖拽落点会回退到旧目标**：`onDragEnd` 在 `over` 为空时使用 `?? dropTarget`（上次悬停态），拖到空白仍会移动。证据：`components/directory/useDirectoryDragDrop.ts:104-112`。建议只信本次 `event.over`，补“拖到空白取消”测试。

2. **两种目录视图删除语义不一致**：分类视图按 `parentId` 级联删除子文档（`components/ProjectDirectory.tsx:350,386`），目录视图只删当前项（`components/directory/ProjectFileItem.tsx:132,175`），确认文案却都称不可撤销。建议统一删除入口并明确级联范围。

3. **文件管理器路径靠标题推导**：`resolveDirectoryFilePath` 用 `buildDocumentFilenameById`（由 title 生成）而不用后端 `document.filename`（`components/directory/file-manager.ts:102-104`），标题与磁盘文件名不一致时会定位错文件；文件夹路径递归无环检测（124-133），成环目录会静默丢失。建议优先用后端文件名并加 visited 集合。

4. **素材库入口作用域不可控**：`AssetLibraryButton` 只从 `window.location.search` 取 `projectId`（`components/AssetLibraryButton.tsx:171-178`），侧栏调用未传 projectId（`components/ProjectNavigatorProjectPanels.tsx:464`），无 projectId 时标签仍是“项目素材库”却打开全局；该文件近 2000 行，列表/筛选/编辑/引用职责混杂。建议改为路由 hook 或 prop，并拆分组件。

5. **移动端项目导航无障碍缺陷**：`AppLayout` 只在 `globalSettings` 时给内容加 `inert`（`components/AppLayout.tsx:164`），项目导航抽屉打开时背景仍可聚焦；点击导航项也仅在 globalSettings 下关闭抽屉（89-97）。建议统一处理并补焦点回归测试。

6. **路由判定死代码与重复**：`isAgentDocumentRoute` 恒返回 false（`lib/workbench-route.ts:36`），`sidebarHidden` 永不生效；`isSettingsRoute` 在 `lib/sidebar-navigation.ts:55` 与 `workbench-route.ts:33` 各写一份；`sidebarScreenLevel` 忽略 `isProjectSettings` 参数（`lib/app-route-descriptor.ts:35-41`）。建议收敛为单一路由模块并删除死分支。

7. **素材增删后全量刷新**：删除/上传后重新 `getWorkspaceDocuments` + `hydrate` + `mutateSWR`（`components/ProjectNavigator.tsx:372-375,468-471`），另有重复 `mutateSWR(projectsKey)`（333、544）。建议用接口返回值做增量更新，统一失效函数。

8. **目录数据源逻辑重复**：`ProjectDirectory.tsx:116-146` 与 `ProjectDirectoryTree.tsx:56-96` 各自实现 store/SWR 回退与 activeId 解析，且前者不用 `folders`、后者使用，行为已分叉。建议抽公共 hook。

9. **类型与错误契约不统一**：`AssetLibraryFolder.parentId` 声明为非空 string（`api/library-folders.ts:7`），根目录实际可能为空串/null；`projectAPIPath` 同步抛普通 Error（`api/workspace.ts:28-32`），与 `ApiError` 体系不一致。建议可空类型并统一错误。

10. **项目生成历史会话 scope 写死**：创建会话固定 `scope=studio`（`components/GlobalToolboxDrawer.tsx:326`），`projectOnly` 仅靠隐藏按钮规避。建议按 projectId 生成 scope。

**结论**：分层与测试基础较好，主要风险集中在拖拽落点、删除语义、路径定位、移动端无障碍；建议按 1→2→3→5 顺序修复并补测试。
