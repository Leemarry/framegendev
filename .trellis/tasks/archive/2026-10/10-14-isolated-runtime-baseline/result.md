# TASK-001 实际验收记录

日期：2026-10-14。最终结论：TASK-004 独立修复后严格持久化复验通过，基线通过。下文保留首次失败和当时未改产品代码的历史证据；本轮复验见末节。

## 环境与命令

| 项目            | 实际结果                                                                        |
| --------------- | ------------------------------------------------------------------------------- |
| Go              | go1.26.6 windows/amd64；源码最低版本与实际工具版本分开记录                      |
| Node            | v24.14.0，D:/nodejs/node.exe                                                    |
| pnpm            | 8.6.0；项目声明10.14.0，本机现有版本实际通过本轮三项命令，未升级依赖            |
| Task            | 3.54.0                                                                          |
| Git Bash        | 5.2.26(1)-release，D:/Program Files/Git/bin/bash.exe                            |
| Python          | 本机 Trellis Python 3.15.0rc1；Browser Harness 内部 Python 3.12.13              |
| Browser Harness | 0.1.8；专用 headless Chrome/CDP 与 task-001/browser profile，无复用用户登录会话 |
| Git             | main，HEAD 47322e43b13cb26c17963decb357154f638e2853；暂存区未变                 |

实际构建：Git Bash 下 `GOPROXY=https://goproxy.cn,direct task build:server INCLUDE_WORKSPACE_DIST=0`，server/document MCP/generation MCP 均成功。

启动配置：`E:/AI/framegendev/.cache/parity/task-001/server.yaml`，绝对 workspace/log 路径。配置原件在缓存；未修改默认 configs/server.yaml。

后端：`bin/mediago-server.exe --config .cache/parity/task-001/server.yaml`；初始 PID45120，已停止并重启为15460，地址 `http://127.0.0.1:31430`。

前端：`VITE_API_PROXY_TARGET=http://127.0.0.1:31430 pnpm dev --host 127.0.0.1 --port 31431 --strictPort`，地址 `http://127.0.0.1:31431/`。原 Node PID51044 已停止；后台 pwsh PID48860 运行 `.cache/parity/task-001/start-web.ps1`，最终监听 Node PID61876。自动审批拒绝 Node 直接后台启动，仅给出 blocked by policy；使用常规 pnpm 开发命令成功，未要求额外授权。

## 工具状态：不能混同存在与业务成功

| 工具           | 实际解析/版本                                                                    | 可执行验证                             | 实际业务                              |
| -------------- | -------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------- |
| server         | framegendev/bin/mediago-server.exe，本轮重新构建                                 | 健康 ready=true                        | 基础项目/文档可用                     |
| 两类 MCP       | bin/mediago-document-mcp.exe、mediago-generation-mcp.exe                         | 构建通过；运行解析缺后缀               | 未验证；document MCP 被禁用，TASK-002 |
| ACP            | packages/vendor/dist/codex/codex-acp.exe，1.1.2                                  | --version 通过；界面初始化进程退出     | 未就绪，TASK-003；未发送 Agent 任务   |
| Codex          | vendored codex/vendor/x86_64-pc-windows-msvc/bin/codex.exe，0.144.0              | --version 通过                         | 未登录/生成；不以版本输出证明业务     |
| FFmpeg/FFprobe | packages/vendor/dist/tools 对应目录，n6.1.2                                      | -version 通过                          | 未导出或转码                          |
| Dreamina       | tools/dreamina/dreamina.exe；清单1.4.19，实际 --version 返回commit 1d0bd17-dirty | --version 通过，清单与实际标识分开记录 | 未登录/生成                           |
| LibTV          | tools/libtv/libtv.exe，1.0.2                                                     | --version 通过                         | 未登录/生成                           |
| Pippit         | tools/pippit/pippit-tool-cli.exe，1.0.10                                         | --version 通过                         | 未登录/生成                           |

配置指向上述 vendored 根目录；settings/api-keys 返回所有 provider configured=false。仅读取真实状态，没有保存凭据或触发登录。

## 检查与验收结果

| 检查                                                         | 结果与证据                                                                                                                                                                                                                                 |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Go server/MCP 构建                                           | 通过，退出0                                                                                                                                                                                                                                |
| 前端 lint                                                    | 通过，0 warnings/errors，626文件                                                                                                                                                                                                           |
| 前端 format                                                  | 通过，646文件                                                                                                                                                                                                                              |
| 前端 build                                                   | 通过，tsc/Vite；存在大于500kB chunk提示，未做无关优化                                                                                                                                                                                      |
| health                                                       | 重启前后均 code=0、success=true、data.ready=true                                                                                                                                                                                           |
| projects/capabilities/model-platforms/api-keys               | 成功，真实 envelope；未打印凭据                                                                                                                                                                                                            |
| UI 创建项目/中文文档                                         | 通过，中文项目/文档实际持久化                                                                                                                                                                                                              |
| 刷新/服务重启后的文字恢复                                    | 三句中文仍在、标题一致；不等于原始内容稳定                                                                                                                                                                                                 |
| 严格持久化一致性                                             | **失败**，仅刷新 version9→10、长度160→169、LF20→22，新增空段落/&nbsp;；TASK-004                                                                                                                                                            |
| 模型配置与项目素材库入口                                     | 通过，真实未配置/未登录、真实空素材库；未上传源项目内容                                                                                                                                                                                    |
| 浏览器异常                                                   | 未观察到 JS exception 或业务HTTP4xx/5xx；Vite 捕获 console.error: flushSync was called from inside a lifecycle method（GAP-002）；刷新取消请求有 ERR_ABORTED，server 重启的 SSE 有预期 ECONNRESET；素材浮层 aria-hidden focus 警告 GAP-001 |
| ACP/MCP                                                      | 存在上述启动缺陷；不标记可用                                                                                                                                                                                                               |
| 后端 task check/test、全量前端测试、Electron、生成/登录/导出 | 本轮未运行；不作为通过结果                                                                                                                                                                                                                 |

测试项目 `project-667f58e1306b52e8`，文档 `doc-1791954637945-opoyqjglmw`。
实际 API 返回 databasePath 在 task-001/workspace/.mediago-drama/db/app.db，settings.db 同目录；文档在该项目 work/TASK-001 中文文档.md。

无编辑刷新前后文件SHA256：

```text
version9: E37F84C6206DF72FA00888C8D35066CBB5D399FC866F7BE81718BED272A57599
version10: 8DAAFE283D3DB62319A8B40676367211912B0B3C5D29BC707D23157FF8946BDD
```

## 证据与约束

缓存根目录 `.cache/parity/task-001/`：document-saved.png、document-refreshed.png、document-restarted.png、document-final.png、document-roundtrip-defect.png、settings-api-keys.png、assets-empty.png；浏览器截图1560×1050，仅为本轮证据，不是官方视觉对齐验收。

日志在 logs/server.stdout.log、server.stderr.log、server-restart.stdout.log、server-restart.stderr.log、server-2026-10-14.log、acp-2026-10-14.log。

全部测试写入本开发仓库的缓存、构建产物和任务记录；原源码/官方项目/参考截图/源素材/既有测试目录/toonflowLocal 未写入，生产 workspace-v2 未访问。未进行外部目录修改前后全量hash比较；此结论基于实际操作范围。

## 下一步

TASK-004 独立规划与修复后复验 TASK-001；MCP/ACP 的 TASK-002/003 独立处理。TASK-010 仍待设计评审，第二阶段与画布本轮仅登记，不执行。任务保持 in_progress 并标注 acceptance=failed；不把检查执行结束当作任务已通过。

## TASK-004 修复后的复验

首次下一步已执行：TASK-004修改两处编辑器源码并完成回归。
连续两次无编辑刷新、概览切换重开：version13/hash完全不变。
UI键入中文后PATCH200并保存version14；刷新、服务重启后完整文件hash/version仍不变，
中文正文和标题恢复。证据在 `.cache/parity/task-004/snapshots.jsonl` 和该任务result.md。
严格持久化由失败转为通过，不覆盖首次失败数据。

本轮lint/format/build重新执行通过，文档37文件224测试通过；
health/projects/capabilities/model-platforms/api-keys/workspace-state重新读取均success=true/code=0。
隔离workspace路径核实不变，DB在task-001/workspace/.mediago-drama/db。
后端PID64284（31430），前端PID61876（31431）；重启标准输出日志在task-004，
应用日志仍在task-001。两者均为开发仓库隔离缓存，不指向用户目录。

三阶段需求、延期项及工具真实状态已登记。全部基线标准已有实际结果，故TASK-001通过。
MCP/ACP仍存在独立缺陷，不代表Agent或生成可用；TASK-002/003随后独立规划。
未运行项沿用上文限制，官方对齐任务与TASK-010评审状态不受基线完成影响。
