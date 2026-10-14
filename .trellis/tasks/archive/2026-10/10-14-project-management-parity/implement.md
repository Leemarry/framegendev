# TASK-061 Implementation Plan

执行：Superpowers writing-plans/executing-plans，当前会话inline，已获开发授权，不暂存或提交。

Goal: 还原项目管理首屏，保留真实业务。
Architecture: React/SWR/Radix，修改根管理页与侧栏navigation变体。
Spec: design.md、prd.md、docs/parity-0.1.17/REQUIREMENTS.md。

- [x] 1. Projects.test.tsx补创建取消零POST、中文提交/projects并导航、kebab不导航且归档；保留右键生命周期。先运行 `pnpm -C apps/workspace exec vitest run src/pages/Projects.test.tsx` 记录失败。
- [x] 2. Projects.tsx复用createProject({name})/openAgentProjectCreateDialog，改标题/页签/卡片/共用菜单/空态；projects.css与tokens.css限定根shell；App.tsx/AppLayout.tsx隐藏重复标题并调整根侧栏。
- [x] 3. ProjectNavigatorProjectPanels.tsx/ProjectNavigator.tsx改最近项目/导航/本地菜单；AssetLibraryButton.tsx/GlobalToolboxDrawer.tsx增navigation变体，保留默认；创建弹窗纠正标题及本地路径说明；侧栏测试验实际操作。
- [x] 4. 相关Vitest、workspace lint/format/build实际通过，失败修复并记录。
- [x] 5. browser-harness在隔离31430/31431验证1600×1066、390×844、深浅主题及创建取消/创建/重命名/归档/恢复/素材/历史/搜索；截图.cache/parity/task-061，不发送Agent/生成。
- [x] 6. result.md和台账更新，add_session.py --commit "-" --no-commit，task.py archive --no-commit。
