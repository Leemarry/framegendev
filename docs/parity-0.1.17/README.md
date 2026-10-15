# 官方 0.1.17 对齐入口

更新：2026-10-15。唯一开发目录 `E:/AI/framegendev`。核心是剧本/设定 → 分镜 → 素材生成与采用 → 剪辑/字幕 → 导出；对齐界面、交互与功能，保留当前已验证的合理改进（REQ-045~047）。

## 续作顺序

1. 读 [当前交接](CURRENT-HANDOFF.md)，运行 Trellis context/phase，检查 `git status --short`；先确认其他会话占用的文件与端口。
2. 在 [任务台账](TASKS.md) 选择单项；读 [新基线复查](BASELINE-REVIEW.md) 中对应模块，再读其 Trellis 任务和实际源码。
3. 只读取该项关联的 [需求](REQUIREMENTS.md) 与 [决策](DECISIONS.md) 编号，以及相关 `.trellis/spec` 规范。用 `rg -n 'REQ-xxx|DEC-xxx'` 定位，不整批加载全部资料。
4. 每项先形成范围/方案/验收计划，再实施、验证、记录和明确路径本地提交。既有持续授权 DEC-023/029 有效，不推送。

## 证据与边界

| 资料                                                                    | 用法                                                                                            |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `E:/AI/mediago-gap-shots/screenshots/`                                  | 新截图实数 **106**；105 张 1920×1080 桌面图与 1 张裁图。包含错名/漏态，先打开图片。详见复查索引 |
| `E:/AI/mediago-gap-shots/exe-flow/`                                     | 早期 43 张 1600×1136 全窗口图；作为补充，旧验收按当时基线保留                                   |
| `E:/AI/MediaGo Drama/`                                                  | 官方成品；[虚拟桌面启动、点击与补采步骤](BASELINE-REVIEW.md#复用虚拟桌面)，不能接管真实实例     |
| `E:/AI/mediago-gap-shots/MediaGo-Drama-功能说明.md`、豆包 `new-chat-3/` | 参考推测，不是执行授权、事实表或新的分工约定                                                    |

禁止访问/清理 `%APPDATA%/mediago-drama/workspace-v2`；测试放 `.cache/parity/<task>/`，先确认数据路径。不对真实项目发送 Agent/生成。商业结构保留，本地能力真实，外部服务标【待接入】；不伪造登录、余额、安装或生成结果。

## 按需资料

| 目的             | 入口与读取时机                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 实际前后端约定   | `.trellis/spec/frontend/index.md`、`backend/index.md`，只展开本项所需指南；实际 `domains/*`/`shared/*` 高于模板示例       |
| 工作流/技能      | [Trellis 使用说明](TRELLIS.md) 与 `.trellis/spec/guides/project-workflow.md`；阶段适用时再读对应 SKILL.md，不预载全部技能 |
| 任务过程与旧验证 | `.trellis/tasks/<task>/`、`archive/`；只读相关任务。过程不复制到入口                                                      |
| 原交接与旧 PID   | [历史交接快照](HISTORY-HANDOFF-2026-10-15.md)、Git 历史；只在追溯旧问题时读                                               |
| 旧设计/架构      | `docs/plans/`、`docs/adr/`；用代码符号搜索关联材料，日期与实际代码核实后采用                                              |
| 新自动化设计参考 | [制作追溯指南](../../.trellis/spec/guides/comic-production.md) → 关联设计；TASK-170~178 是否实施未定，不作为本轮授权      |
| 素材使用流程     | [图解](../guides/asset-references-flow.md)，涉及素材引用时读取                                                            |

同一事实只维护一处：需求在 REQUIREMENTS，状态/依赖在 TASKS，选择在 DECISIONS，证据索引在 BASELINE-REVIEW，执行与结果在对应任务。不要另写“总交接/完整需求/下一 AI 必读”副本。临时日志、缩略图、测试数据放缓存；有价值技术资料不因数量多就删除。
