# TASK-033 设计

Superpowers brainstorming；是已有素材流的有界扩展。方案一另建global页会重复媒体/目录逻辑；方案二继续弹窗无法对齐37的范围侧栏；选择扩展唯一AssetLibrary页面和workspace，既有icon弹窗保留。scope=all表示范围导航页，可加projectId切换；原/assets?projectId仍是项目专页，兼容返回。

Page复用projectsKey/getProjects、libraryFoldersKey/getLibraryFolders；global目录key总是有效。新增AssetLibraryScopes纯导航UI：桌面范围列表/窄屏Select（根+当前active项目），URL选择删除folderId、保留return state。Scope变化以workspace key重置旧筛选/详情，目录弹窗scope key隔离。无projectId时标题素材库、全局素材；项目导航页标题项目素材、项目名。项目列表加载/失败可见，不将unknown project当global。

根导航AssetLibraryButton variant=navigation改为React Router Link全局/assets?scope=all，project仍旧URL；icon版弹窗原样。页返回原入口，scope=all直接进入回根项目管理。所有目录操作沿TASK-036，不新建第二套。

媒体DELETE业务service新增DeleteInScope(id,projectID)：查询真实owner，不符/缺失返回false且不写；HTTP仍existing envelope404。物理删除内部其他caller继续Delete。前端按asset.projectId调用delete，随后revalidate当前列表，不把global响应覆盖project缓存。分类/metadata既有owner规则保留；本项不进行实际验收素材删除。

改动边界：pages/AssetLibrary、AssetLibraryScopes新UI、AssetLibraryButton与专用CSS/测试；backend media store/handler与isolated app regression修复删除范围校验。其他领域/外部provider无改动。
