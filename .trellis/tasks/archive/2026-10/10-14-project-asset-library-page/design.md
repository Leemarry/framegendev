# TASK-032 设计

选择复用AssetLibraryButton内部的workspace逻辑而不是重新搭建第二套素材页。现有弹窗数据/操作/预览都真实可用，重复复制会造成metadata与scope修复漂移。

- 提取并导出AssetLibraryWorkspace，增加presentation='dialog'|'page'。数据与操作只保留一份；dialog维持原Root/Portal/Content与Escape，page返回同一内容的普通section，不使用模态焦点/遮罩。图片/音频/文本预览及元数据编辑继续复用。
- pages/AssetLibrary.tsx持有页面壳：官方325px根目录侧栏、返回、WorkspaceUserMenu、根目录选中项。route /assets?projectId=...，App跳过外层工作区壳，避免重复标题和自动Agent配置请求。
- 项目导航variant使用React Router Link进入页面，并在route state保存当前pathname/search/state；返回复原，直接打开时退回项目。图标variant继续弹窗；全局navigation无projectId暂仍弹窗，不在此项改变。
- page页头显示项目名/根目录、刷新/导入；工具栏搜索、排序、筛选弹层、缩略图range、详情开关。复用filterAssetLibraryItems(sort)；SWR重新请求实现刷新，不宣称本地目录扫描。
- page空态匹配官方图标/双按钮/说明，新建文件夹明确禁用待开发。计数来自实际filteredItems，不用假数据。page详情默认关闭，开启后使用已有预览/元数据组件。
- 325px侧栏在窄屏收为紧凑返回/根目录栏，内容滚动，键盘/原生输入保留。沿用semantic tokens，通过专用asset-library.css表达密度，无新依赖。

文件边界：AssetLibraryButton.tsx只提取/接mode、page控制，pages/AssetLibrary.tsx新壳、router/routes.tsx路由、App.tsx壳例外、styles/asset-library.css与index.css样式、必要测试。不改后端/数据库、文档/生成内容。回滚删route并恢复导航弹窗即可，测试素材不删除。
