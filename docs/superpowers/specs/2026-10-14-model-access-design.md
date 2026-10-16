# 模型接入整合页设计

日期：2026-10-14。状态：已于 2026-10-17 评审通过（结论见 `.trellis/tasks/10-14-model-access/design-review.md`，以官方新基线 91 截图校准为四区块卡片网格）。需求：REQ-011。任务：TASK-010。

## 目标和范围

参照 `E:\AI\mediago-gap-shots\exe-flow\18-set-model.png`，把现有 Codex、会员 CLI、官方 API 配置整合为一个“模型接入”页面，保留真实登录、凭据、渠道和模型缓存刷新行为。

首项只涉及设置导航和模型接入页面。全部产品需求仍在 `docs/parity-0.1.17/REQUIREMENTS.md` 中；首项验收不能代表其他页面已完成。

## 已核实的实现

- `apps/workspace/src/pages/Settings.tsx`：`APIKeysPanel` 已管理 provider catalog、CLI 登录、API Key 保存/清除、确认弹窗和模型缓存刷新。
- `apps/workspace/src/domains/settings/components/CodexAccessPanel.tsx`：真实官方账户状态、登录尝试、取消、重新打开和退出。
- `apps/workspace/src/domains/settings/components/CodexRelayPanel.tsx`：现有官方渠道与中转渠道配置；开发前读取完整实现。
- `apps/workspace/src/domains/workspace/components/ProjectNavigatorPanels.tsx`：目前 API 密钥和 Codex 接入是两个导航项。
- `apps/workspace/src/domains/settings/api/settings.ts`：已有 provider 和 model platform 类型，保留 ID 与现有 API 契约。
- `SettingsPanelLayout.tsx` 是整页容器。组合页面只保留一个整页容器，内部区域不嵌套整页滚动和标题栏。

## 页面和交互

页面顶栏为“模型接入”，正文按官方顺序排列：Codex 接入、会员 CLI 接入、官方 API 接入。桌面宽度下 CLI 和官方 API 使用三列卡片，小窗口依次收为两列/一列，保持文字和按钮不溢出。

Codex 区域显示真实官方订阅状态、当前渠道和中转列表，保留新增中转、渠道切换、登录、取消和退出。退出可能影响共享 Codex 目录，继续使用现有确认行为。

会员 CLI 区域渲染即梦、LibTV、小云雀。数据由已有 provider/catalog 驱动，OAuth provider 保留真实授权流程，小云雀凭据保留 Access Key 配置。配置成功与 CLI 实际可执行分别表达，不能因保存 Key 就宣称生成可用。

官方 API 区域按截图优先呈现火山引擎、OpenAI、Google Gemini。其他当前已支持的供应商继续可访问；不删除用户凭据，不把供应商数量写死为三家。

现有聚合平台/自定义接口放入后续接入区域，保留配置入口；具体布局在完整官方页面有新增证据时调整并记录。截图首屏不显示这些区域，不能据此推断官方完全没有。

未登录、待授权、已配置、保存中、请求失败和后端未提供 provider 均显示实际状态。请求失败提供重试，不显示虚构配置或成功提示。敏感 Key 继续掩码，截图和文档不记录明文凭据。

## 路由与兼容

新导航入口使用 `model-access`。旧 `api-keys`、`codex-access`、`codex-relay` 入口兼容映射到新页，保证生成页引导及旧路由仍可工作。

模型接入导航在 Codex/Opencode 等 backend 下都存在；Codex 配置是否可切换依据现有后端规则显示，不能因为当前 backend 不是 Codex 就隐藏其他模型配置。

## 实现边界

复用现有 SWR key、登录接口、凭据 mutation、确认弹窗和缓存刷新。只在组合所需处把已有内容改为可嵌入区域，避免复制登录 state machine；不引入新的全局 store 或依赖，不改 provider 执行逻辑。

预计涉及 `Settings.tsx`、`CodexAccessPanel.tsx`、`CodexRelayPanel.tsx`、`ProjectNavigatorPanels.tsx` 及相应测试；是否抽出独立组件由完整读取后确定，以职责和最小改动为准。

新颜色只通过现有 `src/styles/tokens.css` 定义；界面使用现有 tokens、Lucide 和 shared UI。不对模型页增加营销 hero 或无关解释区。

## 验收

1. 官方截图相同内容区域尺寸、主题和未配置状态下，对齐区域顺序、卡片布局、按钮和状态；单独验证浅色和小窗口。
2. 新导航与旧入口都打开同一页；非 Codex backend 能继续管理生成 provider。
3. 现有 API Key 保存、清除确认、CLI 授权、取消、Codex 中转切换测试继续通过；新增组合页导航与区域呈现测试。
4. 独立测试目录实际验证配置持久化和失败反馈；登录/共享账户变更不拿真实账户做破坏性测试。
5. `pnpm -C apps/workspace lint`、`format`、`build` 及相关测试通过，再做浏览器/桌面交互和截图验收。

不把单元测试 mock 状态当作真实端到端结果。没有凭据时记录未验证的生成能力，而不是标为成功。

## 后续实施计划

设计确认后，用 Superpowers writing-plans 为本模块生成独立步骤、文件列表、必要测试和验证命令，并更新 TASK-010 状态。此文件是具体可评审设计，不是已经实施的代码。
