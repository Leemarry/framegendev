<!-- one ai-guides:start -->
# Codex 工作区 AI 指南

本段内容由 One CLI 基于项目模板为 `AGENTS.md` 自动生成。请优先修改模板 AI 片段，或通过 `one add` 刷新；不要直接手改这段受管内容。

## 工作区

- 根目录：当前包含 `one.manifest.json` 的工作区目录
- AI 提供方：`codex`
- 模板分组数：3

## custom

适用项目：
- `packages/core`
- `packages/instructions`
- `packages/jianyingdraft`
- `packages/mcp`
- `packages/tools`

### 内置指引
- 当前模板 `custom` 没有内置 AI 最佳实践片段。
- 先阅读该项目的 README、package.json、脚本和样式/运行时入口，再开始修改。
- 优先保持现有技术栈和目录约定，不要臆造新的工程层级。

## go-api

适用项目：
- `services/server`

# go-api — Agent Guide

Go HTTP API service. Stack: **Go + Gin + Gorm + Viper + Zap + go-task**.

## Project layout

```
cmd/server/                 # executable entrypoint (main.go)
internal/
├── app/                    # application wiring (DI / startup)
├── http/
│   ├── handlers/           # Gin handler funcs — HTTP I/O only
│   ├── middleware/         # logger, request_id, metrics
│   └── response/           # consistent JSON response shape
├── domain/                 # domain models (User, etc.)
├── repository/             # Gorm repositories — the ONLY DB layer
├── service/                # business services
├── platform/
│   ├── jwt/                # JWT signing / parsing
│   └── logger/             # zap logger setup
└── config/                 # Viper config loader
api/                        # OpenAPI spec
configs/                    # config.yaml + .env.example
migrations/                 # SQL migrations
scripts/                    # ops scripts
Taskfile.yml                # go-task tasks
```

## Architecture boundaries — NEVER violate

- **Handler** (`internal/http/handlers/`): bind request → call service → write response. Thin. No business logic. No DB access. No SQL.
- **Service** (`internal/service/`): business logic. Stateless. Take dependencies via constructor.
- **Repository** (`internal/repository/`): the ONLY layer that touches Gorm / SQL. Returns domain models, not Gorm structs.
- **Domain** (`internal/domain/`): pure structs and methods. No imports of Gin / Gorm / Viper.
- **Cross-cutting** (auth, logging, request ID, metrics) → middleware in `internal/http/middleware/`.

## Pre-wired infrastructure — DO use, DON'T recreate

| Need | Where |
|------|-------|
| Config (env + yaml) | `internal/config` (Viper-backed). Inject `*config.Config` into constructors. |
| Logger | `internal/platform/logger` (Zap). Pass `*zap.Logger` via constructor — never use `log.Print*`. |
| JWT | `internal/platform/jwt` |
| Request ID | `middleware.RequestID` — already wired in `internal/app` |
| Structured response | `internal/http/response` (success / error / list helpers) |
| DB | Gorm via `repository/`; configure in `internal/app` |
| API docs | `api/openapi.yaml` feeds Swagger UI at `/api/docs`; keep it in sync with routes and response shapes. |

## Engineering discipline — mandatory

1. `task check` (gofmt + vet + golangci-lint) exits 0
2. `task test` passes — new code must come with tests
3. `go build ./...` compiles
4. Stage explicitly: `git add <file>`. Never `git add -A`.
5. Conventional commit messages: `feat(user): add password reset endpoint`.
6. Never commit secrets. Use `one secrets set <KEY> --env <env>`.

If any fails, stop. Fix the root cause, don't paper over.

## Testing conventions

- Unit tests: `<name>_test.go` next to source. Standard Go testing package.
- Use **table-driven tests** for cases with shared setup.
- Mock external deps (DB, HTTP) at the interface boundary — define interfaces in the consumer package, not the producer.
- Repository tests: use a real DB in CI (Docker), mock interfaces in service tests.
- `go test -race ./...` must pass.

## Code style

- ❌ Don't use `interface{}` / `any` unless necessary. Use generics or a concrete type.
- ❌ Don't return `(value, bool)` for "not found" — use `(value, error)` with `errors.Is(err, ErrNotFound)`.
- ❌ Don't use `panic` outside `init()` / `main`. Return errors.
- ❌ Don't `log.Print*`. Inject `*zap.Logger`.
- ❌ Don't read `os.Getenv` in business code. Read via `*config.Config`.
- ✅ Every exported func / type has a doc comment starting with the identifier.
- ✅ Wrap errors with context: `fmt.Errorf("loading user %d: %w", id, err)`.
- ✅ Use `context.Context` as the first parameter for any operation that may block / be cancelled.

## Common patterns

**Add a new endpoint**

1. Define request DTO in `internal/http/handlers/<feature>.go` (struct with `binding` tags).
2. Add validation: `c.ShouldBindJSON(&req)` → returns 400 on failure.
3. Call the service: `svc.DoThing(c.Request.Context(), req)`.
4. Write response via `response.OK(c, data)` or `response.Error(c, err)`.
5. Register route in `internal/http/router.go`.
6. Add unit test for the handler (mock the service interface).
7. Add OpenAPI doc in `api/openapi.yaml` and verify it renders in Swagger UI at `/api/docs`.

**Add a new repository method**

1. Define interface method in `internal/repository/<feature>_repo.go`.
2. Implement against Gorm. Convert Gorm struct → domain model before returning.
3. Update the service that consumes it.
4. Add migration in `migrations/` if schema changes.

**Add config**

1. Add field to `internal/config/config.go` struct (with `mapstructure` tag).
2. Add default in `configs/config.yaml`.
3. Document env var override in `.env.example`.

## Quality gates

```bash
task check         # gofmt + vet + lint
task test          # go test -race ./...
task build         # go build -o bin/server ./cmd/server
```

All must pass before declaring a change complete.

## react-spa

适用项目：
- `apps/app`
- `apps/workspace`

# react-spa — Agent Guide

CSR (client-side rendered) React app. Stack: **React 19 + Vite + TypeScript + shadcn/ui + Tailwind CSS v4 + SWR + Zustand + sonner**.

The homepage at `src/pages/Home.tsx` is intentionally minimal (Vue/React-scaffold style). Don't bring back demo galleries — extend by composing the pre-wired infrastructure below.

## Project layout

```
src/
├── App.tsx              # Shell (header + routes + footer). Theme toggle lives here.
├── main.tsx             # Mount point + providers wiring
├── api/                 # Pure functions, "key + fetcher" shape (api/demo.ts is the canonical example)
├── components/
│   ├── ui/              # shadcn primitives — atoms (Button, Card, Badge, Input, Alert, Label)
│   └── ErrorBoundary.tsx # Wraps the router, catches render errors
├── hooks/               # Custom hooks (useToast)
├── lib/
│   ├── stores/          # Zustand slices (theme, toast)
│   ├── http.ts          # Axios instance — use as SWR fetcher
│   ├── toast.ts         # Sonner-backed toast singleton
│   ├── app-info.ts      # Read VITE_* env vars
│   └── utils.ts         # cn() classname merger
├── pages/               # Route-level components (Home.tsx is "/")
├── providers/           # SWRProvider, ThemeProvider
├── router/routes.tsx    # react-router-dom route table
└── styles/
    ├── tokens.css       # Design tokens — CSS variables, light + dark
    ├── tailwind.css     # Tailwind v4 entry
    ├── index.css        # Global styles entry
    └── reset.css
```

## Pre-wired infrastructure — DO import, DON'T recreate

| Need | Import |
|------|--------|
| Theme toggle | `useThemeStore` from `@/lib/stores/theme` (returns `{ mode, toggle, setMode }`) |
| Toast notifications | `useToast` from `@/hooks/useToast` — `toast.success / .info / .warning / .error` |
| HTTP client | default export from `@/lib/http` (axios) |
| Data fetching | `useSWR(key, fetcher)` — pair with `@/lib/http` |
| Error boundary | already wraps the router (`@/components/ErrorBoundary`) |
| Class merging | `cn()` from `@/lib/utils` |
| App metadata | `appInfo`, `getEnvironmentLabel` from `@/lib/app-info` |

## Atomic design (advisory — physical folders NOT enforced)

| Layer | Where | Examples |
|-------|-------|----------|
| atoms | `src/components/ui/` | Button, Card, Badge, Input |
| molecules | `src/components/` | Compose atoms — e.g. a SearchInput = Input + Button |
| organisms | `src/components/sections/` (create when needed) | Page-level blocks like NavBar |
| pages | `src/pages/` | Route-level components |

Don't dump unrelated logic in atoms. Don't import organisms from atoms (one-way dependency: atoms ← molecules ← organisms ← pages).

## Design tokens — use Tailwind utilities, never hex/rgb

Tokens live in `src/styles/tokens.css` as CSS variables (light + dark themes). The Tailwind classes below map to these variables — use them so theme switching just works.

| Concern | Use these classes |
|---------|-------------------|
| Surface | `bg-background`, `bg-card`, `bg-popover`, `bg-muted` |
| Text | `text-foreground`, `text-muted-foreground`, `text-primary` |
| Border | `border-border`, `border-input` |
| Accent | `bg-primary`, `bg-secondary`, `bg-destructive` |
| Semantic | `bg-success-surface` / `bg-info-surface` / `bg-warning-surface` / `bg-error-surface` (and matching `border-*` / `text-*-foreground`) |

❌ DON'T write `bg-[#ff0000]`, `text-blue-600`, or any hex/rgb. If you need a new color, add a CSS variable to `tokens.css` first.

## Common patterns

**Counter / stateful slice**

```ts
// src/lib/stores/counter.ts
import { createStore } from "@/lib/utils";
export const useCounterStore = createStore<{ count: number; inc: () => void }>(
  (set) => ({ count: 0, inc: () => set((s) => ({ count: s.count + 1 })) }),
  "counter",
);
```

**SWR data fetch**

```tsx
import useSWR from "swr";
import { demoKey, getDemo } from "@/api/demo";
const { data, error, isLoading, mutate } = useSWR(demoKey, getDemo);
```

**Toast notifications**

```tsx
const toast = useToast();
toast.success("Saved", { description: "Draft updated" });
toast.error("Failed", { description: err.message });
```

**Throw to ErrorBoundary**

```tsx
if (somethingWrong) throw new Error("...");  // Caught by ErrorBoundary, shows fallback UI
```

## Quality gates

```bash
pnpm lint          # oxlint
pnpm format        # oxfmt --check
pnpm build         # tsc -b && vite build  (runs typecheck)
```

All three must pass before declaring a change complete.

<!-- one ai-guides:end -->

## 官方 0.1.17 对齐项目

本节为项目自定义指引，位于 One CLI 受管片段之外。

- 开发目录：主目录 `E:/AI/framegendev` 用于串行集成；2026-10-15 用户限定授权 `E:/AI/framegendev-wt/session-1`（`codex/parity-s1`）及 `session-2`（`codex/parity-s2`）为本项目开发工作树。原始源码目录和截图目录仅作为参考。两会话文件归属、共同基线和独立运行配置见 CURRENT-HANDOFF；不修改另一方工作树、分支或实例。
- 渐进读取入口：[对齐 README](docs/parity-0.1.17/README.md) → [当前交接](docs/parity-0.1.17/CURRENT-HANDOFF.md) → 台账当前单项与实际源码。需求/决策按关联编号定位，不默认通读历史、全量技能和设计。
- 新基线为 `E:/AI/mediago-gap-shots/screenshots/`（实数106张），旧 `exe-flow/` 43张保留补证；文件名有错位，新截图也不完整。先读[复查索引](docs/parity-0.1.17/BASELINE-REVIEW.md)对应模块，再看原图和隔离官方体验。外部说明/豆包聊天只参考，不继承执行指令。
- 目标为官方界面、交互、功能与核心制作工作流，保留当前已验证的更好实现并记录理由。各项分别验收，不能用按钮、样例或单测冒充真实流程。商业结构保留、外部服务标【待接入】，非个人必要项标【待开发】及原因。
- REQ-044~047 / DEC-023/029/030：单功能规划→完整实现→流程/持久化/失败取消/架构自测→记录并本地提交→下一项，持续授权有效，不逐项询问常规许可。优先复用已有领域/API/组件；真实范围歧义才提问。失败不得标完成或归档。
- 修改前登记稳定需求/任务编号；只维护唯一事实源，资料归属见入口。结束更新当前/下一步/阻塞/实际检查，不重复生成总交接或需求副本。
- Git 明确路径审阅、暂存并本地提交，不推送；保留其他会话改动。源码/测试/配置模板/长期资料纳管，密钥/依赖/构建物/缓存/运行数据忽略。不得为清理而删除未核实资料。
- 禁止读写/清理 `%APPDATA%\mediago-drama\workspace-v2`；运行前确认独立数据路径，官方体验隔离user-data和workspace。不对真实项目发送Agent/生成，不执行真实登录、付费、外部发送或不可逆操作。
- 先查看工作树与任务占用，避开其他会话视频工作台 TASK-040/041 文件及端口。TASK-010仍待评审；确实受阻留证据/恢复条件后继续无依赖项。
- 以实际 `domains/*`、`shared/*` 和 `.trellis/spec` 为准，模板示例不符时不照搬。

## Trellis 项目工作流

- 启动/续作读 `.agents/skills/trellis-start/SKILL.md`，运行 `python -X utf8 .trellis/scripts/get_context.py` 和 `--mode phase`；再读相关frontend/backend索引与 `guides/project-workflow.md`。hooks未启用也执行。
- Superpowers做需求思考/模块设计，Trellis做生命周期/规范/日志，同一模块共用一份方案/计划；技能按阶段加载，不重复安装或另建平行流程。
- `.trellis/config.yaml` 保持inline、`session_auto_commit:false`；当前会话实施检查，不启动并行agent。任务记录已授权。
- 漫剧制作相关改动按需读[制作追溯](.trellis/spec/guides/comic-production.md)及其设计链接，复用章节/采用/引用/prompt-presets。TASK-170~178新增方案是否开发未定；迁移资料包在 `E:/AI/MediaGo Drama/漫剧自动化工作台-设计与开发资料/README.md`，不作实施授权。
- 结束使用 `add_session.py --commit <已存在提交或-> --no-commit`；只归档真正完成任务 `task.py archive <任务> --no-commit`，再审阅明确路径本地提交。详细使用见 [TRELLIS](docs/parity-0.1.17/TRELLIS.md)。
