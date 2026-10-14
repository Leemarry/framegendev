# TASK-003 验收结果

2026-10-14，已完成。关联REQ-011/016；本项仅核实并修复ACP进程退出/清理，不代表完整Agent或生成链路通过。

## 结论与实际改动

历史专用JSON日志中，`acp config probe completed`及真实模型/权限选项在关闭管道、Kill和exit1之前。旧代码异步清理立即关闭stdout/Kill，HTTP返回又取消CommandContext，存在重复终止与Windows已退出进程Access denied竞争。不能把这些清理记录直接归因于认证或初始化失败。

- InspectSessionConfig在返回前完成清理，增加purpose、stage、cleanup_reason和PID诊断；原始错误继续返回，既有HTTP503/认证引导不变。启动失败关闭已打开的管道。
- 共用清理仅一次Wait，关闭stdin后允许3s退出，再强制Kill并最多等2s；保留stdout直到Wait/有界超时。保留forced、wait_error，只有os.ErrProcessDone免重复告警。
- Windows共用启动使用私有kill-on-close Job Object。CREATE_SUSPENDED启动、加入Job后恢复主线程，避免后代先于隔离管理启动；无论父进程EOF/强制/取消/超时，清理均关闭Job，覆盖shell/Codex/MCP。启动管理失败明确报错并回收，不静默降级。
- 非Windows启动仍为cmd.Start；未改变公共API、SDK、provider配置、模型接入页或vendored二进制，未新增依赖。沿用已有x/sys/windows。

产品文件：acp_runner.go、acp_runner_process.go、acp_runner_resident.go、acp_process_windows.go、acp_process_other.go；测试为acp_runner_process_test.go、acp_process_windows_test.go及acp_runner_test.go的fixture早期分派。既有测试/源码改动均保留。

## 验证

| 项目 | 实际结果 |
| --- | --- |
| 原代码回归 | EOF/已退出子进程复现Access denied，探测返回早于清理；focused-before.log退出1 |
| 延迟EOF | 首版500ms提前Kill，delayed-before.log退出1；3s实现允许延迟2s正常退出 |
| 原生Job专项race | 正常EOF、强制父进程退出、context取消后，原本存活的后代均终止；job-focused.log通过 |
| ACP功能回归 | 成功探测、初始化错误、认证错误、失败后重试、取消、有界强制、已退出非零与resident Close/cancel均通过 |
| 完整后端门 | check/test/race/build均退出0；gates-accepted.json，logs/check-job.log、test-job.log、race-job.log、build-job.log |
| 真实runtime-config | Job版本连续3次HTTP200，真实模型/权限选项；3次probe_completed及父进程回收 |
| 实际退出结果 | 3次forced=true、wait_error=exit status1，原样保留；无ACP WARN/ERROR、Kill失败、清理超时 |
| 后代进程 | 原定3s观察界限内为0，末轮第一次进程采样即为空；process-drain.json、processes-after.json |
| 文档持久化 | 四篇version14/2/3/2，正文hash/updatedAt与before完全一致；task-002/task-003-before.json及task-003-after.json逐字相同 |
| 服务健康 | /api/v1/health ready=true，仅表示HTTP服务；Agent认证/prompt readiness没有由此推断 |

原生fixture中仅对子进程设置GORACE atexit_sleep_ms=0以移除人工退出等待，race检测保持启用。完整门未新增skip、未关闭race或降低检查。go.mod只保留前项x/sys间接转直接的既有差异，go.sum无新增差异。

## 运行失败证据及修正

首版500ms门检查通过，但原生运行不能仅要求exit0：Windows Kill本来就以1结束进程。修正脚本保留强制退出诊断后，又发现Codex/MCP后代短暂残留，固定3s观察也失败。

下载官方npm codex-acp1.1.2源码，仅保存于忽略缓存upstream/，核验官方SHA512 integrity。dist/index.js:21886通过Windows shell启动Codex，:30026有stdin关闭后的2s子进程退出兜底。增加到3s产品等待后仍有后代超出观察界限，故在同一进程生命周期边界增加Job Object，而非继续延长验收窗口或按名称批量杀进程。

初版与仅3s版本的二进制、hash及各轮runtime-config/acp-lifecycle/process-drain/日志保留（first/second/third/grace-only后缀）。初次测试命令还曾只因根日志目录未建而未运行，纠正后才取得红灯证据；不将该次计为测试执行。最后Job版本严格沿用原3s后代观察，验收退出0。

## 最终运行环境与边界

- 后端31430/PID75752：`.cache/parity/task-003/bin-accepted/mediago-server.exe`，同级document/generation MCP.exe；binary-hashes-accepted.json。
- 配置仍为`.cache/parity/task-001/server.yaml`，数据仍为task-001/workspace，前端31431/PID61876保留。日志stdout/stderr为task-003/logs/runtime-accepted.*.log；ACP专用JSON仍在task-001/logs/acp-2026-10-14.log。
- 最终证据：task-003/acceptance.json、runtime-config.json、acp-lifecycle.json、health.json、runtime-accepted.json及logs/runtime-accepted.log。accept-runtime.ps1仅GET配置/健康/文档并只读观察进程。
- 视觉验收不适用，前端未改未重跑；仅Windows原生运行验收，未运行Linux/macOS或Electron。没有真实登录、Agent prompt、生成、导出，也未访问生产workspace-v2。
- TASK-010设计仍待评审，后续单项依用户选择推进。本项完成后归档并记录Session9，保留所有未提交改动和数据，不暂存、提交或推送。
