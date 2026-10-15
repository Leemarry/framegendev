# 实施与验证计划

1. 更新任务状态并补齐 backend/frontend context；确认独立测试数据路径。
2. 后端实现 repository/service/handler/routes 及 table-driven/HTTP 回归，先验证空、含素材、含子目录、跨 scope、缺失目录。
3. 前端实现 API、目录控件与页面 cache/URL 处理，补组件/API/page 测试，验证确认/取消/失败/成功回根和窄屏可用性。
4. 运行相关 Vitest、workspace lint/format/build；运行 server Windows check/test/race/build。必要时修复根因，不跳过失败。
5. 使用 browser-harness 在现有隔离服务上真实验证 global/project 两 scope、媒体/目录持久性和文件 hash；不访问生产 workspace-v2。
6. 更新 TASKS/CURRENT-HANDOFF/result，归档任务；明确路径暂存并提交，提交后才选择下一单项。
