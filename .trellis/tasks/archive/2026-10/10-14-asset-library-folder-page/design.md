# TASK-036 设计

沿TASK-032唯一AssetLibraryWorkspace扩展目录展示与素材移动；新AssetLibraryFolders组件负责侧栏目录列表与创建/重命名表单，复用Radix/Input/Button/Select。不另造媒体查询、预览、元数据编辑或上传逻辑。

page持有目录SWR和URL folderId：选目录保留projectId及return route state，返回上级替换folderId，刷新按URL恢复。目录列表服务返回扁平结构，页面遍历生成层级与路径；没有目录时根目录保持官方30空态。目录缺失时明确失败并可回根，不把旧URL悄悄写入不存在目录。

Workspace接收page目录props，按目录过滤现有派生媒体列表；根目录保留selected-only资源和原可见global媒体兼容行为。项目中的global媒体可读/编辑自身metadata，但归入项目目录的移动禁用，不转移ownership。搜索限定当前目录；breadcrumb显示当前目录路径，计数来自当前目录文件与直属子目录。

创建入口统一同一表单（侧栏/空态/工具栏），名称校验与后端一致。创建成功进入新目录；重命名成功更新树/面包屑，失败保留草稿；Escape/取消无写入。窄屏通过文件夹Popover选择目录及创建/重命名，不隐藏所有目录操作。

媒体详情“移动到”使用Select展示根和目录全路径，提交复用同一个media PUT调用，成功revalidate并自然离开原目录；失败保持原值。上传请求直接带当前folderId，单请求验证/保存，避免上传成功后分类失败造成未说明的根目录文件。

边界：media.ts和library-folders.ts API纯函数，AssetLibraryFolders.tsx目录UI，pages/AssetLibrary.tsx目录壳与SWR，AssetLibraryButton.tsx接目录并复用操作，专用CSS和有意义测试。无新增依赖、不改其他领域。
