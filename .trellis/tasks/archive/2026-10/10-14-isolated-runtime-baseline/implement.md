# TASK-001 实施计划

## 已批准范围

三阶段需求/延期登记，以及新目录运行、基础读写和数据隔离验收。其余任务仅登记，不执行。

- [x] 读取现有需求、任务与源码入口；记录三阶段和新增需求。
- [x] 核对工具版本、解析路径、现有环境和端口；结果写入 result.md。
- [x] 创建独立 YAML，明确绝对数据/日志路径；激活本任务。
- [x] Git Bash：`GOPROXY=https://goproxy.cn,direct task build:server INCLUDE_WORKSPACE_DIST=0`。
- [x] 启动新 server，Vite 通过 VITE_API_PROXY_TARGET 访问；检查健康/API。
- [x] Browser Harness 检查已执行并保存截图；文字恢复通过、严格一致性失败，详见 result.md。
- [x] 执行 `pnpm -C apps/workspace lint`、`format`、`build`；三项通过，记录未运行项。
- [x] 核对实际持久化路径、操作范围、Git HEAD/暂存区；更新台账与结果记录。
- [x] 首次失败建立TASK-004；本轮独立修复后复验严格内容一致性通过，归档前保留首次证据。

TASK-004 已独立修复并完成严格一致性复验。TASK-002/003 仍是独立缺陷，不把基线通过标作Agent可用。

启动仅在独立配置确认后进行。服务不复用官方应用或旧开发数据；结束前保留可试用本地 URL，停止/重启仅操作本轮 PID。
