# 官方 0.1.17 对齐总任务

## 目标与来源

目标、稳定需求编号、截图索引、商业服务边界以
[需求](../../../docs/parity-0.1.17/REQUIREMENTS.md)、
[台账](../../../docs/parity-0.1.17/TASKS.md)、
[决策](../../../docs/parity-0.1.17/DECISIONS.md) 为准。
此任务组织分模块工作，不是已批准的全量实施计划。

## 任务关系

- TASK-001：[独立运行基线](../archive/2026-10/10-14-isolated-runtime-baseline/prd.md)，复验通过，已归档。
- TASK-010：[模型接入](../10-14-model-access/prd.md)，设计待评审，依赖 TASK-001。
- TASK-002：[Windows MCP 解析](../10-14-windows-mcp-resolution/prd.md)，基线发现，仅登记。
- TASK-003：[ACP 初始化退出](../10-14-acp-startup-exit/prd.md)，根因待核实，仅登记。
- TASK-004：[无编辑刷新改写文档](../archive/2026-10/10-14-document-reload-mutation/result.md)，已修复、归档，解除TASK-001阻塞。
- 其余模块保留在台账，推进到对应模块时再建立独立 Trellis 任务。

父子关系只用于组织；子任务 PRD 的明确依赖才决定顺序。
当前为 planning，不代表所有模块已开始开发。

执行顺序采用用户确认的三阶段：核心制作流程优先，次要项全部标记待补；
核心验收通过后可进入素材阶段，再进入画布阶段。详细任务范围以台账为准。

## 验收

- [ ] 台账所有产品模块分别完成视觉、交互、真实功能验收。
- [ ] 独立测试项目完成剧本到导出回归。
- [ ] 待接入商业服务如实标记，所有剩余差距有记录。
- [ ] 任务和会话记录可追溯到实现、实际检查与验收截图。

## 执行约束

仅在 framegendev 开发；生产 workspace-v2 禁止访问。
复用当前代码；不伪造成功。每模块的设计/计划/证据落在对应子任务，
详情参考 [项目工作流](../../spec/guides/project-workflow.md)。
