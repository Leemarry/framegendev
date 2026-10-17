# MediaGo Drama 0.1.17 差距表

本文件是 0.1.17 复刻项目的**唯一事实源**。每完成一个功能点就更新它的状态行；不另写交接、需求或台账副本。

- 官方版本：`E:/AI/MediaGo Drama`（0.1.17）
- 我们的仓库：`E:/AI/framegendev`
- 官方前端参考源码：`.cache/ref/web/assets/*.js`（`drama-server.exe` 隔离运行导出，见 `scripts/parity/export-official-web.py`）
- 截图基线：`E:/AI/mediago-gap-shots/快照-0.1.17-完整流程-2026-10-17/`（26 张有效）、`screenshots/`（106 张）、`exe-flow/`（43 张）

## 状态口径

| 标记 | 含义 |
|---|---|
| ✅ | 已对齐（结构、交互、文案可用，且有真实流程验证） |
| 🟡 | 部分对齐（主体存在，缺官方的一段交互/文案/接口） |
| ❌ | 缺失 |
| 🅿 | 【待接入】商业服务（登录/会员/积分/充值/飞书/云端），只保留结构，不伪造成功 |
| 🚧 | 【待开发】依赖尚未就绪的底层（桌面壳、运行时安装框架） |

工作量：`S` ≤ 半天，`M` 约 1 天，`L` 2 天以上。

## 证据分层

写结论时按这四层标注，不允许把低层当高层：

1. **可见**：截图、i18n 文案、DOM class。只能说明"官方有这个东西"。
2. **运行**：官方实例实际渲染/CDP 观察到的状态。能说明交互行为。
3. **结构**：chunk 源码里的组件、路由、IPC、API 调用。能说明实现约束。
4. **推断与限制**：以上都拿不到时的合理推断，必须写清限制。

没有经过第 2 层验证的能力，状态最多到 🟡。

## 总览

| 模块 | 条目数 | 主要工作量 | 当前状态 |
|---|---|---|---|
| [shell：路由与工作区壳](#shell) | 21 | 1 L / 6 M / 10 S | 🟡 |
| [assets：素材库](#assets) | 21 | 3 L / 9 M / 9 S | 🟡 |
| [documents：文档工作区](#documents) | 14 | 3 M / 8 S | 🟡 |
| [episode：剧集与剪辑](#episode) | 15 | 2 L / 4 M / 6 S | 🟡 |
| [generation：生成与生成历史](#generation) | 16 | 1 L / 8 M / 5 S | 🟡 |
| [agent：Drami](#agent) | 18 | 2 L / 11 M / 5 S | 🟡 |
| [settings：设置](#settings) | 25 | 7 L / 9 M / 7 S | 🟡 |
| [newtools：工作流/浏览器/运行时](#newtools) | 15 | 7 L / 6 M / 2 S | ❌ |
| [electron：桌面壳](#electron) | 待任务 2.5 | 待评估 | ⏳ |
| **合计** | **145** | — | — |

建议实施顺序（`DEEPSEEK.md` §6 任务队列）：路由对齐 → shell 收尾 → 项目管理页 → REA 壳分析 → 素材库 → 文档工作区 → 生成历史 → Drami → 设置 → 剪辑工作台 → 新增工具。

---

<a id="shell"></a>
## shell：路由与工作区壳

官方证据来源：`workspace-bootstrap-B2gIwLIX.js`（路由表 `xw`、屏幕层级 `sg`）、`projects-CRxAboE1.js`、`Projects-*.js`、`i18n-C-qwNjMx.js` 的 `userMenu` / `projectSidebar`。

| 模块 | 功能点 | 官方证据 | 我们现状 | 缺口 | 工作量 | 状态 |
|---|---|---|---|---|---|---|
| shell | 路由 `/library` | `workspace-bootstrap` `xw`：`{path:"/library",element:aw}` 懒加载 AssetLibrary；`tg()` 有 projectId 时映射 `project-asset-library`，无则 `asset-library` | `router/routes.tsx` 用 `/assets` | 改成 `/library`（子路径 `/library/*`），`/assets` 重定向；`AssetLibraryButton` 跳转和 `sidebar-navigation` 屏幕映射一起改 | S | ❌ |
| shell | 路由 `/history`、`/history/{image,video,text,audio}` | `ow/sw/cw/lw/uw` 对应 `GenerationHistory-*.js` 的 `GenerationHistoryHome/Image/...`；侧栏标题 `generationCenter:生成历史` | 无这些路由；生成历史走 `GlobalToolboxDrawer` 抽屉 + `MediaGenerationHistory.tsx` | 加 5 条整页路由；侧栏加 `generation-history`(level 2) 和 `project-generation-center`(level 3)；按钮改跳路由 | M | ❌ |
| shell | 路由 `/project-settings` | `rw` 是 `ProjectSettings-*.js`；带 projectId 进 `project-settings` 屏，不带进 `projects` 屏 | `pages/ProjectSettings.tsx` 存在但未注册；项目设置借用 `/settings?projectId=`（`workbench-route.ts:30`） | 加独立路由，`/settings?projectId` 做兼容重定向；`ProjectNavigatorProjectPanels.tsx:454` 改跳 | S | 🟡 |
| shell | 路由 `/agent`、`/agent/archived` | `iw` 是 `GlobalAgent-*.js`；屏幕 `global-agent`(2)、`global-agent-archive`(3) | `routes.tsx:74` 把 `/agent` 重定向到 `/projects`；侧栏 Drami 按钮 disabled | 补 GlobalAgent 页（复用 `domains/agent` 的 AgentChat/AgentTimeline），开放侧栏入口 | L | ❌ |
| shell | 路由 `/embedded-browser/*`（8 个子路由） | `xw` 前 8 项：profiles/bookmark/download/downloads/import/upload/prompt；`Cw` 遇 `/embedded-browser` 前缀绕开工作区壳 | 无 | 仅桌面端使用；建壳 + 8 页骨架，真实渲染依赖 Electron WebContentsView → 🅿 | L（骨架 M） | 🅿 |
| shell | `/` 与 `/projects` 语义 | `bw`：`/` 按 mode 渲染 Studio 或 Projects；`tg`：`/projects` 对应 `project` 屏 | `RootShell` 和 `Home` 已一致 | 无 | - | ✅ |
| shell | 独立调试入口 | `index-shuvi2qg.js`：`/debug/center` 和 `/debug/system-prompts` 各有 bootstrap | `pages/Debug.tsx` 没挂到入口 | 补两个调试页入口，可放设置-调试下 | S | 🟡 |
| shell | 侧栏屏幕层级 | `sg={projects:1,studio-types:1,project:2,project-asset-library:3,project-generation-center:3,project-settings:3,global-agent:2,global-agent-archive:3,asset-library:2,generation-history:2,studio-conversations:2}`，settings 9999 | `lib/sidebar-navigation.ts` 只有 5 种屏幕 | 补 6 种屏幕和标题（`ug()`）；`SidebarScreenStack` 动画层级按 `sg` 走 | M | 🟡 |
| shell | 项目卡：在新窗口中打开 | `actions.openInNewWindow:在新窗口中打开`、`openWindowFailed:无法打开项目窗口` | `Projects.tsx:151` 已有 `openProjectWindow` | 核对菜单文案和失败提示 | S | 🟡 |
| shell | 打开已有项目目录 | `projects-CRxAboE1.js`：`POST /projects/reopen {directory}`（timeout 120s）单步完成；返回 `{project,assets:{issues,unresolvedLinks}}`，有问题时 warning `reopenNeedsRepair` | `domains/projects/api/projects.ts:104-115` 分两步 `/projects/open/preview` + `/projects/open` + fingerprint | 后端加 `/projects/reopen`（或改造 open）返回 assets 修复信息；前端改单步 + 修复提示 | M | ❌ |
| shell | 项目导入/导出 | `GET /projects/{id}/export` 返回 blob 下载；`POST /projects/import` 用 `application/octet-stream`，上限 2 GiB，扩展名 `.mediago-project`，类型名"MediaGo 项目归档" | `projects.ts:118-145` 用 JSON 传本地路径，扩展名 zip | 改二进制上传/下载流式接口（浏览器端也能用）；扩展名和文案改"项目归档"；加 2 GiB 校验 | M | 🟡 |
| shell | 项目卡封面/调色 | 每张卡拉 generation 的 `kind:image` 素材作封面，用 `resource-card-palette` 取色；`project-folio-label-{id}` 白字阴影，3:4 | `Projects.tsx` 卡片没有封面也没取色 | 补封面拉取和 palette 渐变，标签按有无封面切换样式 | M | ❌ |
| shell | 项目元数据 | `GET /projects/{id}/metadata` | 无 | 后端加接口（卡片/概览用），前端 api 补上 | S | ❌ |
| shell | 项目创建权限门 | `fa.requestProjectCreationAccess()`、`entitlement.defaultTitle:需要 Drama 会员权益` | 无 | 留钩子，标【待接入】 | S | 🅿 |
| shell | 账户菜单：头部 | `userMenu.menuLabel:用户菜单：{{name}}{{update}}`；未登录显示 `localUse:本地使用`/`notSignedIn`；头像首字母、会员徽章、积分 | `WorkspaceUserMenu.tsx:84-101` 触发器 `aria-label="用户菜单：未登录"`，身份区"未登录 / 本地使用"+"待接入"徽章 | 头像用通用图标而非首字母；会员徽章与积分需账户数据（🅿），本地态已真实 | S | 🟡 |
| shell | 账户菜单：更新提示 | `updateAvailable:，有可用更新`，触发器带红点 | 无 | 接应用更新状态（桌面端），显示红点和菜单项 | S | 🚧 |
| shell | 账户菜单：系统公告 | `GET /announcements`，SWR 每 60s；localStorage 键 `drama.announcements.last-seen.v1`；未读红点 + 弹窗"知道了" | `WorkspaceUserMenu.tsx:199` 是 disabled + 待接入 | 后端 `GET /announcements`（可返回空数组）；前端补公告弹窗和未读红点 | M | ❌ |
| shell | 账户菜单：反馈 | 弹窗 `feedbackDescription`，二维码 + `qqGroup:QQ群：1075312237` | 现在打开 GitHub issues（:205） | 改成反馈弹窗（二维码 + 群号） | S | 🟡 |
| shell | 账户菜单：帮助 | `N_="https://github.com/mediago-dev/mediago-drama"` | 打开 repositoryUrl | 核对 URL 是否一致 | S | 🟡 |
| shell | 账户菜单：语言 | `languageModes:{system:跟随系统,zhCN:中文,en:English}`，有 i18n 运行时 | `:46-53` 中文固定，另外两项待接入；全项目没有 i18n | 文案改"中文"；真正切换语言要引入 i18n（全局 L），否则保留【待接入】 | S / L | 🟡 |
| shell | 侧栏底部 | `nC`：用户菜单（flex-1）+ 通知按钮 size-9；全局底部是 Drami/项目管理/素材库/生成历史 | `ProjectNavigatorProjectPanels.tsx:135-170` | 结构已对齐；只剩 Drami 启用和两个按钮改走路由（见上） | - | ✅ |

**已对齐（无需再动）**：`/`、`/projects`、`/toolbox/*`（7 条）、`/settings`、`/prompt-pack-editor`、404；项目管理页三个 Tab（项目/归档/垃圾箱）、创建卡、重命名/归档/移到垃圾箱/恢复/永久删除及确认文案、空状态插图、归档时间戳；全局搜索 ⌘K、最近项目及其菜单；项目页导航（项目素材库/项目生成历史/项目设置）；分组/目录视图切换；深色模式；技能包管理；软件设置。

**限制**：参考包里没有 Electron 原生应用菜单（只有 web 资源），该项无法用 chunk 比对，见 [electron](#electron)。`RuntimeProjectCard`/`RuntimeProjectPanel` 属设置-安装设置，`ImportTarget` 属素材库，`ProfileMark`/`menu-item` 是通用小组件，均不计入本模块。

**官方有、我们 `services/server/internal/http/routes/routes.go` 没有的接口**：

- `POST /api/projects/reopen`（我们只有 `/projects/open`、`/projects/open/preview`）
- `GET /api/projects/:id/metadata`
- `GET /api/projects/:id/export`（blob 下载；我们是 `POST /projects/:id/package/export` 传路径）
- `POST /api/projects/import`（octet-stream；我们是 `POST /projects/packages/import` 传 JSON 路径）
- `GET /api/announcements`
- `/api/account/{session,login,login/:provider,bypass,commercial,links,usage,usage/tasks}`（`edition-CvYYe0B0.js`，🅿；至少让 `session/bypass` 返回本地模式）
- `/api/flow-runs`、`/api/flow-snapshots`、`/api/flow-snapshots/:id`，以及 flow-run 的 `cancel` 和 `stages/:stage/{confirm,reroll}`（工作流运行，见 [newtools](#newtools)）

---

<a id="assets"></a>
## assets：素材库

官方 0.1.17 把素材库重写成独立的 `/asset-catalog` 体系（i18n 命名空间 `assetHub.*`，API 客户端在 `useCatalog-CZ7EuMwb.js` 的 `ci()`）。我们还停在 0.1.8 的 `/media-assets` + `/asset-library-folders` 加前端过滤；`apps/workspace/src` 里搜不到 `assetHub`。

| 模块 | 功能点 | 官方证据 | 我们现状 | 缺口 | 工作量 | 状态 |
|---|---|---|---|---|---|---|
| assets | 路由与 URL 状态 | 路由 `path:'/library'`；从 URL 读 `view(directory/assets)`、`root(library/legacy-work)`、`folder`、`q`、`kind`、`tag`、`minRating`、`source`、`resource`、`usage`、`sort`、`favorite`、`status`、`includeDescendants`，用 replace 写回 | `routes.tsx` 是 `/assets`；`AssetLibraryButton.tsx` 筛选全在 useState，URL 只有 `scope`/`projectId`/`folderId` | 路由改 `/library`（`/assets` 重定向），筛选状态进 URL | M | ❌ |
| assets | 数据层/API | `useCatalog`：`ci('/assets',…,{limit:100})` 加 cursor 分页（useSWRInfinite）；写操作带 `expectedRevision` 和 `operationId:'op-'+uuid` | `api/media.ts` 一次拉全量，前端过滤 | 新建 `asset-catalog` api 模块：分页、revision 乐观锁、operationId | L | ❌ |
| assets | 浏览视图 | `assetHub.browseView`：directory/all/favorites/trash；`directoryBrowse`、`upOneLevel`、`openFolder`、`directoryCount`、面包屑；`U('/entries')` | 有目录浏览和"返回上级文件夹"，没有回收站视图，也没有 `/entries` | 补 view 切换（含 trash）、面包屑，改走 entries 接口 | M | 🟡 |
| assets | 回收站 | `trash`、`remove:'移入回收站'`、`restore`、`confirmRemove`、`trashed`；`/assets/{id}/restore`、`DELETE /assets/{id}`（带 revision） | "删除该素材？"是硬删除（"此操作不可撤销"） | 改软删除，加回收站视图和恢复 | M | ❌ |
| assets | 工作区文件根 | `root:'legacy-work'` → `assetHub.work:'工作区文件'` | 无 | 第二个根（项目工作区文件） | M | ❌ |
| assets | 文件夹树 | FolderTree `ke/Ae` 递归懒加载（`B('/folders')`），`onDropAssets` 用 dnd-kit；`B('/layout')` 返回 `folderRoles`（13 种）；`newSubfolder`、`folderActions`、`searchFolders`、`chooseFolderHint` | `AssetLibraryFolders.tsx` 有增/改/删/移，一次全量加载 | 补预设角色文件夹（layout 接口）、拖素材进文件夹、移动对话框里的文件夹搜索、子文件夹快捷新建 | M | 🟡 |
| assets | 新建文件夹对话框 | `POST /folders {name,parentId,operationId}`；`PATCH` 带 `expectedRevision` | `AssetLibraryFolderNameDialog` 已有 | 只差 revision / operationId | S | 🟡 |
| assets | 导入 | `POST /imports` multipart，`policy=keep-both`，带 `folderId`，`onUploadProgress`；导入队列 `importQueue/importProgress/clearCompleted/importStatus.*`，失败可 retry；`importDestination` | `uploadMediaAsset` 单文件，无进度、无队列 | 多文件队列、进度条、单项重试、目标文件夹提示、同名 keep-both | M | ❌ |
| assets | 导入关联目标 | `ImportTarget-DpUcK9iS.js`：`creationTarget.label:'关联文档 / 分镜（可选）'`，选项 libraryOnly | 无 | 新组件 ImportTarget，导入时可加入章节候选 | S | ❌ |
| assets | 刷新/扫描/事件 | `POST /refresh`、`DELETE /scans/{id}`、`xi=EventSource(ci('/events'))` 推送；`refreshing:'正在同步…'`、`synced` | 有 `/media-assets/scan`，同步调用 | 后台扫描任务、SSE 事件、取消扫描 | M | 🟡 |
| assets | 搜索/排序/筛选 | placeholder"搜索名称、标签、备注和关联对象"；`sortOptions` rating-desc/created-desc/updated-desc/name-asc；`B('/facets')` 分页；筛选 chip + `clearFilters` | 选项基本有，标签取自本地数据；没有 chip、没有 clearFilters | facets 接口、筛选 chip、清除筛选、补"名称"排序 | S | 🟡 |
| assets | 偏好持久化 | zustand persist `asset-library-preferences.v1`：`rowHeight` 96–280（默认 160）、`detailsVisible` | `thumbnailSize` 是 useState(190)，不持久化 | 持久化并对齐范围 | S | 🟡 |
| assets | 多选/批量 | `selected:'已选择 {{count}} 项'`、`bulkHint`、`commonTags`；批量 move/favorite/trash/restore；`selectedTray` | 单选 | 多选（Ctrl/Shift）、批量操作、批量属性面板 | L | ❌ |
| assets | 比较 | `compare:'比较两张图片'`，正好选中 2 张图片时可用；`zoomPreview/fitPreview` | 无 | 新增比较对话框 | S | ❌ |
| assets | 用于创作 | `useForCreation`、`useHint`、`copyOnlyHint`、`addedCandidate`、`savedToProject`；`POST /asset-catalog/use`；`/assets/{id}/copy-to-project` | 无 | 用于创作对话框（选项目 + 章节）、复制到项目 | M | ❌ |
| assets | 详情面板 | `basicInfo`；dimensions/duration/fileSize/format/addedAt/fileModifiedAt；`palette`/`copyColor`；`analyzing`/`retryAnalysis`；`sourceURL`；`folderLocation` + `changeFolder`；`technicalDetails`；评分；标签 chip；备注；自动保存 `saving/saved/saveFailed/unsaved/retrySave`；未选中时显示文件夹/视图属性 | `AssetLibraryMetadataEditor.tsx` 是表单 + 保存按钮，标签用逗号分隔 | 改成自动保存的属性面板，补主色板、媒体分析、来源网址、文件夹属性模式 | L | 🟡 |
| assets | 用途/使用状态 | `uses`、`removedUse`、`noUses`、`projectUse`、`useKinds.*`（project-reference / generation-input / generation-output / document-binding / generation-list / selected-resource） | 有 `/references` 加"已选用/候选/用作参考/未使用"筛选 | 补 useKinds 分类展示和"已移除的用途" | S | 🟡 |
| assets | 重新关联/修复 | `relink`、`relinkHint`、`relinkConflict`、`repair`、`missing`；`POST /assets/{id}/relink {targetAssetId,targetRevision}` | 无 | 缺失文件的重新关联流程 | M | ❌ |
| assets | 预览 | `previous/next`、`zoomPreview/fitPreview`、`previewFailed`、`openLocalDirectory`、`export`（`<a download>`） | 有预览/下载/在文件夹中显示 | 上一个/下一个、原始尺寸切换 | S | 🟡 |
| assets | 来源分组 | `sourceOptions` upload/browser/generation/other/unknown | 有（"浏览器采集（待接入）"） | 内嵌浏览器导入维持 🅿 | S | 🅿 |
| assets | 范围侧栏 | `assetSidebar.searchProjects`、`enterProject`、`noProjectAssets` | `AssetLibraryScopes.tsx` 有项目列表，没有搜索 | 侧栏加项目搜索；顶栏加"进入项目" | S | 🟡 |

**已对齐**：全局/项目范围切换、文件夹增删改移基础功能、收藏、评分、按类型/资源/来源/使用状态筛选、缩略图大小、在文件夹中显示、复制路径、媒体 content/poster 读取。

**官方有、我们没有的接口**（官方前缀 `/api/v1/asset-catalog{path}?projectId=`，`routes.go` 里一个都没有）：

- `GET /asset-catalog/assets`（cursor/limit + 上述筛选）、`GET/PATCH/DELETE /asset-catalog/assets/{id}`（expectedRevision、operationId）
- `POST /asset-catalog/assets/{id}/restore`、`/relink`、`/copy-to-project`
- `GET /asset-catalog/assets/{id}/analysis`（主色板/媒体信息）
- `GET /asset-catalog/entries`、`/facets`、`/layout`
- `GET/POST /asset-catalog/folders`、`PATCH /asset-catalog/folders/{id}`（带 revision）
- `POST /asset-catalog/imports`（multipart，policy=keep-both，folderId）
- `POST /asset-catalog/refresh`、`DELETE /asset-catalog/scans/{id}`、`GET /asset-catalog/events`（SSE）
- `POST /asset-catalog/use`

后端模型 `services/server/internal/domain/media_models.go` 需要扩展：`MediaAssetModel` 缺 revision、软删除状态、palette/分析字段、`location.root`；`AssetLibraryFolderModel` 缺 revision 和 role 绑定。`/api/v1/media-assets/{id}/content` 和 `/poster` 官方仍在用，我们已有。

---

<a id="documents"></a>
## documents：文档工作区

官方证据：`WritingWorkspace-D5-aetNc.js`（工作区壳）、`tiptap-*.js`（编辑器扩展）、`i18n-C-qwNjMx.js` 的 `documentWorkspace` / `comments` / `history` / `section` / `search` / `tracks` 命名空间。我们的实现在 `apps/workspace/src/domains/documents`（40 个源文件）。

| 模块 | 功能点 | 官方证据 | 我们现状 | 缺口 | 工作量 | 状态 |
|---|---|---|---|---|---|---|
| documents | 工作区视图与工具栏分组 | `views:`文档工作区视图、`content`正文、`timeline`时间轴；`openComments/closeComments`、`openResources/closeResources`、`collaborationTools`/`projectTools`/`historyTools` | `WritingWorkspace.tsx:70/81` 正文/时间轴 tab；`:113` CommentsGutter；`:118` EpisodeTimelineView；`DocumentHeaderActions.tsx:44-70` 变更记录/批注/资源栏开关 | 无（结构对齐） | - | ✅ |
| documents | 文档类型与新建入口 | `categories`：screenplay 剧本 / character 角色 / scene 场景 / prop 道具 / storyboard 分镜 / reference 资料 + overview；新建文档对话框含各类型说明与"其他方式""资料上传"分支 | `lib/categories.ts` 6 类齐（含 overview 过滤）；入口在项目侧栏 | 对话框本体文案与"其他方式/资料上传"分支需运行验证；侧栏入口与官方"新建文档"弹窗形态不一致 | S | 🟡 |
| documents | 章节历史 | `section.*`：区块历史、恢复当前区块到{{version}}、仅此区块（其他区块保持不变）、恢复会写入新的整篇历史、这个区块还没有历史版本 | `DocumentHistoryPanel` 只有整篇历史，无区块维度 | 加章节历史面板、区块级比较与恢复入口 | M | ❌ |
| documents | 整篇历史抽屉 | `history.*`：整篇文档/选择历史版本/恢复生成新版本/元数据变更提示/当前版本·时间/版本计数/`dirty`（等待保存完成）/`conflictDescription` | `DocumentHistoryPanel.tsx:282` 选择历史版本 combobox；`DocumentHistorySnapshot` 当前版本/历史版本 hash；恢复确认文案已有 | 缺 `historyRail`（当前 / 查看更早的 {{count}} 个版本）分组、元数据变更提示、保存中禁用文案 | S | 🟡 |
| documents | 差异视图 | `diff.*`：并列/统一布局、上一个/下一个变更、变更 {{position}} / {{count}}、阅读视图、源文件、展开 {{count}} 未变更行、无变化 | `DocumentHistoryDiff.tsx` 支持 parallel + reading | 缺布局切换按钮组、变更导航与计数、展开未变更行 | S | 🟡 |
| documents | 批注 | `comments.*`：正文/悬空 tab、批注分类、编辑/删除/保存、发送 {{count}} 条未解决批注给 Agent、+{{count}} 条批注折叠、resize | `CommentsGutter.tsx`：anchored/dangling tab（:36、:39）、提交 {{count}} 条未解决批注（:431）、标记已解决（:605）、隐藏批注（:332） | 缺批注分类筛选、单条批注的编辑/删除 | M | 🟡 |
| documents | 正文内查找 | 文档搜索：`搜索正文`、上一个/下一个匹配、第 {{position}} 个匹配共 {{total}} 个、没有匹配结果、Escape 关闭 | 无 | 缺正文内查找栏与快捷键 | S | ❌ |
| documents | 全局文档搜索 | `search.*`：搜索{{scope}}文档、所有项目/当前项目、最近文档/最近更新、标题匹配/正文匹配、找到 {{count}} 个匹配、部分项目文档加载失败 | 无（⌘K 只搜项目） | 缺文档搜索对话框 + 后端按标题/正文检索 | M | ❌ |
| documents | 资源预览栏 | `resourcePreview`：批量操作、`「{{title}}」还没有可生成的资源`、打开项目后预览文档生成的资源、调整资源预览宽度 | `StoryboardTimelinePanel.tsx:91` 分镜资源栏 + `ProjectAssetPreviewPane` | 缺批次操作按钮组、空态文案、拖拽调宽 | S | 🟡 |
| documents | 分镜同步轨道 | `tracks`：画面/旁白/字幕/音乐/素材 + 各自空态；`groupCount:{{count}} 个组 · {{duration}}`；折叠/展开分镜同步面板 | `StoryboardTimelinePanel.tsx:41-62` 5 轨齐全，空态文案与官方一致 | 音乐轨道标签写"背景音乐"，官方为"音乐"；缺分组计数与折叠按钮 | S | 🟡 |
| documents | 区块生成入口 | `章节音频`/`章节视频`；audio/video 生成弹窗的 `source`：文章语音 / 文章视频 / 文章生成 / 文章文本 | `DocumentSectionGenerator.tsx` + `GenerationModalShell.tsx` | 核对四种 source 文案与弹窗标题 | S | 🟡 |
| documents | 目录模式操作 | `directory.actions`：变更类型/新建子文件夹/重命名/删除/在文件管理器中展示；删除文件夹时子项上移；删除含 {{count}} 篇子文档需二次确认 | `lib/folder-actions.ts`、`lib/categories.ts`、侧栏目录模式 | 缺"变更类型"、删除文件夹"子项上移至上一级"提示文案 | S | 🟡 |
| documents | @提及与章节生成 | `document-mention` / `mention-resolver` / `mention-section-*` chunk | `lib/mention-suggestion.ts`、`lib/mention-resolver.ts`、`MentionSectionCreateDialog`、`MentionSectionTargetDialog` 全部已有 | 无 | - | ✅ |
| documents | 保存队列与冲突 | `window.saveConflict`、`window.saveFailed` | `DocumentStateSync`、`DocumentConflictNotice`、`stores/document-save-queue.ts` | 无 | - | ✅ |

**已对齐**：正文/时间轴双视图、评论栏与资源栏开关、整篇历史与并排差异、@提及解析、章节生成引用、保存队列与冲突提示、批注正文/悬空分类、文档 6 类型。

---

<a id="episode"></a>
## episode：剧集与剪辑

官方证据：`episode-D7cmY_MY.js`、`GenerationHistory-*.js`、`JianyingDraftPanel-DXNEnHGV.js`、`srt-parser-yw0KTlPU.js`，以及 `i18n-C-qwNjMx.js` 的 `workbench` / `export` / `previewError` / `frameCapture` / `tracks` 命名空间。我们的实现在 `apps/workspace/src/domains/episode`（50 个源文件）。

| 模块 | 功能点 | 官方证据 | 我们现状 | 缺口 | 工作量 | 状态 |
|---|---|---|---|---|---|---|
| episode | 剪辑工作台布局 | `title:剪辑工作台`、`close:关闭剪辑工作台`；素材区 / 预览 / 时间轴 / 检查器四区 | `EpisodeNLEWorkbench.tsx`：`剪辑素材区`、`剪辑预览`、`剪辑时间轴`、`片段检查器`、`片段参数` aria 齐全 | 无 | - | ✅ |
| episode | 撤销/重做 | `undoTimeline` / `redoTimeline` | `EpisodeNLEWorkbench.tsx:191/207` 撤销/重做 | 无 | - | ✅ |
| episode | 分割片段 | `splitClip:分割片段` | 无 | 按播放头分割片段的工具栏按钮与逻辑 | M | ❌ |
| episode | 吸附 | `snap:吸附`（开关） | 无 | 吸附开关 + 对齐到播放头/相邻片段 | S | ❌ |
| episode | 逐帧 | `nextFrame:下一帧` / `previousFrame:上一帧` | 无 | 逐帧按钮与快捷键 | S | ❌ |
| episode | 素材视图/筛选 | `viewAssets:素材视图`、`filterAssets:筛选素材` | 有素材区 + `搜索剪辑素材` + `素材分类` | 官方是"视图 + 筛选"两层，我们是单层分类；需运行核对 | S | 🟡 |
| episode | 生成剪辑方案 | `generatePlan:生成剪辑方案`；`previewProposal:预览{{label}}`、`apply:应用{{label}}`、`applyAll:全部应用`、`undoApply:取消应用{{label}}` | 无 | 方案生成（后端）+ 预览/应用/撤销（前端） | L | ❌ |
| episode | Drami 剪辑指令 | `command:Drami 剪辑指令`、`name:Drami 剪辑助手`、`readStoryboards:已读取 {{count}} 个分镜`、`defaultPrompt` | `EpisodeNLEWorkbench.tsx:424` 占位"Drami 剪辑助手【待开发】" | 接 agent 会话，输出剪辑指令并落到方案 | L | 🚧 |
| episode | 导出（视频 + 剪映） | `exportAll:导出全部分镜`、`exportAllTitle`、`exportJianying:导出剪映草稿`、`savedCount:已保存 {{count}} 个视频`、`skippedCount:跳过 {{count}} 个未生成分镜`、`partial`、`failedCount` | `EpisodeTimelineView.tsx:452` 剪映导出入口 + `EpisodeNLEExportDialog`（导出剪映草稿、已导出 N 个分镜） | 缺"导出全部分镜视频"（批量保存/下载）与跳过统计 | M | 🟡 |
| episode | 剪映导出前置校验 | `jianyingFolderMissing`（→设置里选草稿文件夹）、`jianyingNoClips`、`noVideos`、`exists`（同名草稿已存在）、`unsupported`（非本地素材无法写入） | `EpisodeNLEExportDialog.tsx:70` 只有"导出失败，请重试" | 补 5 类前置校验与精确文案 | S | 🟡 |
| episode | 预览失败态 | `previewError.title:预览播放失败`、`description`、`notReady:预览播放器尚未准备好` | 无 | 预览器错误态与重试 | S | ❌ |
| episode | 字幕 | `tracks.caption:字幕`、`captionEmpty:未填写对白字幕`；SRT 解析在 `srt-parser-*.js` | `EpisodeNLECaptionInspector.tsx` 有片段字幕编辑 | 缺 SRT 导入/导出（解析器已在官方包里，需自实现或引依赖） | M | 🟡 |
| episode | 截帧 | `frameCapture`：截取视频画面、保存首帧/尾帧、快捷截取（不定位直接入库）、拖动时间轴选帧、截帧时间输入 | 无 | 截帧对话框（写入素材库） | M | ❌ |
| episode | 保存草稿 | `saveDraft:保存草稿`、`save.*`（保存失败/文件已保存/视频素材保存失败） | NLE 编辑随项目状态持久化，无显式"保存草稿"入口 | 显式保存入口与失败提示需运行验证 | S | 🟡 |
| episode | 分镜同步面板 | `分镜同步` 5 轨 + `groupCount` + 折叠/展开 | `StoryboardTimelinePanel` 已有 | 同 documents 分镜同步行 | - | ✅ |

**已对齐**：NLE 三栏工作台、撤销/重做、素材区搜索与分类、片段检查器、音频目标轨道、画幅切换、剪映草稿导出主链路、分镜同步轨道、片段条播放/定位/生成。

**官方有、我们没有的接口**：剪映导出走本地草稿目录（`JianyingDraftPanel`，我们已有设置项）；方案生成与截帧若走后端，需要 `POST /episodes/:id/clip-plans` 与 `POST /generation/frames` 之类的新接口（官方 chunk 里未出现固定路径，属推断，实施前需用官方实例验证）。

---

<a id="generation"></a>
## generation：生成与生成历史

官方证据：`GenerationHistory-BX0kGHxc.js`、`MediaGenerationDialog-C_wPklEs.js`、`GenerationSettingsForm-D81TIX9P.js`、`useGenerationWorkspace-*.js`，以及 `i18n-C-qwNjMx.js` 的 `history` / `generation.sidebar` / `studio` / `materialDialog` / `dialogs` / `moreActions` / `documentResources` / `frameCapture` 命名空间。

官方接口（从上述 chunk 提取）：`/generation/{batches,estimate,models,notifications,notifications/events,notifications/read,provider-prompt-preview,selected-assets,selected-assets/:id,sessions,tasks,tasks/:id,voice-preview}`、`/media-assets/import`、`/messages/optimize-and-generate`。

| 模块 | 功能点 | 官方证据 | 我们现状 | 缺口 | 工作量 | 状态 |
|---|---|---|---|---|---|---|
| generation | `/history/*` 整页 | `GenerationHistoryHome/Image/Video/Text/Audio` 各为一个路由；左侧记录列表按类型分组，右侧详情 | 无路由；历史在 `MediaGenerationHistory.tsx` 面板 + `GlobalToolboxDrawer` 抽屉 | 建 5 条路由与整页布局（记录列表 + 详情），抽屉降级为快捷入口 | M | ❌ |
| generation | 生成会话侧栏 | `generation.sidebar`：groups 音频/图片/文本/视频生成、`newConversation`、新建会话对话框（生成类型 + 会话名称 + `{{kind}}探索`）、删除会话（"{{count}} 条记录一并删除"）、历史会话、当前 | 后端 `/generation/sessions` 全有（GET/POST/DELETE/preferences）；前端 `Studio.tsx` 用 `?conversation=` 定位，侧栏走 `studio-conversations` 屏 | 缺新建会话对话框（类型 + 名称）与分组标题文案；删除确认文案需对齐 | M | 🟡 |
| generation | 历史列表与状态 | `history.emptyKindTitle:暂无{{kind}}生成记录`、`emptyDescription`、`item.cancelled`、`item.failed`、`generating`、`timing.*`（已用/生成 {{time}}/导入 {{time}}）、`units`（张/段/个） | `MediaGenerationHistory.tsx`（44KB）含派生、用此提示词、复制提示词、选入 | 缺"已取消"状态、timing/units 文案、"素材导入"来源标签 | S | 🟡 |
| generation | 历史条目删除语义 | `item.delete{Title,Description}`（按 kind：删除这张图片？）、`deleteRecordTitle`、`deleteImported*`（仅从生成列表移除，素材库源文件保留）、`deleteMixed*`、`deleteAfterFinish` | 有删除，统一按记录删除 | 缺"素材导入项只移除列表项"的区分与混合确认文案 | M | 🟡 |
| generation | 历史操作菜单 | `history.actions`：`cancelGeneration`取消生成/取消中、`capture`截取画面、`copyPrompt`、`delete`、`derive`派生、`download`、`edit`、`editWithPrompt`用此提示词编辑、`preview`、`usePrompt`使用此提示词、`chooseFromLibrary`从素材库中选择 | 有派生/用此提示词/复制提示词/下载/预览 | 缺"截取画面"（视频结果 → 素材库）、"从素材库中选择" | M | 🟡 |
| generation | 选入/取消选入 | `selectImage/selectVideo/selectAudio/selectResult` + `cancel*` | `GenerationImagePreviewSlider.tsx:55` 选入/取消选入 | 无 | - | ✅ |
| generation | 生成通知 | `/generation/notifications`(GET)、`/read`、`/events`；`title:生成通知`、`{{count}} 条未读`、`全部已读`、`empty:生成完成后会显示在这里` | `GenerationNotificationSync` + `GenerationNotificationButton`；server 侧 `routes.go:461-486` 已有三组通知路由 | 缺未读数徽标与"全部已读"，SSE 断点需核对 | S | 🟡 |
| generation | 生成弹窗入口与标题 | `dialogs.titles`：生成视频、生成视觉素材 · {{section}}、生成视频素材 · {{section}} | `MediaGenerationDialog` + `MediaGenerationDialogHost` + `MediaGenerationDialogs` | 标题文案需按 section 场景区分 | S | 🟡 |
| generation | 素材库选择对话框 | `materialDialog`：从素材库选择、`{{count}} {{kind}} 项`、按 kind 的确认/上传/搜索/空态/无匹配、selectedCount、`designShot:镜头设计` | `MaterialLibrary.tsx` + `MaterialLibraryImportDialog.tsx` | 缺"镜头设计"入口；kind 级文案（"添加到生成列表"/"选择音频"）需核对 | M | 🟡 |
| generation | 生成参数控件 | `dialogs`：`count`生成数量、`primary/secondary`（其他设置）、`reference`（使用参考素材/参考图）、`voice`音色（全部/收藏 + 年龄/性别/语言/音色风格） | `BatchGenerationSettingsDialog`、`ReferenceSelectionDialog`、`MediaGenerationDialogs.tsx:233-660` 音色选择（收藏持久化 `generation.minimax.voiceFavorites`） | 无 | - | ✅ |
| generation | 提示词操作 | `moreActions`：`copyPrompt`、`documentation`模型文档、`importPrompt`（覆盖并导入/替换当前编辑器提示词/禁用/无提示词/已一致/标题） | `PromptEditor` + `PromptOptimizeControl` | 缺"导入提示词（覆盖确认）"与"模型文档"链接 | S | 🟡 |
| generation | 生成设置表单 | `GenerationSettingsForm` + 模型/版本/供应商、`modelPicker`：ComfyUI 实例 / ComfyUI 工作流 / HyperFrames 模板 | `GenerationSettingsForm.tsx`(28KB) + `useGenerationSettingsForm.ts`(30KB) + `GenerationModelRoutePicker` | 缺 comfyInstance / comfyWorkflow / hyperFramesTemplate 三类选择器 | M | 🟡 |
| generation | 生成预设 | `modelPreset:生成预设`、`unavailableModel`、`chooseModel:选择预设模型`、`clearPreset`、`presetNotConfigured`、`optionalPreset`、`catalogError` | 无（`apps/workspace/src` 搜不到"生成预设"） | 加预设选择器与不可用提示 | M | ❌ |
| generation | 文档资源批量生成 | `documentResources`：`batchGenerate:批量生成`、全选/清空、按类型空态、卡片主图与预览 nth、状态 pending/failed/completed | 无 | 文档资源面板批量生成（与 episode 分镜联动） | L | ❌ |
| generation | 截帧 | `frameCapture`（同 episode） | 无 | 与 episode 共用同一个截帧组件 | M | ❌ |
| generation | 生成预估 | `POST /generation/estimate` | 无（`routes.go` 无 estimate） | 后端加接口；积分预估部分 🅿 | S | 🅿 |

**已对齐**：批量生成设置、参考素材选择、图片贴纸编辑、提示词优化、音色选择与试听（含收藏）、任务取消/重试、SSE 通知主链路、`/generation/selected-assets` 增删查、`/messages/optimize-and-generate`。

**官方有、我们 `routes.go` 缺的接口**：`POST /generation/estimate`、`POST /generation/provider-prompt-preview`。

---

<a id="agent"></a>
## agent：Drami

官方证据：`GlobalAgent-BS94XvQE.js`、`agent-Bi7lj6gm.js`（API 客户端）、`workspace-bootstrap-B2gIwLIX.js`（悬浮窗、起点卡片、侧边栏）、`AgentCoreMotionPanel-BDGfylKU.js`、`i18n-C-qwNjMx.js` 的 `quickStarts` / `runtimeConfig` / `sessions` / `agentSurface` / `agentSidebar` / `archivedAgent` / `agentCoreMotion`。

| 模块 | 功能点 | 官方证据 | 我们现状 | 缺口 | 工作量 | 状态 |
|---|---|---|---|---|---|---|
| agent | `/agent` 全局页 | `GlobalAgent-*.js` 渲染 `<s globalScope readOnly={isArchived}/>`；`workbench-route` 有 `p=e=>e==="/agent"\|\|e==="/agent/archived"` | `router/routes.tsx:74` 把 `/agent` 重定向到 `/projects` | 新建 GlobalAgent 页，用 `globalScope=true` 复用 AgentChat，不传 projectId | M | ❌ |
| agent | `/agent/archived` 归档页 | 用 `?agentSessionId=`；无参数显示"选择归档会话 / 从左侧选择一条归档会话查看完整内容" | 无 | 加路由、空态和只读模式（禁用 composer） | M | ❌ |
| agent | Drami 侧边栏（全局会话） | `agentSidebar`：返回项目/新建会话/已归档会话（带计数），标题写死 `Drami`，会话列表 `appearance:"status-dot"`、`projectId:null` | `ProjectNavigatorProjectPanels.tsx:141` 只是"Drami · 待接入"占位 | 侧栏需要 Drami screen：会话列表、状态点、归档入口 | M | ❌ |
| agent | 会话管理菜单 | `sessions.*`：归档会话/恢复会话/永久删除/运行中无法归档/所有会话/还没有归档会话/飞书来源标签 | `AgentPanel.tsx:182-397` 只有"历史会话"弹层 | 补每行 `⋯` 菜单（archive/restore/delete）、active/archived 两种 lifecycle、运行中禁用 | M | 🟡 |
| agent | 全局空态与起点 | `quickStarts.globalTitle`：Drami 可以帮你做什么？；`globalDescription`：这里不读取任何项目内容；4 张卡：解答 Drama 使用问题 / 创建或修改技能包内容 / 创建 ComfyUI 工作流 / 创建 HyperFrames 模板 | 搜不到 `quickStarts` | 新建 AgentQuickStarts 组件，点卡片把 prompt 填进输入框（不直接发送） | M | ❌ |
| agent | 项目空态与起点 | `projectTitle`：今天想创作什么？；`projectDescription`：选一个起点，我会把完整需求放进输入框；4 张卡：从灵感开始写剧本 / 把故事拆成分镜 / 为我构思一个好故事 / 看看 Agent 能帮我什么 | 无 | 同上，项目作用域 4 张卡 | S | ❌ |
| agent | 项目内悬浮 Agent 面板 | `section.global-agent-surface`，`absolute z-[45] bottom-4`，折叠 `h-12` 胶囊，展开 `--global-agent-width/height`（320×280 ~ 2400×1600）；拖动、四角与边缘 resize、键盘微调、拖放附件、`data-agent-surface-layer` | `App.tsx:139` 是全屏 `AgentPanel` 页签（文档/agent 二选一） | 改成悬浮窗口：拖动/缩放/折叠、位置尺寸持久化、弹层用 surface-layer context | L | ❌ |
| agent | 运行中会话指示 | `agentSurface.runningCount:{{count}} 个执行中`、`#agent-running-sessions` 弹窗、`/agent/sessions/running` | 无 | 折叠胶囊与标题栏加入口 | S | ❌ |
| agent | Composer 运行时选项 | `runtimeConfig`：模型（提供商 + 模型）、推理强度（最低/低/中/高/极高/超高）、权限（请求批准/帮我批准 autoReview/完全访问）、速度 `serviceTier`（标准/快速/弹性/优先） | `AgentRuntimeConfigControls.tsx:110-133` 有模型、推理强度，权限叫"模式" | "模式"改名"权限"并对齐选项；新增"速度"下拉；补"默认提供方/默认速度/MiniMax 国内" | M | 🟡 |
| agent | Composer 提示与占位 | 项目：`@ 引用文档`、`/ 调起 Skill`、`Enter 发送`；全局：`/ 选择技能包内容`、`Enter 发送`，占位"向 Drami 提问，或让它创建和修改技能包内容" | `AgentChatComposerForm.tsx:151` 只有"@ 引用文档 · Enter 发送"，单一占位 | 改成快捷键 chip 列表；全局作用域换 hints 和 placeholder，并禁用 @ 引用 | S | 🟡 |
| agent | 技能包 Slash 菜单 | `skillMenu.authoringTitle:技能包内容`，kind 有 工作流/提示词/Skill，source 有 自定义/包内，还有"已覆盖" | `AgentSkillSlashMenu.tsx` 只列 Skill | 全局模式下列出技能包 authoring 内容（flow/prompt/skill）并加来源与覆盖标签 | M | 🟡 |
| agent | 附件上传 | `POST …/sessions/:id/attachments`（multipart、`X-Upload-ID`、进度）、`…/attachments/:aid/import` | `AgentChat.tsx:236,478` 直接写项目资料，无项目时报错"请先进入项目" | 改会话级附件上传（带进度），全局会话也能用 | M | 🟡 |
| agent | A2UI 交互决策 | `POST …/sessions/:id/interactions/:iid/decision {runId,actionId,values}` | `lib/a2ui-actions.ts` 存在 | 核对调用的端点是否是 interactions | S | 🟡 |
| agent | Drami 吉祥物与动效 | `agent-core-mascot-face/eye`、`data-agent-core-motion-layer=pose/ambient`；姿态 idle/thinking/working/waiting/success/error，标题栏 size-6、折叠态 size-16、空态 | 无 | SVG 吉祥物 + 姿态控制器，跟会话状态联动，支持 `mascotPaused` 与 motion-reduce | L | ❌ |
| agent | 设置「Drami 动效」页 | `AgentCoreMotionPanel`：自动播放开关、上一个/下一个状态、状态序列、三档生产尺寸 | `settings-navigation.ts:63-66` 是占位"尚未实现" | 实现预览面板，复用吉祥物组件 | M | ❌ |
| agent | 设置「Agent 扩展/工具」 | `AgentExtensionsPanel` 内嵌 xterm + `AgentToolsPanel`（ffmpeg 等命令工具可用性、转写 installNote、`/settings/transcription`） | `settings-navigation.ts:51` 只有标题 | 实现工具列表与可用性检测；xterm 可复用 `timeline/XtermView.tsx` | M | ❌ |
| agent | 调试「System Prompts」 | `SystemPrompts-*.js` + 独立 bootstrap；路径 `/debug/system-prompts`，只允许 localhost/127.x；按 scope(global/project) 过滤，展示规则数/条件/channel/bytes/digest/content | 无 | 加调试页 + 后端报告接口 | M | ❌ |
| agent | 飞书来源会话 | `sessions.feishu:飞书` | 无 | 只加标签，🅿 | S | 🅿 |

**已对齐**：ACP 时间线、工具卡、计划（livePlan）、权限请求卡、stateSync 恢复文案、会话状态文案、selection 卡、文档工具审批、SSE events（带 after 断点续传）、cancel/status、模型二级菜单。

**官方有、我们没有的接口**（`routes.go` 的 agent 路由只挂在 `projectRoutes` 下）：

- 全局作用域（不带 `/projects/:id` 前缀）整套：`POST /agent/sessions`、`GET /agent/sessions[?lifecycle=archived]`、`GET /agent/runtime-config`、`GET /agent/chat`、`GET /agent/sessions/:sid/chat|status|events`、`POST /agent/sessions/:sid/messages|cancel`、`POST /agent/sessions/:sid/permission-requests/:rid/decision`、`/agent/selections/:id[/decision]`
- `GET /agent/sessions/running`
- `POST /agent/sessions/:sid/archive`、`/restore`、`DELETE /agent/sessions/:sid`
- `POST [/projects/:id]/agent/sessions/:sid/attachments`（multipart）与 `…/attachments/:aid/import`
- `POST [/projects/:id]/agent/sessions/:sid/interactions/:iid/decision`
- `POST /agent/sessions` 的 body 支持 `{newSession}`
- `runtime-config` 返回值要带 `serviceTier` 和 permission 的 `autoReview/fullAccess`
- `GET /debug/system-prompts`（带 scope 参数）

---

<a id="settings"></a>
## settings：设置

官方侧栏结构取自 `workspace-bootstrap-B2gIwLIX.js` 的 `X_` 函数，文案取自 `i18n-C-qwNjMx.js` 的 `settingsSidebar` 和 `Xt`。四组顺序：

- **工作区**：账户（`account.settings@1` 门控）/ 用量分析（`account.usage@1` 门控）/ 基础设置 / 浏览器设置 / 存储管理 / 快捷键 / 应用更新
- **生成服务**：本地 ComfyUI(`local-models`) / 云端 ComfyUI(`cloud-comfyui`) / MG 动画(`mg-animation`) / 安装设置(`runtime-source-settings`)
- **生成配置**：模型接入(`api-keys`) / Agent 扩展(`agent-extensions`) / 飞书 Agent(`feishu`) / 技能包(`prompt-packs`) / Drami 动效(`agent-core-motion`)
- **调试**：只在打开调试模式时出现，里面只有"调试页面"(`debug`)

Tab 从 URL `?tab=` 读取并经 `Hf` 归一化：`runtime` → `local-models`，`codex-access` / `codex-relay` → `api-keys`。

| 模块 | 功能点 | 官方证据 | 我们现状 | 缺口 | 工作量 | 状态 |
|---|---|---|---|---|---|---|
| settings | 侧栏分组、顺序、tab 值 | `X_`；value 用 `api-keys`/`agent-extensions`/`local-models`/`cloud-comfyui`/`runtime-source-settings`/`account-usage`/`feishu`/`agent-core-motion` | `lib/settings-navigation.ts` 的 `officialSettingsGroups`；`ProjectNavigatorPanels.tsx` 的 `settingsNavGroups()` | 四组顺序已对齐，但 value 不同（我们是 `model-access`/`extensions`/`comfyui-local`/`comfyui-cloud`/`installation`/`billing`/`feishu-agent`/`drami-motion`）；"生成配置"多挂了 Codex 技能和智能体指令；缺"调试"组；`normalizeSettingsTab` 缺 `Hf` 映射 | S | 🟡 |
| settings | 账户/用量门控 | `ma('account.settings@1')`、`ma('account.usage@1')` | 两项常驻 | 改成按 capability 显示，商业部分 🅿 | S | 🟡 |
| settings | 基础设置 | `AppearancePanel`：外观（浅色/深色/跟随系统）、语言（zh-CN/en + "跟随系统语言，当前为 {{language}}"）、工作区目录、使用偏好（匿名使用数据、调试模式开关）；`/settings/ui-preferences` | `BasicSettingsPanel.tsx`：语言只有简体中文【待开发】，匿名统计与调试模式都是占位 | 接 ui-preferences 读写；调试开关驱动侧栏"调试"组；英文语言包（i18n 是 L） | M | 🟡 |
| settings | 浏览器设置 | `BrowserSettingsPanel`：默认搜索引擎（百度/Google）、自定义搜索引擎增删改（最多 20 个，模板 `%s`）、弹窗表单 | `PendingSettingsPanel` 占位 | 整页缺失，后端缺偏好存储 | M | ❌ |
| settings | 存储管理 | `StorageSettings`：当前工作区、预览缓存总预算、按分类预览清理、候选清理量、保留、legacyNotice；`GET /settings/storage`、`POST /settings/storage/preview`、`POST /settings/storage/cleanup` | `StoragePanel.tsx` 调 `/storage/statistics` 和 `/storage/poster-cache/*` | 改成官方分类预览/清理协议（previewId）并重写文案 | M | 🟡 |
| settings | 应用更新 | `UpdatesPanel`：软件版本 + 运行时版本两行、更新策略、更新通道（"由安装包决定"）、校验中、回滚（"已恢复上一运行时版本"） | `UpdatesPanel.tsx` 只有桌面端（GitHub Releases） | 补运行时版本行、通道/策略行、校验和回滚状态 | M | 🟡 |
| settings | 快捷键 | 23 条文案 | `ShortcutKeysPanel.tsx` | 无 | - | ✅ |
| settings | 模型接入 | `APIKeysPanel`：Codex 接入（ChatGPT 订阅 + 中转渠道列表，新增/编辑/测试/删除/清 Key、切换全局账号）、会员 CLI 接入、其他接入方式（自定义接口 + 官方供应商）；连接卡状态（已配置/部分已配置/等待授权/由应用管理/高级设置）；`/settings/generation/providers`、`/settings/codex-relay/channel`、`/settings/codex-relay/profiles/:id/api-key` | `model-access/ModelAccessPanel.tsx` 分四块（Codex、会员 CLI、官方 API、聚合平台）+ `CodexRelayPanel.tsx` | 分组改成"会员 CLI / 其他接入方式（自定义接口、官方供应商）"；中转改多渠道列表 + channel 切换；provider 数据改走 `/settings/generation/providers` | M | 🟡 |
| settings | Agent 扩展 Tab 容器 | `AgentExtensionsPanel` 下三 Tab：技能(`CodexSkillsPanel`) / MCP(`CodexMCPPanel`) / 工具(`AgentToolsPanel`)，URL `section=skills\|mcp\|tools` | `CodexSkillsPanel.tsx` 是独立侧栏项；`extensions` 是占位 | 新建 Tab 容器，把 CodexSkills 挪进来 | S | 🟡 |
| settings | ↳ MCP | 分"MediaGo 管理"与"外部配置"（全局/项目），可安装/更新/卸载、看进度与文档；`/settings/codex-mcp` | 无 | 前后端都要新建 | L | ❌ |
| settings | ↳ 工具 | "音视频转录"模型可下载/切换/删除/修复（带进度）；"Agent 命令工具"列表（随应用提供/系统环境/未检测到）；`/settings/agent-tools`、`/settings/transcription` | 无 | 前后端都要新建（依赖 Runtime） | L | 🚧 |
| settings | ↳ 技能 | 汇总卡（总数/可用/需处理/未确认）、状态与来源筛选、详情抽屉 | `CodexSkillsPanel.tsx` | 基本对齐，核对汇总卡文案 | S | 🟡 |
| settings | 飞书 Agent | `FeishuPanel` + `FeishuRuntimeFields`：扫码建机器人（二维码倒计时、替换）、手动填凭据、允许的 Open ID、启用开关、连接状态（检查配置/重新连接/待发送/失败计数）、专用模型与思考强度；`/settings/feishu`、`/status`、`/check`、`/reconnect`、`/chats`、`/onboarding`、`/onboarding/:id/poll` | 占位 | 页面结构照官方搭好，🅿 | M | 🅿 |
| settings | 技能包 | `PromptPacksPanel`：技能/提示词/工作流三个目录、搜索、按来源/分类/状态/所属技能包筛选；只读 Quick Look（上一个/下一个，工作流显示画布预览，受保护内容只显示索引）；顶部导入 + 技能包管理 | `pages/Debug.tsx` 的 `prompt-packs` 调试 tab + `debug/PromptPackWorkspace.tsx`（编辑器形态） | 缺官方目录 + Quick Look 视图；编辑器退到"技能包管理"入口后 | L | 🟡 |
| settings | Drami 动效 | `AgentCoreMotionPanel`：姿态预览（静候/思考/执行/等待/完成/异常）、自动轮播、三档尺寸 | 占位 | 纯前端动效页（与 agent 吉祥物同一组件） | M | ❌ |
| settings | 本地 ComfyUI | `ComfyUIRuntimePanel`：下载源码安装；模型目录与工作流目录可打开/重新扫描；工作流分视频/图片，状态有可用于 Drama/未发布/发布无效 | 占位 | 依赖 Runtime；先搭结构 | L | 🚧 |
| settings | 云端 ComfyUI | `CloudComfyUIPanel`：实例连接增删/启用/测试、桥接器版本检测、已发布工作流列表；`/settings/generation/comfyui/connections`、`.../bridge/prepare` | 占位 | 前后端都要新建 | L | ❌ |
| settings | MG 动画 | `HyperFramesRuntimePanel`：我的模板（新建/导入/预览/删除，Blank 与 Warm Grain）、官方技能安装与更新 | 占位 | 依赖 Runtime；先做结构 | L | 🚧 |
| settings | 安装设置 | `RuntimeSourceSettingsPanel` + `RuntimeWorkspaceAvailability`：下载来源（国内镜像/官方源 + 官方源备用开关）、动态表单字段（上移/下移/添加地址）、恢复默认、未保存修改拦截；安装位置可自定义；`/settings/runtime/source-settings`（含 `/active-profile`、`/official-fallback`、`/reset`）、`/settings/runtime/workspace` | 占位 | 前后端都要新建 | L | ❌ |
| settings | 账户 | `AccountPanel`：账户概览（登录/退出）；会员与积分（当前版本、项目上限、可用积分、到期、刷新、充值）；`/account/session`、`/login`、`/links` | `AccountPanel.tsx` 结构已有，标🅿 | 结构已对齐，商业维持🅿 | S | 🅿 |
| settings | 用量分析 | `AccountUsagePanel`（recharts）：积分统计、每日图表、按模型、任务明细分页、明细弹窗（计费方式/单价/RequestId）；`/account/usage?days=`、`/account/usage/tasks` | `domains/billing/components/BillingPanel.tsx`（本地 Token 表） | 布局改成官方图表 + 分页明细；积分数据🅿，本地数据可继续用 | M | 🟡 |
| settings | 调试 | `DebugPanel`：单卡"Drama 调试中心" + "打开调试中心"，走 `/debug/center/browser-link` | `pages/Debug.tsx` 有多个 tab（智能体指令、技能包） | 改成单页 + 外链调试中心；智能体指令挪出侧栏 | S | 🟡 |
| settings | 剪映草稿 | 官方 `R=!1`，入口隐藏 | `Settings.tsx` 里 `jianyingDraftSettingsEnabled=false` | 无 | - | ✅ |
| settings | 项目设置 | `ProjectSettings`：技能包 / 飞书群 / 项目文件 / 项目管理；标题"项目设置 · {{name}}"；技能包可选 inherit 或 custom 启停（"已启用 {{enabled}} / {{total}}""恢复全局默认""冲突提示"）；飞书群可选群/搜索/加载更多/群内允许用户/项目单独模型/解除绑定；`GET/PUT /projects/:id/prompt-packs`、`/projects/:id/feishu` | `pages/ProjectSettings.tsx`，侧栏在 `ProjectNavigatorPanels.tsx:660` 附近 | 四个分类与项目管理已对齐；缺项目级技能包启停（前后端）；飞书群目前只显示"待接入"，需补完整表单结构 | M | 🟡 |
| settings | 设置外壳原子组件 | `SettingsSection`/`Group`/`Row`/`Item`/`Field`/`Status`/`FormActions`/`settings-layout`/`settings-feedback` | `SettingsPanelLayout.tsx`、`lib/settings-layout` | 缺 Section/Row/Field/Status/FormActions 原子层，新面板先补齐 | S | 🟡 |

**已对齐**：快捷键、剪映草稿（隐藏）、项目设置的项目文件与项目管理、Codex 技能主体、账户页结构。

**官方有、我们没有的接口**：

- 偏好与存储：`/settings/ui-preferences`；`/settings/storage`（GET）、`/storage/preview`、`/storage/cleanup`（我们只有 `/storage/statistics`、`/storage/poster-cache/*`）
- 模型接入：`/settings/generation/providers`；`/settings/codex-relay/channel`；`/settings/codex-relay/profiles/:id/api-key`；`/settings/api-keys/:provider/login/check`
- Agent 扩展：`/settings/codex-mcp` 及其子路由、`/settings/agent-tools`、`/settings/transcription`
- Runtime/ComfyUI：`/settings/runtime/source-settings`（含 `/active-profile`、`/official-fallback`、`/reset`）、`/settings/runtime/workspace`、`/settings/runtime/projects`（含 install/cancel/service/logs/skills/templates/models/resources/workflows）、`/settings/generation/comfyui/connections`（含 `/:id`、`/:id/check`、`/:id/workflows`）、`/settings/generation/comfyui/bridge/prepare`
- 飞书（🅿）：`/settings/feishu`（含 `/status`、`/check`、`/reconnect`、`/chats`、`/onboarding`、`/onboarding/:id/poll`）、`/projects/:id/feishu`
- 项目技能包：`/projects/:id/prompt-packs`（GET/PUT）
- 账户（🅿）：`/account/{session,login,links,commercial,bypass,usage,usage/tasks}`
- 调试：`/debug/center`、`/debug/center/browser-link`

另外：我们 server 有 `/billing/summary`，官方没有对应接口；`/settings/model-platforms`、`/settings/codex-account`、`/settings/jianying-draft` 我们已有。

---

<a id="newtools"></a>
## newtools：工作流画布 / 内嵌浏览器 / 运行时

| 模块 | 功能点 | 官方证据 | 我们现状 | 缺口 | 工作量 | 状态 |
|---|---|---|---|---|---|---|
| newtools | 工作流画布编辑器 | `WorkflowCanvas-Bsr72eqv.js`(121KB) + `workflow-canvas-B1tguCME.js`（@xyflow/react 打包）；节点角色 input/stage/constant/result、子工作流 subflow；"开始搭建工作流""双击空白处创建节点""自动布局""删除连线""工作流名称/描述""公开接口""节点设置""必填输入""作为输出公开""常量文本""从选中的 {{count}} 个节点生成" | 已有 `@xyflow/react`，但只用在 `domains/episode/components/EpisodeCanvasView.tsx`、`canvas/EpisodeCanvasNodes.tsx` | 全缺：节点类型、端口类型（text/image/video/audio 及分组）、Inspector、子工作流、自动布局、多选生成、常量上传（单文件 64 MiB，存进技能包） | L | ❌ |
| newtools | 工作流执行面板 | `workflow-BVgqWbwe.js`："工作流执行面板""配置步骤""运行记录""下一次运行""等待确认""使用所选并继续/完成""重新生成""从头开始""补全输入：{{inputs}}""候选 {{index}}""在创作工作区打开" | 无 | 全缺：运行状态机（queued/running/awaiting/failed/cancelled）、多候选人工确认、按步骤选模型与预设、文本节点 LLM 改写 | L | ❌ |
| newtools | 工作流在生成弹窗里的入口 | `MediaGenerationDialog-C_wPklEs.js` 懒加载 `WorkflowSurface-DKekcKRB.js`，作用域 project/resource；标题"项目工作流""{{resource}}…"，资源类型 character/prop/scene/storyboard | 生成弹窗没有工作流 tab | 缺 WorkflowSurface 与项目/资源两级工作流文档 | M | ❌ |
| newtools | 技能包里的 flow 条目 | `PromptPackEditor-DH8viDnV.js`：`kind==='flow'` 用 `FlowEntryEditor-Bapm6Lin.js` 编辑（内嵌 WorkflowCanvas）；`PromptPacksPanel`："工作流目录""此技能包尚未添加工作流""新建空白工作流""手动创建工作流"；`/packs/:id/resources` | 后端 `domain/pack_models.go` 的 `Kind` 是自由字符串，服务层没有 flow 校验；前端技能包编辑器没有 flow 分支 | 前端缺 flow 条目的列表/编辑/新建；后端缺 `/packs/:id/resources`（常量媒体资源） | M | 🟡 |
| newtools | 工作流文档/运行 API | `/flows?projectId`、`/flow-runs`（GET 查询 / POST）、`/flow-runs/:id`、`/flow-snapshots`(POST)、`/flow-snapshots/:id`；`/workflow-documents`（GET ?projectId&scopeType&scopeId / POST）、`/workflow-documents/:id`(GET/PUT)、`/workflow-documents/:id/task-links`(GET/POST) | `services/server` 路由里都没有 | 全缺：表结构、migration、执行引擎（按 DAG 调现有 generation 服务） | L | ❌ |
| newtools | 内嵌浏览器主体 | `EmbeddedBrowser-DwScvRl_.js` 调桥接 createTab/closeTab/activateTab/reorderTabs/navigate/goBack/goForward/reload/stop/showTabMenu；能力 `embedded-browser.native@2`、`.tools@1`、`.workspace@1`；"输入网址或搜索内容""在网页中查找""新建标签页""在外部浏览器打开""收藏当前页面" | `shared/desktop/actions.ts` 只有 openPath/openProjectWindow/notification/update | 页面结构（标签栏、地址栏、查找栏、收藏栏）可本地实现；真实网页渲染依赖 Electron WebContentsView → 🅿 | M（UI）+ 🅿 | 🅿 |
| newtools | 浏览器子窗口 | `desktop-browser-C80jxvl5.js`：`/embedded-browser/import`（网页截图/导入到 Drama）、`/profiles`（浏览器 Profile）、`/upload`（选择文件/Drama 素材选择器）、`/bookmark`、`/download`（保存到 Drama 素材库）、`/downloads`、`/prompt`（插入提示词） | 无路由 | 7 个窗口页都缺；截图框选、素材选择器、提示词插入可本地做 | M | ❌ |
| newtools | 收藏夹 | `bookmarks-BFG73xp-.js`：`/browser-bookmarks` GET/POST、`/:id` PATCH/DELETE、`/order` PUT（"所有项目共享的常用网页"） | 无 | 后端 CRUD + 排序，全本地可做 | S | ❌ |
| newtools | 浏览器下载入库 | `/browser-downloads` GET、`/:id` PUT{projectId,target}、`/:id/import` POST、`/:id` DELETE；"文件将由 Drama 下载并直接进入所选素材库""全局素材库" | 无 | 后端 API + 导入素材库本地可做；下载事件来源依赖桌面壳 | M | 🟡 |
| newtools | 浏览器设置 | `BrowserSettingsPanel-B-JYYFoe.js`：默认搜索引擎、添加/编辑自定义搜索引擎、Profile 管理（新建/删除/清除浏览数据） | `settings-navigation.ts` 的 `browser` 是"待开发"占位 | 搜索引擎配置本地可做；Profile 隔离依赖桌面壳 | S | 🟡 |
| newtools | 运行时项目框架 | `RuntimeProjectPanel/Card/Operation`、`RuntimeWorkspaceAvailability`：`/settings/runtime/projects`、`/:id/install`(POST/DELETE)、`/:id/install/cancel`、`/:id/service`(POST/DELETE)、`/:id/workflows/prepare`、`/settings/runtime/workspace` GET/PUT；`runtime.project.toasts.*`；starting 状态每 1500ms 轮询 | 无 | 缺统一的"安装→启停→日志→卸载"框架与进度轮询（本地进程管理可在 Go 侧做） | L | ❌ |
| newtools | 运行时下载源 | `RuntimeSourceSettingsPanel`：`/settings/runtime/source-settings` GET/PUT、`/active-profile`、`/official-fallback`、`/reset`；字段 python/uv/node/npm/git/mise/chromium/ffmpeg/process-compose，分组 comfyui/hyperframes/playwrightMcp/runtime | 无 | 配置页 + API 本地可做 | M | ❌ |
| newtools | 本地 ComfyUI | `ComfyUIRuntimePanel-RcsOaJVS.js`（复用运行时项目） | `comfyui-local` 占位（TASK-120） | 依赖运行时框架；安装 Python/ComfyUI 是重活 | L | 🚧 |
| newtools | ComfyUI 连接/云端 | `CloudComfyUIPanel`：`/settings/generation/comfyui/connections`（CRUD、`/:id/check`）、`/bridge/prepare`；"连接正常，但未安装工作流桥接器""已发布工作流""图片/视频工作流" | `comfyui-cloud` 占位 | 远程连接 + 读取工作流列表本地可做；云端实例 🅿 | M | 🟡 |
| newtools | HyperFrames / MG 动画 | `HyperFramesRuntimePanel-vE_zHBs_.js`：`hyperframes.skills.*`、i18n"HyperFrames 视频生成""新建/导入 HyperFrames 模板""{{name}} · HyperFrames 预览" | `mg-animation` 占位 | 依赖运行时框架 + Node 环境，还有模板导入与预览窗口 | L | 🚧 |

**已对齐**：`/packs` CRUD、导入导出、`/agent/runtime-config`、`@xyflow/react` 依赖。

**判断**：

- 可以本地实现：工作流画布、执行、文档、快照（全栈可做），收藏夹、下载入库、搜索引擎设置，运行时下载源，ComfyUI 远程连接。
- 依赖桌面壳，🅿：`embedded-browser.native/tools/workspace` 桥接（真实渲染、Profile 隔离、下载拦截、右键导入）。浏览器 UI 先做壳，没有桥接时降级为"外部浏览器打开"。
- 云端 ComfyUI 🅿。
- 本地 ComfyUI 与 HyperFrames 可以本地做，但量大，建议排在工作流之后。

**官方有、我们没有的接口**：

- `/flows`、`/flow-runs`、`/flow-runs/:id`、`/flow-snapshots`、`/flow-snapshots/:id`
- `/workflow-documents`(GET/POST)、`/workflow-documents/:id`(GET/PUT)、`/workflow-documents/:id/task-links`(GET/POST)
- `/packs/:id/resources`
- `/browser-bookmarks`(GET/POST)、`/:id`(PATCH/DELETE)、`/order`(PUT)
- `/browser-downloads`(GET)、`/:id`(PUT/DELETE)、`/:id/import`(POST)
- `/settings/runtime/projects`、`/:id/install`、`/:id/install/cancel`、`/:id/service`、`/:id/workflows/prepare`
- `/settings/runtime/workspace`、`/settings/runtime/source-settings`（含 `/active-profile`、`/official-fallback`、`/reset`）
- `/settings/generation/comfyui/connections`（含 `/:id`、`/:id/check`）、`/settings/generation/comfyui/bridge/prepare`
- `/debug/center/browser-link`

---

<a id="electron"></a>
## electron：桌面壳

⏳ **待任务 2.5 填写**。Electron 主进程（应用菜单、IPC 通道、窗口、更新、原生对话框）只存在于 `E:/AI/MediaGo Drama/resources/app.asar`，网页 bundle 里没有。

计划证据来源：以 REA 静态分析为主

```bash
npx -y rea-agents@latest analyze-javascript-application "E:/AI/MediaGo Drama/resources/app.asar" --json > .cache/delegates/rea-electron.json
```

渲染层模块与 import 关系用同一命令分析 `E:/AI/framegendev/.cache/ref/web`，输出 `.cache/delegates/rea-web.json`。

对照目标：`apps/workspace/electron/src/*`。

限制：REA 是否能顺利分析 `app.asar` 尚未实测；失败时在任务 2.5 报告里写明原因，并退回 `asar` 解包 + 手工阅读的方案。

---

## 维护约定

1. 只改本文件，不新增交接/需求/台账副本。
2. 完成一个功能点后，把状态改成 ✅ 或 🟡，并在同一次提交里带上代码。
3. 新增缺口时写清三件事：官方证据（哪个 chunk / 哪条文案 / 哪个接口）、我们当前文件与行号、具体缺口。缺一样不许记。
4. 状态 🅿/🚧 的条目必须写明解锁条件（缺哪个商业服务、缺哪个底层能力）。
5. 官方接口清单按模块收在每节末尾；实现一个就删一条。

