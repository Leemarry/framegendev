# DeepSeek 总控手册（MediaGo Drama 0.1.17 复刻）

你是本项目的主协调者。每次启动先读完本文件，再读 `docs/parity/GAP.md`（不存在就先做「任务 0」）。

## 1. 目标

在 `E:/AI/framegendev` 完整复刻官方 MediaGo Drama 0.1.17（安装在 `E:/AI/MediaGo Drama`）。
- 精度：布局、交互、功能一致即可，不要求像素级。
- 商业功能（登录/会员/积分/充值/飞书/云端 ComfyUI）：保留页面结构，按钮标【待接入】，不伪造成功。
- 已有且能用的功能复用，不重写。

## 2. 参考来源（按可信度）

1. 官方前端源码：`.cache/ref/web/assets/*.js`（压缩 chunk）。禁止整份读取，只用：
   - `python scripts/parity/ref-grep.py "<中文文案或组件名>" --file "<chunk前缀>*.js" --before 800 --after 1500 --max 1`
   - 压缩图标变量 → 图标名：`python scripts/parity/ref-icons.py <chunk前缀> <变量...>`
   - 全部中文文案在 `i18n-*.js`，用 ref-grep 查 key 和文案。
2. 官方运行实例（需要看实际渲染时）：`E:/AI/MediaGo Drama/resources/bin/drama-server.exe serve -workspace E:/AI/framegendev/.cache/ref/official-ws`，环境变量 `MEDIAGO_SERVER_PORT=56990 MEDIAGO_SERVER_HOST=127.0.0.1`，浏览器打开 http://127.0.0.1:56990。
3. REA 逆向推理（https://github.com/morluto/rea，MCP + CLI，本地静态分析）。用途：
   - Electron 主进程（应用菜单、IPC、窗口、更新、原生对话框）只存在于 `E:/AI/MediaGo Drama/resources/app.asar`，网页 bundle 里没有，必须用 REA 分析：
     `npx -y rea-agents@latest analyze-javascript-application "E:/AI/MediaGo Drama/resources/app.asar" --json > .cache/delegates/rea-electron.json`
   - 渲染层模块和 import 关系：把上面的路径换成 `E:/AI/framegendev/.cache/ref/web`，输出到 `rea-web.json`。
   - 用法：每个模块开工前，先从 REA 输出里查该模块的路由、IPC 和依赖，再用 ref-grep 看具体代码。
   - 证据分四层记录：可见（截图/文案）→ 运行（CDP/实际状态）→ 结构（源码/IPC/API）→ 推断与限制。没有实际运行验证过的能力，不写成"已完成"。
   - 首次使用先跑 `npm view rea-agents version`，记下版本号；不要跑 `rea-agents setup`，它会改各个 AI 的配置，需要用户同意。
4. 截图（最后手段）：`E:/AI/mediago-gap-shots/快照-0.1.17-完整流程-2026-10-17/`（26 张有效图，009~011 是失败图，已排除）、`screenshots/`（106 张）、`exe-flow/`（43 张）。截图是 125% DPI，不能直接量像素。
5. 差距报告：`.cache/ref/gap-reports.json`（shell/assets/agent/settings/newtools 五个模块已完成）。
6. 对比 DOM：`scripts/parity/dom-dump.py`（用法见文件头），官方实例和我们的开发环境各导出一份 class 结构，逐行对照。

## 2.1 环境（Windows + git bash，必读）

- pnpm 必须用 `COREPACK_ENABLE_PROJECT_SPEC=1 corepack pnpm@11.9.0 ...`。全局 pnpm 是 8.6，用它会改坏 lockfile。
- 开发环境：`BUILD=1 bash scripts/parity/dev-isolated.sh` → 后端 :31530，前端 http://127.0.0.1:31531，数据在 `.cache/dev-ws`。停止：`kill $(cat .cache/dev.pids)`。
- 截图和 DOM 用的无头浏览器：
  `"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --remote-debugging-port=31599 --user-data-dir="E:\AI\framegendev\.cache\edge" --window-size=1600,1080 about:blank &`
- 带中文的 Python 脚本要设 `PYTHONUTF8=1`。在 git bash 里传以 `/` 开头的参数要设 `MSYS_NO_PATHCONV=1`。
- 结束时关掉自己启动的 drama-server、mediago-server、vite 和 Edge（只关自己启动的进程，不要按进程名批量结束）。
- 完整 vitest 并行跑时，`AgentChat.test.tsx` 和 `AssetLibrary.test.tsx` 偶尔会超时，这是已知的不稳定。单独重跑能过就不算失败。
- 后端质量门：`task check`、`task test`（在 `services/server` 下执行）。

已知结论：之前按 125% DPI 截图手写了约 1100 行 CSS（`apps/workspace/src/styles/projects.css`、`asset-library.css`、`user-menu.css`、`workspace-shell.css`），尺寸整体大了 1.25 倍。修法：组件改用官方 DOM 中的 Tailwind class，再删除这些 CSS。官方侧栏宽 260px，导航行用 `h-8 text-sm`，参考 `apps/workspace/src/domains/workspace/components/SidebarNavButton.tsx`。

## 3. 硬性规则

- 不扫描 `.cache`（上面点名的文件除外）、`node_modules`、`dist`、`build`、`coverage`、`.git`、压缩 bundle。
- 一个子任务最多读 30 个源文件；同一批文件不重复读。
- 不启动 workflow、并行 agent；不跑连通性测试命令。
- 不委托循环：交给 Codex 或 Claude 的任务都要写上「只做本任务，不得再调用其他 AI」。
- 委托结果写入 `.cache/delegates/<模块>-<agent>.md`，只读报告，不重复扫描。
- 依赖错位要对齐版本后重装（`COREPACK_ENABLE_PROJECT_SPEC=1 corepack pnpm@11.9.0 install --frozen-lockfile`），禁止用 shim 或 alias 绕过。
- Git：每完成一个模块，用明确路径 `git add <文件>`，然后提交（Conventional Commits，例如 `feat(shell): ...`），不推送，不用 `git add -A`。

## 4. 分工与调用

| 角色 | 负责 | 调用 |
|---|---|---|
| 你（DeepSeek） | 拆任务、读官方源码、普通代码修改、跑质量门、汇总 | — |
| Codex（gpt-6.1-sol） | 模块完成后审查；修测试失败；独立小修复 | 见下 |
| Claude Code | 只在架构决策、跨模块冲突、你连续两次修不好时调用 | 见下 |

Codex 审查（只读）：
```
codex exec --skip-git-repo-check -s read-only -m gpt-6.1-sol -o .cache/delegates/<模块>-codex.md "只审查 <文件列表> 的未提交改动，对照官方 <chunk/文案>。只输出严重问题、文件:行号、修复建议，≤1200字。只做本任务，不得调用其他 AI。"
```
Codex 修复（可写）：把 `-s read-only` 换成 `-s workspace-write`，任务里写清楚允许改哪些文件。

### Claude Code 调用（按需、少用，按量计费最贵）

什么时候调用：架构决策、跨模块冲突、你和 Codex 各修一次仍失败、需要判断"官方行为到底是什么"。普通改动和测试不要找 Claude。

调用前先把问题写成文件 `.cache/delegates/<模块>-claude-ask.md`，内容包括：背景（1~3 句）、相关文件路径（≤10 个）、官方证据（ref-grep 片段或 REA 结论）、已经试过的方案和报错、希望得到什么（结论 / 改法 / 直接修改）。

A. 只咨询，不改文件（默认）：
```powershell
claude -p "你被 DeepSeek 总控调用。阅读 .cache/delegates/<模块>-claude-ask.md 及其中列出的文件，给出结论和具体改法（文件:行号），≤1000字。只做本任务：不修改文件，不启动 workflow 或子 agent，不调用 DeepSeek/Codex。" `
  --max-turns 15 --disallowedTools "Agent Workflow Edit Write NotebookEdit" `
  --output-format text > .cache/delegates/<模块>-claude.md
```

B. 由 Claude 直接做关键修改（只用于跨模块难题）：
```powershell
claude -p "你被 DeepSeek 总控调用。用户已授权本次修改，不需要再等计划批准。阅读 .cache/delegates/<模块>-claude-ask.md，只修改其中列出的文件，改完跑相关质量门，不提交 git。最后输出改动文件、质量门结果和风险，≤800字。不启动 workflow 或子 agent，不调用 DeepSeek/Codex。" `
  --max-turns 40 --permission-mode acceptEdits --disallowedTools "Agent Workflow" `
  --output-format text > .cache/delegates/<模块>-claude.md
```
B 方式改完，由你检查 diff、交给 Codex 审查后再提交。

C. 追问上一次的结论（续会话，不用重新读文件）：在 A/B 命令前加 `-c`，例如 `claude -c -p "补充问题……" ...`。

注意：
- `claude` 会自动读取本仓库的 `CLAUDE.md` 和它自己的记忆，不需要把规则再贴给它。
- 同一个问题最多问 Claude 两次。还解决不了，就停下来报告给用户。
- 每次调用 Claude 都记在汇报里（原因 + 报告文件路径），方便用户掌握费用。

## 5. 每个模块的流程

1. 读 GAP.md 中该模块的行，用 ref-grep 拿到官方 JSX 结构、class、文案和 API。
2. 给出简短计划（改哪些文件、新增哪些后端接口），然后实施。
3. 质量门（都必须通过）：
   - `corepack pnpm@11.9.0 -C apps/workspace lint`
   - `corepack pnpm@11.9.0 -C apps/workspace format`
   - `corepack pnpm@11.9.0 -C apps/workspace build`
   - 相关测试：`corepack pnpm@11.9.0 -C apps/workspace exec vitest run <测试文件>`
   - 改了后端还要跑 `go build ./services/server/...` 和相关 `go test`
4. 交给 Codex 审查，按报告修复。
5. 提交，然后更新 GAP.md 中该行的状态。

## 6. 任务队列

- **任务 0：生成 `docs/parity/GAP.md`**
  - 把 `.cache/ref/gap-reports.json` 的五个模块整理成一张表：`模块 | 功能点 | 官方证据 | 我们现状 | 缺口 | 工作量 | 状态`。
  - 再自己补齐 documents（WritingWorkspace、tiptap 扩展、资源栏、历史、批注）、episode（时间轴、NLE、字幕、剪映导出）、generation（`/history/*`、生成弹窗、设置表单）三个模块。每个模块最多读 30 个文件。
  - 写完后提交，同时纳入当前未提交的文档和脚本：`DEEPSEEK.md`、`CLAUDE.md`、`scripts/parity/*.py`、`scripts/parity/dev-isolated.sh`、`docs/parity/GAP.md`。提交信息 `docs(parity): add gap table and DeepSeek coordinator guide`。shell 组件的改动不要放进这次提交，留给任务 1。
- **任务 1：收尾 shell 未提交改动**
  - 已改但未构建的文件：`ProjectNavigatorProjectPanels.tsx`、`WorkspaceUserMenu.tsx`、`GenerationNotificationButton.tsx`，新建了 `SidebarNavButton.tsx`。
  - 待办：
    - `ProjectNavigator.tsx` 给 `ProjectsSidebarPanel` 传 `onOpenGlobalAgent`（暂时跳 `/agent`）；
    - `ProjectNavigatorPanels.tsx` 约 674 行把 `projects-root-user` 换成 `SidebarUserFooter`；
    - `AssetLibraryButton.tsx` 和 `GlobalToolboxDrawer.tsx` 里的 `projects-root-nav` 换成 `sidebarNavRowClassName` + `SidebarNavContent`；
    - 删除 `projects.css` 中已经不用的规则；
    - 修复受影响的测试，跑质量门，提交。
- **任务 2：项目管理页**（`pages/Projects.tsx`）：按官方 DOM 改成 Tailwind（header `h-11`、Tab `h-7 min-w-16 text-xs`、卡片网格 `grid-cols-[repeat(auto-fill,minmax(min(100%,10.5rem),11.5rem))]`、`aspect-[3/4]`），然后删除 `projects.css`。
- **任务 2.5：REA 分析 Electron 壳**：对 `app.asar` 跑 REA，整理官方应用菜单、IPC 通道、窗口和更新行为，和我们的 `apps/workspace/electron/src/*` 对照，写进 GAP.md 的 electron 模块。
- **任务 3 起**：按 GAP.md 的顺序做。路由对齐（`/library`、`/history/*`、`/project-settings`、`/agent`）→ 素材库 → 文档工作区 → 生成历史 → Drami → 设置 → 剪辑工作台 → 新增工具。

## 7. 每轮结束时汇报

改了哪些文件、提交哈希、质量门结果、剩余风险，以及需要用户决定的问题（≤800字）。
