# TASK-010 模型接入整合页 — 单项 1 结果

日期：2026-10-17。范围：仅前端整合与布局重构（对应 `design-review.md`、`implement.md`）。
后端 provider 适配层零改动；不真实登录、不填真实 key、不发起生成。

## 完成内容

把设置「模型接入」从【待评审】占位页做成官方四区块卡片网格整页，自上而下：

1. **Codex 接入**：复用既有 Codex 官方订阅 + 中转渠道（新增中转、登录、取消、退出、切换全部保留）。
2. **会员 CLI 接入**：即梦 / LibTV / 小云雀卡片，OAuth 登录或 Access Key 配置，真实状态徽章。
3. **官方 API 接入**：火山引擎 / OpenAI / Google Gemini / DeepSeek / 阿里云百炼 / MiniMax 卡片网格。
4. **聚合平台接入**：MediaGo 卡片（含模型 chips）+ OpenRouter / DMX 卡片。

卡片统一为：图标 + 名称 + 状态徽章（未登录/未配置/已登录/已配置/登录中）+ 描述 + 主操作（登录/配置）+「…」更多菜单（退出登录/取消登录/清除 API Key）。桌面三列、中屏两列、窄屏一列。旧入口 `api-keys` / `codex-access` / `codex-relay` / `agent-model-profiles` 经 `normalizeSettingsTab` 全部归一到 `model-access`；侧边栏移除独立的「API 密钥」「Codex 接入」项。

### 新增文件（`apps/workspace/src/domains/settings/components/model-access/`）

- `model-access-providers.ts`：四区块分组、固定顺序、图标映射（Lucide 占位）、卡片可见性纯逻辑。
- `model-access-providers.test.ts`：分组纯函数单测（6 项）。
- `useProviderCredentials.tsx`：从原 `Settings.tsx#APIKeysPanel` 整体抽出的凭证状态机（SWR 加载、保存/清除确认、OAuth begin/complete、3s 轮询、两个模型缓存刷新），逻辑零改动。
- `ProviderCard.tsx`：卡片与状态徽章、更多菜单。
- `ProviderConfigDialog.tsx`：通用 API Key/Access Key 配置弹窗 + MediaGo 专用弹窗 + 掩码输入。
- `ProviderSection.tsx`：区块标题/描述容器 + 响应式三列网格 + MediaGo 模型 chips（含 Wan/HappyHorse 钉选）。
- `provider-credential-utils.ts`：掩码/占位/凭据标签/类型工具。
- `ModelAccessPanel.tsx`：唯一整页容器，组合 Codex embedded 区块 + 三区块；Codex 区块仅在 codex 后端显示。

### 修改文件

- `components/CodexRelayPanel.tsx`：新增 `embedded` 模式（不套整页布局、不渲染路由开关），整页用法保持不变。
- `components/CodexAccessPanel.tsx`：透传 `embedded`。
- `pages/Settings.tsx`：删除内联凭证整页与子组件（约 1500 行迁出），`model-access` 渲染 `ModelAccessPanel`，旧路由归一；保留 JianyingDraft 等无关面板。
- `lib/settings-navigation.ts`：`model-access` 从 `pendingSettingsPages` 移除；删除 `existingModelSettingsLinks` 与未用图标。
- `components/PendingSettingsPanel.tsx`：移除 model-access 占位分支。
- `domains/workspace/components/ProjectNavigatorPanels.tsx`：侧边栏不再追加「API 密钥」「Codex 接入」独立项。
- `pages/Settings.test.tsx`：挂载入口迁至模型接入页，行为断言（保存/清除确认/OAuth/轮询/缓存刷新）保留，选择器改为卡片；新增四区块、旧路由归一、非 codex 后端隐藏 Codex 区块、无可灵等断言。

## 验证（前端工作区 `apps/workspace`）

- `npx oxlint .`：699 文件，0 警告 0 错误。
- `oxfmt --check`（全部改动文件）：格式正确。
- `npx tsc -b`：通过。
- `pnpm build`（tsc -b && vite build）：通过。
- 定向测试：
  - `model-access-providers.test.ts`：6/6 通过。
  - `pages/Settings.test.tsx`：34/34 通过（含 13 项原凭证行为迁移断言 + 四区块/路由/无可灵新断言）。
  - 既有 `CodexRelayPanel.test.tsx`（14）、`AgentModelProfilesPanel.test.tsx`（4）全量跑中仍通过，证明 embedded 改造与旧路由兼容未破坏既有面板。

## 已知独立问题（非本任务引入，未改依赖）

全量 `vitest run` 有 30 个测试文件在加载阶段报
`SyntaxError: The requested module '@tiptap/core' does not provide an export named 'getPreviousBlockSibling'`。
根因是依赖版本错位：`@tiptap/core` 实际安装为 **3.23.4**，而 `@tiptap/starter-kit` 的传递扩展（extension-list / blockquote 等）被解析为 **3.32.0** 并引用了 3.27+ 才有的 `getPreviousBlockSibling`。`vite build` 对命名导出容错故构建通过，vitest 严格 ESM 校验故失败。

- 已自证与本任务无关：完全未改动的 `documents/components/tiptap/extensions.test.ts` 等同样 0 test 失败；这些文件的 import 链经 `@/pages/Debug` 或 AgentComposer 进入 tiptap。
- 本任务相关测试（Settings / model-access / CodexRelay / AgentModelProfiles）均通过。
- 修复方向（依赖治理，需独立任务，避免与他人未提交的 `pnpm-lock.yaml` 改动冲突）：用 pnpm override 把全部 `@tiptap/*` 统一到同一版本（要么锁回 3.23.4，要么整体升到 3.32.x）后重装。

## 单项 2 待做（本项未做）

- 各供应商务实品牌 logo 与官方截图逐像素对齐（当前用 Lucide 图标占位）。
- 浅色主题逐像素校准与真实浏览器/Electron 截图验收（本机浏览器自动化受 blocked by policy 限制，恢复条件见各任务 result）。
- 未做真实登录/付费/外部生成；外部 provider 仅展示真实「未配置/已配置」状态。

## 边界

- 未新增任何 provider/端点/Go 逻辑；未加可灵（Kling）（官方亦无直连，仅经 DMXAPI/OpenRouter 聚合）。
- 未访问生产 `workspace-v2`，未真实登录/生成/外发。
