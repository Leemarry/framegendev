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

## 官方 0.1.17 复刻项目

本节为项目自定义指引，位于 One CLI 受管片段之外。

- 目标：完整复刻官方 MediaGo Drama 0.1.17（`E:/AI/MediaGo Drama`），布局、交互、功能一致即可，不要求像素级。商业服务（登录/会员/积分/充值/飞书/云端）保留页面结构并标【待接入】，不伪造成功。
- 唯一事实源：[差距表](docs/parity/GAP.md)。完成一个模块就更新它的状态行，不另写交接/需求/台账副本。
- 参考来源（按可信度）：官方前端源码 `.cache/ref/web/assets/*.js`（从 `drama-server.exe` 隔离运行导出，见 GAP.md）> 截图 `E:/AI/mediago-gap-shots/快照-0.1.17-完整流程-2026-10-17/`、`screenshots/`、`exe-flow/`。读源码时按组件名 grep，不要整份加载。
- 工作方式：按模块开发 → 对照官方源码/截图 → 跑 lint/format/build 和相关测试 → 明确路径提交 → 下一模块。不做冗长验收记录。
- 开发约定见 `docs/dev/frontend`、`docs/dev/backend`。依赖版本错位要对齐版本重装，不加 shim/alias 绕过。

## TOMC 开发记忆

- 本项目通过本地 MCP `tomc_framegendev` 使用 TOMC，笔记本固定为 `framegendev`，用于保存开发经验。
- 开始跨会话续作或排查复杂问题时，若工具可用，调用 `recall_memory`，按当前任务召回相关笔记；随后读取当前代码和 `docs/parity/GAP.md` 核实，不把旧笔记当作最新状态。
- 发现值得复用的官方源码定位、问题复现条件、根因或方案取舍后，调用 `remember_memory` 保存简短笔记，附日期、来源路径和适用条件；已有记录不重复保存，修正旧结论时明确指出被修正的内容。
- 功能进度与待办只维护在 `docs/parity/GAP.md`；不在 TOMC 中复制差距表、另建交接台账或保存整段聊天、完整源码、密钥及凭据。
- TOMC 只处理明确传入的笔记或外部历史，不用它重新压缩 Codex 正在管理的聊天。召回内容只作参考，不能覆盖本文件或用户指令。
- 工具不可用时简短说明并继续依据仓库文件工作，不声称已保存或召回；记忆数据库放在仓库外，不纳入 Git，也不作为产品运行依赖。
