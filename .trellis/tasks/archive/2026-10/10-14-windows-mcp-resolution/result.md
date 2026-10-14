# TASK-002 实施与实际验收

2026-10-14。状态：已完成。GAP-003已解除质量门阻碍；原隔离后端替换、双配置真实MCP及文档一致性最终验收通过。以下首轮失败记录保留，最终结果见末节。

## 实际改动

- 仅产品文件`services/server/internal/service/acp/acp_mcp.go`及其测试发生本任务改动。公共解析在Windows补`.exe`，已有后缀不重复添加；Linux/macOS保持原名。原候选顺序、8层祖先bin、去重及失败行为保留。
- 新增本机双二进制回归、14组跨平台名称/路径表驱动用例和进程路径异常回归；原假文件测试使用平台名称。先确认两种真实Windows名称均失败，再实施修复。
- 原HTTP优先及generation缺失时保留document的行为通过既有配置回归。未改协议、依赖、Taskfile或ACP运行逻辑。
- 临时Go镜像仅设在检查进程：GOPROXY=https://goproxy.cn,direct，GOSUMDB=sum.golang.google.cn；没有全局配置变更。tidy后go.mod/go.sum无差异。

## 功能验收

独立配置`.cache/parity/task-002/server.yaml`，workspace为`.cache/parity/task-002/workspace`。四个原生二进制构建到task-002/bin，SHA256见binary-hashes.json。后端31432健康ready=true；专用项目`project-d74116ba09ba4d1e`，文档`doc-file-9cf2eef11be39bf3`。

位于`services/server/.cache/parity-task-002-probe/main.go`的忽略文件探针调用真实`acp.ResolveDocumentMCPServersForRun`，验证命令来自探针同级的.exe，再通过现有MCP SDK实际创建两个stdio子进程：

- document：initialize成功，9个工具；list_comments返回structuredContent={threads:[]}，无工具错误。
- generation：initialize成功，2个工具generate_media/generate_media_batch；没有调用生成。
- 只读前后文档正文、version1和updatedAt相同；正文hash为`590c282853e3df6258608f6cfea354d65473782df17ce8507030a11b5dd474dd`。
- 31430上原两篇及TASK-022两篇文档的version/hash与此前快照全部相同。证据：persistence-check.json、document-before/after.json和logs/mcp-probe.log。

本项没有界面变更，视觉验收不适用；进程解析/启动/握手作为交互验收通过。ACP初始化、真实Agent响应、登录、生成、导出均未验收；不将MCP成功等同于Agent可用。

## 首轮检查结果（历史）

| 检查                          | 真实结果                                                                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 原生回归修复前                | 失败，document/generation均寻找无后缀文件                                                                                     |
| focused MCP测试               | 通过，命令见下方                                                                                                              |
| go build ./... / go vet ./... | 均通过                                                                                                                        |
| task check初次                | tidy网络超时；随后镜像恢复下载                                                                                                |
| task check第二次              | tidy/fmt/vet/lint通过；缺workspace嵌入dist导致build失败                                                                       |
| task check最终                | 仓库sync-workspace-dist脚本同步已有前端产物后，tidy/fmt/vet/lint/build/Swagger均通过；race因CGO_ENABLED=0失败                 |
| task test                     | 镜像恢复后Swagger成功，race因CGO_ENABLED=0失败                                                                                |
| CGO_ENABLED=1 focused race    | 失败，runtime/cgo找不到gcc；未安装/修改全局工具链                                                                             |
| 全ACP包测试                   | 失败，既有TestMergedProcessEnvBypassesProxiesForLoopback在Windows大小写不敏感环境下NO_PROXY/no_proxy预期冲突                  |
| go test ./...                 | 失败：数据库未关闭导致TempDir清理文件占用、shell假可执行文件不适用Windows、HOME路径假设；并行链接一次资源不足。不宣称全量通过 |
| git diff --check              | 通过；仅既有CRLF提示                                                                                                          |

```powershell
# services/server
go test ./internal/service/acp -run 'Test(MCPExecutable|ResolveMCPExecutable|DocumentMCP|GenerationMCP|ResolveDocumentMCP)' -count=1 -v
go build ./...
go vet ./...
```

末轮完整check日志`.cache/parity/task-002/logs/task-check.log`。首次网络、缺dist和全量失败保留本记录。现有测试失败登记GAP-003，未越界修改测试或降级质量门。

## 首轮运行与后续（历史）

- 专用31432服务收尾关闭，数据、配置、日志、二进制和探针保留；原31430/PID64284和前端31431/PID61876继续运行。
- 原运行后端未替换，因此其旧MCP警告仍可能出现；不得把源码修复写成已部署。原隔离文档四项核对通过，未重启原服务。
- TASK-002保持Trellis in_progress、产品台账待验收；先解决GAP-003并通过门，再更新原隔离运行环境、复核hash/version并归档。TASK-003随后独立核实，TASK-010设计仍待评审。
- 无Git暂存、提交或推送，HEAD仍47322e43b13cb26c17963decb357154f638e2853；原未提交改动全部保留。未访问生产workspace-v2、原素材或真实项目。

## GAP-003解除后的最终验收

- GAP-003按独立设计修复Windows工具链与测试fixture，原有完整 `task check`、`task test`、显式 `go test -race ./...`、`go build ./...` 全部退出0。日志在 `.cache/parity/gap-003/logs/` 的 `*-accepted.log` 与 remaining-gates.json；没有降低检查级别。
- 重建task-002/bin中的server、document、generation和probe原生.exe，binary-hashes-final.json保留校验值。只停止经进程路径/命令行/端口核实的旧隔离后端64284，改用新server.exe及原task-001/server.yaml；新后端31430/PID49948，健康ready=true，前端31431/PID61876保持运行。旧bin/mediago-server.exe与数据保留，可用于回退。
- 原task-001 workspace与独立task-002 workspace分别执行真实ACP resolver探针；同级.exe实际启动，document initialize/list 9工具、list_comments threads=[]，generation initialize/list 2工具，均PASS。证据为logs/mcp-probe-runtime-final.log、mcp-probe-fixture-final.log。
- 专用文档version1、正文hash `590c282853e3df6258608f6cfea354d65473782df17ce8507030a11b5dd474dd`、updatedAt与首轮基线相同；本轮只读调用前后完整document相同，证据document-runtime-before/after.json。专用31432/PID25708在核验身份后关闭，文件与数据保留。
- 原四篇文档在替换前、重启后、MCP探针后与runtime-config查询后，版本14/2/3/2、正文hash和updatedAt完全相同；persistence-runtime-before/after/final.json。健康、进程路径/配置见health-final.json和runtime-old/new.json。
- 只读GET agent/runtime-config本次HTTP200，返回真实模型与权限选项；ACP清理日志仍记录约6.5秒后的exit1/TerminateProcess denied。不能继续描述为该请求503，也不能据此宣称Agent prompt可用；TASK-003需单独区分正常清理和运行失败。证据acp-status-final.json与logs/runtime.stderr.log。
- 原组合替换命令被自动策略以blocked by policy拦截且未执行；独立核验后，受身份检查约束的单独停止和隐藏启动操作均获执行并成功。未扩大目标进程范围。

本项视觉验收不适用；Windows原生进程解析/启动/握手/工具列表与只读数据验收通过。Linux/macOS只有名称策略回归，未运行其原生二进制；Electron、Agent prompt、真实登录/生成/导出未验收。TASK-002完成后无提交归档，TASK-003待规划，TASK-010仍待评审；Session8记录本轮。
