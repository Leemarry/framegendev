# TASK-003 ACP 初始化退出调研

## 目标与证据

第一阶段核心/P0，关联 REQ-011、016。在隔离项目页打开文档时，界面自动初始化
vendored codex-acp（1.1.2，Codex 0.144.0），约 6~8 秒后退出，exit status 1。
`.cache/parity/task-001/logs/server.stderr.log` 与重启日志有清理记录，
包括 TerminateProcess Access denied。退出根因尚未判定；不能推断为账户或权限问题。

## 依赖与验收

先复测 TASK-002 修复，再判断是否独立缺陷。读取初始化阶段协议/错误，
区分配置、凭据缺失、MCP、退出/清理等实际原因；不登录或提交真实生成。
验收：初始化状态真实，失败原因明确可恢复；未登录时不冒充可运行。
本轮用户明确要求完成本项；设计与实施记录见design.md、implement.md。仅修复本项核实出的进程清理问题，TASK-010设计评审独立保留。

## TASK-002完成后的新证据（2026-10-14 Session8）

GAP-003完整后端门通过，TASK-002原生双MCP及隔离后端替换验收通过。新版31430/PID49948只读GET项目agent/runtime-config返回HTTP200与真实模型/权限选项；约6.5秒后仍记录connection closed、TerminateProcess Access denied与wait_error exit status1。后续必须先区分请求成功后的正常清理和实际运行失败，不能继续假定该请求503或把exit1直接解释为未登录。没有发送prompt或真实生成，不能据此宣称完整Agent可用。证据：`.cache/parity/task-002/acp-status-final.json`与`logs/runtime.stderr.log`。此为Session8历史状态。

## Session9最终验收

已确认成功探测后的主动清理与Windows后代生命周期问题，完成同步/有界EOF清理、阶段诊断和私有Job Object管理。最终完整check/test/race/build及3次真实runtime-config200、零后代残留、四篇文档不变验收通过。保留forced exit1真实记录，不将元数据成功当作账户/Agent prompt就绪。详见result.md。
