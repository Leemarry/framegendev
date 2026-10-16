# TASK-010 单项 1 实施计划：模型接入四区块整合页

对应 `design-review.md` 校准结论。状态：planning → 评审通过后 `task.py start`。
范围：**仅前端**，纯整合与布局重构，不改 Go / provider 执行逻辑，不真实登录或生成。

## 目标行为

设置「模型接入」成为真实整页（替换现有 pending 占位），自上而下四区块：

1. **Codex 接入**：复用 Codex 官方订阅 + 中转渠道（含新增中转、登录、取消、退出、切换）；
2. **会员 CLI 接入**：即梦 / LibTV / 小云雀三卡片，OAuth 登录或 Access Key 配置，真实状态徽章；
3. **官方 API 接入**：火山 / OpenAI / Google Gemini / DeepSeek / 阿里云百炼 / MiniMax 等 official provider 卡片网格，API Key 配置；
4. **聚合平台接入**：MediaGo / OpenRouter / DMX 卡片，API Key 配置，MediaGo 显示模型 chips。

每张卡片：图标 + 名称 + 状态徽章（未登录/未配置/已配置/登录中）+ 描述 + 主操作（登录/配置）+「…」更多菜单（退出/清除/取消）。桌面三列、md 两列、窄屏一列。未配置/加载中/请求失败显示真实状态，失败可重试，不虚构成功。

## 代码结构（新增 `domains/settings/components/model-access/`）

- `model-access-providers.ts`：区块分组、固定排序、图标映射（Lucide 占位）、卡片可见性；输入为 api-keys + model-platforms 数据，输出四区块。含单元测试。
- `useProviderCredentials.ts`：把现内联于 `Settings.tsx#APIKeysPanel` 的 SWR 加载、save/clear/confirm、OAuth begin/complete/轮询、弹窗开关、模型缓存刷新整体抽为 hook（逻辑零改动）。含测试。
- `ProviderCard.tsx`：卡片展示组件（图标、名称、徽章、描述、主操作、更多菜单）。
- `ProviderConfigDialog.tsx`：API Key / Access Key 配置弹窗（合并现有 ManualProviderConfigDialog 与 MediaGo 配置弹窗，掩码输入、保存/清除/取消）。
- `ProviderCardsGrid.tsx`：三列响应式网格 + 区块标题/描述容器。
- `ModelAccessPanel.tsx`：唯一 `SettingsPanelLayout` 整页容器，组合 Codex 区块 + 三区块网格；不再嵌套整页标题。
- Codex 区块：给 `CodexRelayPanel` 增加 `embedded` 渲染（不套自身 `SettingsPanelLayout`），由 ModelAccessPanel 包进区块容器；保持其整页用法仍可用于兼容。

## 改动文件

- `pages/Settings.tsx`：删除内联 `APIKeysPanel`（约 1500 行的凭证部分迁出），`model-access` 渲染 `ModelAccessPanel`；`api-keys`、`codex-access`、`codex-relay` 经 `normalizeSettingsTab` 全部映射到 `model-access`；保留 JianyingDraftPanel 等无关面板。
- `domains/settings/lib/settings-navigation.ts`：`model-access` 从 `pendingSettingsPages` 移除（真实页）；移除/收敛 `existingModelSettingsLinks` 中旧独立入口（导航只留「模型接入」）。
- `components/PendingSettingsPanel.tsx`：不再为 model-access 渲染占位（类型移除后自然不命中）。
- 测试：`pages/Settings.test.tsx` 将「Settings API key page」用例的挂载入口迁到模型接入页，**行为断言保持不变**（保存/清除确认/OAuth/轮询/模型缓存刷新等），更新为卡片 DOM 选择器；新增：四区块顺序、CLI/官方/聚合卡片、旧路由 api-keys/codex-access/codex-relay 都打开模型接入页、非 Codex backend 下仍显示其余三区块、加载/失败态。

## 有序检查清单

1. 抽 `model-access-providers.ts` 分组/排序 + 单测（先红后绿）。
2. 抽 `useProviderCredentials.ts`（纯搬迁，不改逻辑）。
3. 建 ProviderCard / ProviderConfigDialog / ProviderCardsGrid。
4. 建 ModelAccessPanel（Codex embedded + 四区块）。
5. Settings.tsx 接线 + 导航与旧路由兼容。
6. 迁移并扩充测试，全绿。
7. 质量门（见下）。
8. 更新 `result.md`、TASKS/REQUIREMENTS 状态、必要 spec，明确路径本地提交（不推送），TASK-010 不整体归档（单项 2 视觉/真实截图验收仍待）。

## 验证命令

- `pnpm -C apps/workspace lint`
- `pnpm -C apps/workspace format`（仅检查改动文件；若全量有存量差异，不扩大改动）
- `pnpm -C apps/workspace build`（含 tsc 类型检查）
- `pnpm -C apps/workspace test -- Settings`（或 vitest 定向 Settings / model-access）
- 后端无改动，不重跑 Go 门；如误触共享类型则补 `go build ./...` / `go test ./services/server/...`

## 回滚点

- 全部为前端新增与 `Settings.tsx` 重构；提交前若质量门无法转绿，`git restore` 明确路径回到启动提交，不保留半成品。
- 旧路由保留兼容映射，生成页引导到 api-keys 的链接不破坏。

## 不做（验收边界）

- 不做品牌 logo 精修、不做浅色逐像素、不做真实浏览器/真机截图（单项 2）；
- 不新增任何 provider / 端点 / Go 逻辑；不加可灵；
- 不真实登录、不填真实 key、不发起生成；未配置 provider 只展示「未配置」。
