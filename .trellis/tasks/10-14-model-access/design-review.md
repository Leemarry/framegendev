# TASK-010 模型接入整合页 — 设计评审结论

日期：2026-10-17。评审人：amireux（Doubao 会话）。需求 REQ-011。
评审依据：`docs/superpowers/specs/2026-10-14-model-access-design.md`（待评审稿）、官方 0.1.17 成品静态逆向（证据见 `.cache/parity/rea/`，不入库）、官方新基线截图 `E:/AI/mediago-gap-shots/screenshots/91-软件设置-模型接入.png` 与 `91-软件设置-模型接入-下.png`、本地现状源码。

## 结论

设计方向**通过**：复用现有 provider / 凭据 / 登录 / 缓存刷新，不重写 provider 执行层。后端适配层经核实已齐备，本任务是纯前端整合。以下 6 点用逆向证据与官方截图对原设计做校准，作为实施依据。

## 校准点

1. **官方是四区块，不是三区块。** 官方截图自上而下为：
   1. Codex 接入（ChatGPT 官方订阅 + 中转渠道，右上「+ 新增中转」、底部「+ 新增第一个中转渠道」）；
   2. 会员 CLI 接入（即梦 / LibTV / 小云雀，三列卡片）；
   3. 官方 API 接入（火山引擎 / OpenAI / Google Gemini / DeepSeek / 阿里云百炼 / MiniMax 国内，三列卡片网格）；
   4. **聚合平台接入**（截图下半张标题原文：「通过聚合平台使用多个模型，使用对应平台的 API Key 和额度。」对应 MediaGo / OpenRouter / DMX）。
   原设计把聚合平台写作「后续接入区域」，现按截图修正为与前三块同级的第四区块。现有 MediaGo 统一接口 hero 降级为第四区块中的卡片，不再独占整页首屏。

2. **展示形态是卡片网格，不是行式列表。** 每个供应商一张卡片：品牌图标 + 名称 + 右上状态徽章（未登录 / 未配置 / 已配置 / 当前渠道），描述文字，底部主操作（登录 / 配置）+「…」更多菜单。CLI 与官方 API 区块桌面端三列，窄屏依次两列 / 一列。现有 `APIKeysPanel` 的行式布局需改为卡片网格。

3. **供应商集合与后端完全对应，无需新增 provider。** 逆向得到的官方 provider id 与本地 `packages/core/pkg/generation/catalog_adapters.go` 常量一一对应：
   - 官方 API：`volcengine`、`openai`、`google`、`deepseek`、`aliyun`、`minimax`；
   - 会员 CLI：`jimeng`（dreamina）、`libtv`、`xiaoyunque`（pippit）；
   - 聚合：`mediago`、`openrouter`、`dmx`。
   各区块卡片由后端 `/settings/api-keys` 与 `/settings/model-platforms` 返回驱动，不写死供应商数量，后端新增 provider 自动进入对应网格。

4. **没有可灵（Kling）直连。** 二进制中所有 kling 命中均为飞书 SDK 字符串子串误匹配，无 kling/vidu/海螺/混元 provider 或端点。可灵等未接入模型未来仅经 DMXAPI / OpenRouter 聚合使用，本任务不新增可灵 provider，也不出现可灵卡片。

5. **本地 / 自定义 OpenAI 兼容端点不在本页新增专属项。** 逆向证实官方用 `OPENAI_BASE_URL` / OpenAI 兼容协议承接自定义端点；本地该能力由「Agent 模型配置」（AgentModelProfiles）与自定义聚合 provider 承载。模型接入页不出现 Ollama / LM Studio 专属卡片（官方也未预置）。

6. **即梦登录方式与现状实现一致。** 官方即梦走 `dreamina.exe` 设备码 OAuth（`dreamina login`/`checklogin`），LibTV 走 web/手机登录，小云雀走 Access Key；现有 `beginProviderLogin` / `completeProviderLogin` / Access Key 保存即此模型，保持复用，不复制登录状态机。

## 后端现状（已核实，零改动）

- 适配层：`packages/core/pkg/generation/{official,dmx,jimeng,libtv,pippit,mediago,openrouter,runtime}`；
- 目录：catalog（seedance/seedream/wan/gptimage/gemini/happyhorse/libtv/mediago/openrouter/text 等）已含官方路由模型；
- 设置服务：`service/settings/{model_platforms,store,codex_account,codex_relay,libtv_project_bindings,agent_model_profiles}.go`；
- 端点：`GET /settings/api-keys`、`GET /settings/model-platforms`、`PUT /settings/api-keys/:id`、`POST /settings/api-keys/:id/login` 与 `/login/check`。
本任务不改 Go 代码、不改 provider 执行逻辑。

## 单项划分（每份计划只覆盖一个可验收项）

- **单项 1（本次，`implement.md`）**：四区块卡片网格整合页落地，复用全部现有真实交互，导航与旧路由兼容，配套测试与前端质量门。
- **单项 2（后续，不在本次）**：各供应商品牌 logo 与官方截图的视觉精修、浅色主题逐区对齐、真实浏览器 / Electron 截图验收（浏览器自动化在本机受 blocked by policy 限制，恢复条件见各任务 result）。
- **不属本任务**：真实生成与用量（TASK-080）、ComfyUI / MG 运行时（TASK-120）、商业聚合账号与计费（TASK-140）、扩展与飞书（TASK-110）。

## 边界

- 不真实登录、不填真实凭据、不发送生成请求、不访问真实 workspace-v2；
- 无凭据的生成能力在界面与任务记录中如实标注「未验证」，不标成功；
- 品牌图标首项用现有图标体系占位，不引入未授权二进制 logo 资产；
- 证据留在 `.cache/parity/rea/`，不复制官方代码 / 资源进产品。
