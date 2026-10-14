# GAP-003 Windows backend quality gates

2026-10-14。已完成；完整 check/test、显式全量 race 和 build 均退出 0。

## 实际改动

- 便携 Winlibs GCC 16.2.0 位于忽略目录 `.cache/parity/gap-003/toolchain/mingw64`，下载字节与官方发布 SHA256 `53fb6773fbdf87cdf22b69a6b2a07ee33d3ada413b42d83044bc7cc6481400d2` 一致。官方源记录在该目录的 source.json；直连失败后镜像下载，校验后才解压使用。没有全局安装或永久环境更改。
- 新增 `services/server/scripts/check-windows.ps1`，临时配置 CC、CGO_ENABLED=1、PATH 和 GOFLAGS=-p=1，调用原有 check/test 或显式 race/build；finally 恢复进程环境，保留失败退出码。可选 Go 镜像也仅限当前进程。
- `internal/testutil.CloseDB` 登记实际 SQL pool 释放；直接 DB opens 与路径型 repository/service 测试构造器均覆盖。app、events、MCP、document、chat、generation、media 测试捕获实际缓存句柄，先停止 worker/flush 日志，再关闭 DB，最后删除 TempDir。补齐 MCP 延迟 settings DB、chat reopened 日志和 ACP/prompt TestMain 全局 DB 的关闭。
- settings 登录/注销和 app ffmpeg 由 POSIX 文本脚本改成原生测试可执行程序副本，保留参数、challenge、替换、取消、输出断言。Windows 进程存活使用已有 x/sys；tidy 仅将 v0.43.0 从 indirect 改为 direct，无版本变化，go.sum 无变化。
- HOME fixture 同步设置 USERPROFILE；NO_PROXY/no_proxy 期望按 Windows 单一继承键处理，直接 env-list 合并测试保留。
- 更新 server README 与 backend quality spec，记录命令、资源所有权、错误和验证契约。未改产品数据库缓存、API、schema、ACP 或生成逻辑；此前 TASK-002 产品解析修复保留。

## 已执行验证

在 Windows amd64 / Go 1.25 上，使用上方 GCC，CGO_ENABLED=1，进程级 GOPROXY=https://goproxy.cn,direct、GOSUMDB=sum.golang.google.cn。

| 检查 | 结果 / 证据 |
| --- | --- |
| 原生 focused race | 通过，双 MCP 原生名称回归 |
| app / app-mcp / chat / acp / prompt / repository race | 通过，logs/affected-race.log |
| generation / media 完整 race | 通过，69.050s / 14.050s，logs/generation-media-race-fixed.log |
| task check | 通过，tidy/fmt/vet/lint/build/Swagger/全量 race，logs/task-check-accepted.log |
| task test / 显式全量 race / go build ./... | 均退出 0，logs/test-accepted.log、race-accepted.log、build-accepted.log、remaining-gates.json |
| git diff --check | 通过；暂存区保持空 |

日志根目录 `.cache/parity/gap-003/`。`TestCloseDBReleasesPoolAtTestCleanup` 验证子测试期间 Ping 成功、cleanup 后 Ping 失败；原有 CLI/API 测试实际启动原生子进程。没有新增 skip、抑制 race、降低检查级别或删除业务断言。既有 Unix 专属平台跳过保留；不宣称在 Linux/macOS 实际运行。

首次非 race/race 全量暴露数据库清理遗漏，后续补齐路径型构造器；一次 fmt 检查发现缓存 AST 工具未格式化，一次 lint 发现 CloseHandle 错误未检查，均修复后重跑。失败日志保留，不能把早期失败当最终通过。

## 边界与下一步

本项无产品界面变更，视觉验收不适用；原生子进程/资源释放作为交互与功能检查。完整门全部通过，按无提交方式归档，再激活 TASK-002 更新原隔离后端和 MCP/文档一致性验收。TASK-003 与待评审 TASK-010 独立保留。既有前端改动、隔离数据和原始源码均保留，无生产 workspace-v2 访问、外部登录、Agent prompt、真实生成、导出、暂存、提交或推送。
