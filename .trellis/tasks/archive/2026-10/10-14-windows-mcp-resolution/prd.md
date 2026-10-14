# TASK-002 Windows MCP 可执行文件解析

## 目标与证据

第一阶段核心/P0，关联 REQ-005、011、016。
TASK-001 新构建了 document/generation MCP 的 .exe，但
`services/server/internal/service/acp/acp_mcp.go:196` 起的解析使用无后缀名称。
实际日志报告 `bin/mediago-document-mcp` 不存在，document MCP 被禁用。
二进制存在不代表 MCP 已启用；2026-10-14用户要求继续下一任务，本轮仅实施TASK-002，设计/计划见同目录。

## 后续范围与验收

独立规划 Windows 后缀解析及兼容行为；不可复制无后缀文件掩盖问题。
新增跨平台回归，验证候选顺序、.exe 实际可用、缺失/目录候选错误与 MCP 配置。
修复后在 TASK-001 隔离目录复测，并检查 TASK-003 是否仍复现。
验收：正确解析实际文件，document/generation MCP 的运行配置真实可用。
日志参考 `.cache/parity/task-001/logs/acp-2026-10-14.log`。
