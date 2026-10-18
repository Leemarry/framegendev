# Codex 交接文档：MediaGo Drama 0.1.17 完整复刻

交接日期：2026-10-17。从现在起本项目只由 Codex 一个 AI 开发；不再使用 Claude Code 和 DeepSeek。
你（Codex）负责：清理仓库、整理需求、逆向分析官方程序、按模块开发、验证并提交，直到复刻完成。
本文件是交接入口。完成「阶段 0」后，把有用内容并入 `AGENTS.md` 和 `docs/parity/GAP.md`，然后删除本文件。

---

## 1. 用户需求（已确认，不要再问）

- **目标**：在 `E:/AI/framegendev` 完整复刻官方 MediaGo Drama 0.1.17（用户口头叫"1.017"），安装位置是 `E:/AI/MediaGo Drama`。做成一个能直接用的本地 AI 漫剧制作工作台。
- **精度**：布局、交互、功能一致即可，不要求像素级。
- **核心流程**：项目 → 剧本/角色/场景/道具/分镜/资料 → 分镜时间轴 → 素材库 → 生成历史 → Drami Agent → 剪辑工作台 → 导出（剪映草稿）。
- **商业功能**（登录、会员、积分、充值、商城、飞书、云端 ComfyUI）：保留页面结构，按钮标【待接入】，不伪造登录、支付、生成成功。
- **复用**：已有且能用的功能直接复用，不重写。
- **旧规则作废**："禁止访问 `%APPDATA%\mediago-drama\workspace-v2`"这条已经废弃。不过动用户真实数据之前，仍要先备份。
- **工作方式**：一次一个模块。对照官方实现 → 开发 → 跑质量门 → 用明确路径提交 → 下一个模块。不写冗长的验收记录，不要一直测试却不开发，前几轮 AI 就是这样失败的。
- **用户不想被打扰**：只有遇到真正需要用户决定的问题才停下来问，例如要删用户数据、或者要放弃某个功能。

## 2. 当前状态

- **分支**：`codex/nle-export`，比 `main` 超前约 150 个提交。不推送，也不合并到 main，除非用户要求。
- **已提交 `b6fe07e`**，内容：
  - 删除了 Trellis 和大量过时文档；
  - 开发规范移到 `docs/dev/frontend` 和 `docs/dev/backend`；
  - 去掉 tiptap 等依赖 shim，按 lockfile 重装依赖；
  - 用 `.gitattributes` 统一 LF 换行；
  - 新增 `scripts/parity/export-official-web.py`。
  - 当时的验证结果：前端 lint 和 build 通过；vitest 1630 个通过、8 个失败。其中 3 个过时用例已修，另外 5 个只在并行时超时，单独跑能过。
- **未提交的改动**（用 `git status` 核实）：
  - 文档：`DEEPSEEK.md`、`CLAUDE.md` 末尾的委托规则，这两份都要清理，见阶段 0。
  - 工具：`scripts/parity/` 下的 `ref-grep.py`、`ref-icons.py`、`dom-dump.py`、`dev-isolated.sh`，保留并提交。
  - shell 组件改了一半，还没构建验证：`apps/workspace/src/domains/workspace/components/` 下的 `ProjectNavigatorProjectPanels.tsx`、`WorkspaceUserMenu.tsx`、`GenerationNotificationButton.tsx`，以及新建的 `SidebarNavButton.tsx`。具体待办见阶段 1。
- **工作树**：`E:/AI/framegendev-wt/session-1`（`codex/parity-s1`）和 `session-2`（`codex/parity-s2`）的代码内容已经并入当前分支。session-1 里只剩几个未跟踪的 Trellis 文件，两个工作树都可以移除；分支先保留。

## 3. 关键发现（必读）

1. **界面整体大了 1.25 倍。** 之前的 AI 按 125% DPI 的截图估算像素，手写了大约 1100 行 CSS：`apps/workspace/src/styles/projects.css`、`asset-library.css`、`user-menu.css`、`workspace-shell.css`。实测侧栏 325px，官方是 260px；导航行高 40px、16px 字，官方是 `h-8 text-sm`。修法：组件直接用官方 DOM 里的 Tailwind class，然后删除这几个 CSS 文件。我们的设计 token 和 Tailwind 配置与官方基本一致，不用改。
2. **官方前端源码可以拿到。** 官方渲染层没有压缩地内嵌在 `resources/bin/drama-server.exe` 里。它是在我们这套代码（0.1.8）之后继续开发出来的版本，压缩后的 JSX 能读懂，可以按组件照搬结构、class、文案和接口。
3. **官方 UI 可以在浏览器里直接操作。** 隔离启动 drama-server 后，用浏览器访问就是完整的官方网页 UI，不需要虚拟桌面。原生菜单、原生文件选择框除外。
4. **官方路由**：`/`、`/projects`、`/project-settings`、`/library`、`/history/{image,video,text,audio}`、`/toolbox/*`、`/agent`、`/agent/archived`、`/settings`、`/prompt-pack-editor`、`/embedded-browser/*`。
   我们缺这些：`/library`（我们用的是 `/assets`）、`/history/*`（我们用抽屉）、`/project-settings`（我们用 `/settings?projectId`）、`/agent`（我们把它重定向走了）、`/embedded-browser/*`。
5. **官方素材库重写成了一套新的 `/asset-catalog` 体系**：分页、revision 乐观锁、回收站、导入队列、文件夹角色。我们还是 0.1.8 的 `/media-assets`。
6. **依赖版本**：pnpm 必须用 11.9.0（corepack）。全局的 pnpm 8.6 会把 lockfile 降级到 v6，导致 tiptap 版本错位、页面白屏。

## 4. 工具和材料

| 用途 | 位置与用法 |
|---|---|
| 导出官方前端源码 | `python scripts/parity/export-official-web.py` → `.cache/ref/web/assets/*.js`（168 个 chunk，在 gitignore 里；丢了就重新导出） |
| 在官方源码里定位 | `PYTHONUTF8=1 python scripts/parity/ref-grep.py "<中文文案/组件名/i18n key>" --file "<chunk前缀>*.js" --before 800 --after 1500 --max 1`。不要整份读 chunk。全部中文文案在 `i18n-*.js` |
| 压缩图标变量 → lucide 名 | `python scripts/parity/ref-icons.py <chunk前缀> <变量...>`，例如 `ref-icons.py workspace-bootstrap St _t` |
| 官方实例（网页） | `MEDIAGO_SERVER_PORT=56990 MEDIAGO_SERVER_HOST=127.0.0.1 "E:/AI/MediaGo Drama/resources/bin/drama-server.exe" serve -workspace E:/AI/framegendev/.cache/ref/official-ws`，然后访问 http://127.0.0.1:56990 |
| 我们的开发环境 | `BUILD=1 bash scripts/parity/dev-isolated.sh`：后端 :31530，前端 http://127.0.0.1:31531，数据在 `.cache/dev-ws`。停止用 `kill $(cat .cache/dev.pids)` |
| 无头浏览器（CDP） | `"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --remote-debugging-port=31599 --user-data-dir="E:\AI\framegendev\.cache\edge" --window-size=1600,1080 about:blank &` |
| DOM/截图对比 | `browser-harness`（`~/.local/bin`）+ `scripts/parity/dom-dump.py`（用法见文件头）。分别导出官方和我们的 class 结构，逐行对照 |
| 虚拟桌面（原生菜单/对话框/完整窗口截图） | `pwsh -NoProfile -File scripts/parity/start-official-desktop.ps1 -AuditDirectory .cache/parity/<名称> -DesktopName <唯一名称> -DebugPort <空闲端口>`。这是 Win32 `CreateDesktop` 创建的独立桌面，不会影响用户正在用的桌面。每次换新的目录、桌面名和端口。会话参数在 `<AuditDirectory>/official-session.json`，可以用 `BU_CDP_URL` 连 browser-harness。完整窗口截图用 `EnumDesktopWindows`+`PrintWindow`。结束时只关本次启动的进程 |
| REA 逆向 | https://github.com/morluto/rea（npm 包 `rea-agents`，支持 Codex MCP）。Electron 主进程（应用菜单、IPC、窗口、更新）只在 `E:/AI/MediaGo Drama/resources/app.asar` 里，网页 bundle 里没有：`npx -y rea-agents@latest analyze-javascript-application "E:/AI/MediaGo Drama/resources/app.asar" --json`。要注册成 MCP 就运行 `npx rea-agents setup`，它会修改 `~/.codex/config.toml`，先备份 |
| 官方截图 | `E:/AI/mediago-gap-shots/快照-0.1.17-完整流程-2026-10-17/`（26 张有效图，009~011 是失败图）、`screenshots/`（106 张）、`exe-flow/`（43 张）。都是 125% DPI，不能直接量像素，优先用源码和实例 |
| 已有的差距分析 | `.cache/ref/gap-reports.json`：shell、assets、agent、settings、newtools 五个模块，有功能点、官方证据、我们的现状、缺口、工作量。documents、episode、generation 三个模块还没做 |
| 官方逆向说明 | `E:/AI/mediago-gap-shots/快照-0.1.17-完整流程-2026-10-17/逆向功能分析.md`（推断的数据模型和 P0/P1/P2 优先级） |
| 开发规范 | `docs/dev/frontend/*`、`docs/dev/backend/*`，以及 `AGENTS.md` 里 One CLI 管理的那段指引 |

**环境注意**（Windows + git bash）：

- 带中文的 Python 要设 `PYTHONUTF8=1`；
- 在 git bash 里传以 `/` 开头的参数要设 `MSYS_NO_PATHCONV=1`；
- 二进制要用 Windows 路径，可以用 `cygpath -m` 转换；
- Go 命令慢的话加 `GOPROXY=https://goproxy.cn,direct`。

## 5. 阶段 0：清理和整理（先做）

1. 删除 `DEEPSEEK.md`。从 `CLAUDE.md` 里删掉「Cost and delegation rules」和「When invoked by the DeepSeek coordinator」两节，以及引用 DeepSeek/Claude 委托的内容。`CLAUDE.md` 的 One CLI 管理段落保留，或者整份删除；用户已经不再用 Claude，你自己判断，删的话先确认没有工具依赖它。
2. 重写 `AGENTS.md` 末尾的「官方 0.1.17 复刻项目」一节：并入本文件第 1、3、4 节的要点，保持简短，指向 `docs/parity/GAP.md`。
3. 生成 `docs/parity/GAP.md`，作为唯一的事实源：
   - 把 `gap-reports.json` 整理成一张表：`模块 | 功能点 | 官方证据 | 我们现状 | 缺口 | 工作量 | 状态`；
   - 补齐 documents、episode、generation 三个模块；
   - 再用 REA 分析 `app.asar`，补上 electron 模块。
4. 清理杂项。删除前先确认没被引用：
   - 两个旧工作树：`git worktree remove`，session-1 里未跟踪的 Trellis 文件可以直接丢弃；
   - `.cache` 里不再用的东西：保留 `ref/`，其余可删；
   - 仓库里其他过时的 MD 和设计稿。`docs/adr`、`docs/mgmd-*`、各包 README、`COMMERCIAL_FEATURES.md`、`LICENSE` 要保留。
   - `E:/AI/mediago-gap-shots/` 下的旧 `HANDOFF.md`、`GAP-ANALYSIS.md` 已经过时，可以删。截图要保留。
5. 用明确路径提交：`chore(parity): hand over to codex and add gap table`。最后删除本文件，并入同一个提交或下一个提交都可以。

## 6. 阶段 1 起：开发队列

每个模块的流程：

1. 读 GAP.md 中该模块的行；
2. 用 ref-grep 拿到官方 JSX、class、文案和接口；必要时打开官方实例，或用 dom-dump 对照；
3. 实现（前端加上需要的后端接口）；
4. 跑质量门；
5. 在我们的开发环境实际点一遍，和官方对照；
6. 提交，并更新 GAP.md 的状态。

1. **shell 收尾**（接着未提交的改动做）：
   - `ProjectNavigator.tsx` 给 `ProjectsSidebarPanel` 传 `onOpenGlobalAgent`；
   - `ProjectNavigatorPanels.tsx` 约 674 行把 `projects-root-user` 换成 `SidebarUserFooter`；
   - `AssetLibraryButton.tsx`、`GlobalToolboxDrawer.tsx` 里的 `projects-root-nav` 换成 `sidebarNavRowClassName` + `SidebarNavContent`；
   - 修复受影响的测试。
2. **项目管理页** `pages/Projects.tsx`，按官方 DOM 改：
   - header `h-11`，Tab `h-7 min-w-16 text-xs`；
   - 卡片网格 `grid-cols-[repeat(auto-fill,minmax(min(100%,10.5rem),11.5rem))]`，卡片 `aspect-[3/4]`；
   - 导入项目、打开已有目录、封面取色；
   - 做完删除 `projects.css`。
3. **路由对齐**：`/library`、`/history/*`、`/project-settings`、`/agent`、`/agent/archived`，侧栏改成官方的分层屏幕；旧地址做重定向。
4. 按 GAP.md 的顺序继续：素材库（asset-catalog、回收站、分页）→ 文档工作区 → 生成历史 → Drami 全局与项目 Agent → 设置各页 → 剪辑工作台与字幕、剪映导出 → Electron 壳（应用菜单、窗口）→ 0.1.17 新增的工作流画布和内嵌浏览器（能本地实现的就实现，依赖外部服务的标【待接入】）。

## 7. 质量门（都必须通过才能提交）

```bash
export COREPACK_ENABLE_PROJECT_SPEC=1
corepack pnpm@11.9.0 -C apps/workspace lint
corepack pnpm@11.9.0 -C apps/workspace format
corepack pnpm@11.9.0 -C apps/workspace build
corepack pnpm@11.9.0 -C apps/workspace exec vitest run <相关测试>
# 改了后端：
cd services/server && task check && task test && cd ../.. && go build ./services/server/...
```

- 完整 vitest 并行跑时，`AgentChat.test.tsx` 和 `AssetLibrary.test.tsx` 偶尔会超时；单独重跑能过就不算失败。
- 依赖错位要对齐版本、用上面的 pnpm 重装，不要用 shim 或 Vite alias 绕过。
- Git：用 `git add <文件>` 暂存，提交信息用 Conventional Commits，不推送，不用 `git add -A`，不用 `--no-verify`。

## 8. 汇报

每完成一个模块：用几句话说明改了什么、提交哈希、质量门结果、剩余差距。只有需要用户决定的事情才停下来问。
