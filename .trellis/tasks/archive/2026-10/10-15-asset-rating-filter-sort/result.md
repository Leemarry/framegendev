# 素材库评分筛选与排序 — 结果记录

## 实际改动

- `apps/workspace/src/domains/workspace/lib/asset-library.ts`
  - `AssetLibrarySort` 新增 `ratingDesc`
  - 新增 `AssetLibraryRatingFilter`（"all" | "rated" | "1"~"5"）
  - `FilterAssetLibraryItemsOptions` 增加 `rating?`
  - `filterAssetLibraryItems` 按评分筛选（rated=rating>0；N星=rating>=N）
  - `compareAssetLibraryItems` 增加 ratingDesc 分支（高分在前，同分/未评分走 fallbackCompare）
- `apps/workspace/src/domains/workspace/components/AssetLibraryButton.tsx`
  - 页面排序下拉新增「评分最高」（最近修改之后、名称之前，对齐官方顺序）
  - 页面筛选 Popover 与弹层 projectMode 工具栏新增「评分」筛选（全部/已评分/1~5星及以上）
  - 项目切换时重置评分筛选；空态提示条件纳入评分筛选
- `apps/workspace/src/domains/workspace/lib/asset-library.test.ts`
  - 新增排序测试（评分降序+未评分为0+同分fallback）与筛选测试（all/rated/3星/5星及与kind组合）

## 验证结果

- 单测：asset-library.test.ts 15 全过（含新增 2 个）；AssetLibraryButton.test.tsx 相关用例全过
- 质量门：`pnpm lint`（oxlint）✅、`pnpm format`（oxfmt --check）✅、`pnpm build`（tsc -b && vite build）✅（chunk>500kB 为既有警告）
- 全量 vitest 中 AgentChat/ProjectNavigatorProjectPanels/PromptPackEditor/electron-desktop-notifications 失败为既有失败，已通过 git stash 对照验证与本次改动无关
- 真实浏览器验收（31431 前端 / 31430 后端，TASK162-Acceptance 隔离项目）：
  - 通过真实 fetch（multipart POST + PUT rating）上传 4 个素材并设置评分 5/3/1/未评分，均 200
  - 页面入口：排序切「评分最高」→ a-five(5) → b-three(3) → d-one(1) → c-unrated，即时生效
  - 筛选「已评分」→ 排除未评分；「3星及以上」→ a-five、b-three；「5星」→ 仅 a-five；恢复「全部」→ 4 个全回
  - 刷新后：默认排序恢复「最近添加」（符合预期），再切「评分最高」顺序仍 5>3>1>未评分，证明评分来自持久化数据
  - 深浅主题：data-theme 切换后 combobox/筛选按钮计算样式正常（深色 rgb(25,27,27)/rgb(223,230,237)，浅色 rgb(250,251,253)/rgb(11,21,38)）
  - 弹层入口（项目工作台左下「打开素材库」）：评分筛选选项一致，「已评分」结果 3 项正确
- 证据限制：in-app 面板 visibilityState=hidden 无法像素截图，以 DOM/网络/计算样式证据替代（同 TASK-162）

## 遗留与边界

- 仅前端派生逻辑，后端 `Rating` 字段与 PUT API 已存在，无后端改动
- 未做评分聚合/统计类展示（官方亦无）
- TASK-030/034 其余遗留（重挂父级/物理扫描、关联详情）待后续单项
