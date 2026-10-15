# MediaGo Drama Workspace

React 19 / Vite 8 / TypeScript 7 / Tailwind v4 / shadcn / SWR / Zustand 的工作区客户端，Electron 主进程位于 `electron/src/`。本目录已是业务项目，旧 scaffold 的 `src/components/ui`、`api/demo` 等示例不适用。

项目需求、任务和新截图证据从 [对齐入口](../../docs/parity-0.1.17/README.md) 按当前模块读取；[实际前端规范](../../.trellis/spec/frontend/index.md) 定义目录、API envelope、主题和验收规则。

| 位置                              | 责任                                                                                                       |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `src/domains/*`                   | documents / workspace / projects / generation / episode / agent / settings / billing 等领域API、组件、状态 |
| `src/shared/*`                    | UI原子、HTTP与desktop桥接、共享状态/工具                                                                   |
| `src/pages/`、`src/router/`       | 路由页面；`/`项目列表，`/projects?projectId=...`项目工作区                                                 |
| `src/styles/`                     | 设计tokens及主题映射，业务组件复用变量                                                                     |
| `electron/src/`                   | 窗口、preload、安全IPC、sidecar、更新                                                                      |
| `electron/dist/`、`electron/app/` | 生成输出，不手改                                                                                           |

从仓库根运行，先检查端口并确认后端隔离配置；不要使用真实workspace或接管其他会话实例：

```powershell
$env:COREPACK_ENABLE_PROJECT_SPEC='0'
$env:VITE_API_PROXY_TARGET='http://127.0.0.1:<独立后端端口>'
pnpm -C apps/workspace dev --host 127.0.0.1 --port <独立前端端口> --strictPort
```

前端默认代理8080，不代表该端口安全或已启动。Electron开发脚本使用31420，执行前查 `package.json`、环境与桌面存储边界。运行配置/数据/日志放`.cache/parity/<任务>/`，不提交。

质量命令：

```powershell
pnpm -C apps/workspace lint
pnpm -C apps/workspace format
pnpm -C apps/workspace build
pnpm -C apps/workspace exec vitest run <相关测试路径>
```

请求复用领域`api/`的key+fetcher及`@/shared/lib/http`；toast用`@/hooks/useToast`，UI用`@/shared/components/ui`。具体契约读相关规范和实际调用者，不按旧模板另造API或状态层。桌面构建/打包命令以本目录`package.json`为准。
