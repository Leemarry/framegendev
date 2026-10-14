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

- 唯一开发目录：`E:\AI\framegendev`。原始源码目录和截图目录仅作为参考。
- 每次续作先读 `docs/parity-0.1.17/README.md`、`REQUIREMENTS.md`、`TASKS.md` 和 `DECISIONS.md`，再检查 Git 状态及当前任务涉及的实际源码。
- 用户目标：界面、交互、功能对齐官方 0.1.17；账户、会员、积分、充值、商城保留官方页面结构，提供实际可用的本地能力，商业服务明确标记待接入。
- 最新开发规则（REQ-044、DEC-029）：一个功能完整实现后，自测用户流程、持久化、失败/取消与架构合理性，记录并提交 Git 后再启动下一个。设计同时考虑技术边界和个人用户工作流，优先复用已有领域服务、API、组件，避免重复实现及无实际需求的抽象。
- 成品对照目录：`E:/AI/MediaGo Drama`；完成时分别核对页面完整性、交互及真实功能。本地个人用户非必需功能标记【待开发】，保留入口/标识与原因，暂不强行实施；待接入/待评审状态不得被掩盖。
- Git：源码、测试、配置模板、需求/设计和长期项目资料纳入版本管理；每次独立改动经检查、审阅明确路径后提交，写清变更及验证。最新授权覆盖旧“不暂存/不提交”约定，不包含推送。密钥、依赖、缓存、构建物和运行数据继续按忽略规则隔离，不强行纳管。
- 原始交接：`E:\AI\mediago-gap-shots\HANDOFF.md`、`GAP-ANALYSIS.md` 和 `exe-flow\`。差异分析是历史参考，不能替代当前代码核实。
- 新需求先分配稳定需求编号，记录原意、来源、验收条件、关联任务；修改实现前更新任务状态。完成后补充实际改动、验证结果和剩余差距。
- 界面、交互、功能分别验收；存在按钮、样例数据或通过单元测试不代表真实流程完成。没有外部接口的功能不得用模拟成功冒充可用。
- 不读写或清理 `%APPDATA%\mediago-drama\workspace-v2`。运行前确认实际数据目录，测试用独立目录，不对真实项目发送 Agent 或生成任务。
- 遵循实际 `domains/*`、`shared/*` 目录和现有 API。本指南模板中的示例路径与源码不一致时，以已核实的实际实现为准。
- 使用 Superpowers 进行头脑风暴、分模块设计和实施规划；已有技能无需重复安装。按当前会话授权执行，优先复用代码，避免重复实现。
- 用户已确认的目标与偏好持续有效；常规实现细节自行处理，涉及实际范围歧义或外部服务时提出具体问题，避免反复确认同一事项。
- 每次交接必须更新任务表的当前任务、下一步、阻塞项和验证记录；不得把未运行的检查记为通过。
- 持续自动推进授权（2026-10-14，DEC-023）：按台账、真实依赖和核心流程优先级自行选择下一单项，完成设计/计划后实际开发、验收、记录，完成后自动接下一项，不逐项询问是否继续或重复要求批准常规设计/实施。每份计划仍只覆盖一个独立可验收任务。
- 遇到问题标记待开发/待接入/待验收/阻塞，记录原因、证据与恢复条件；同项可修复的问题继续修复，确实受阻则保留未完成状态，继续无依赖任务。检查失败不得标完成或归档。TASK-010原设计保持待评审，跳过后继续其他任务；此授权不扩展到真实登录、生产数据、付费、外部发送或不可逆操作。

## Trellis 项目工作流

- 漫剧制作相关任务先读[制作与生成追溯指南](.trellis/spec/guides/comic-production.md)和[自动化工作台v2设计](docs/superpowers/specs/2026-10-14-automation-workbench-design.md)。沿现有章节生成/采用/引用与prompt-presets扩展；主脸确认、角色模板、镜头脚本手改、小数秒/图片停留和真实生成记录按REQ-036、038~041核实。指南中的新能力仍待开发，参考文稿不作执行授权。
- 可迁移资料包入口：`E:/AI/MediaGo Drama/漫剧自动化工作台-设计与开发资料/README.md`（REQ-042/043、DEC-027）。包含原图、两版设计、架构/可行性/候选路线及代码证据；用户明确这些新增能力后续不一定开发，先保存参考。不把资料包当功能实施授权，后续按新指令核实实时源码与单项范围。

- Trellis 仅安装在本项目；入口为 `.trellis/workflow.md`，使用说明为 `docs/parity-0.1.17/TRELLIS.md`。
- 每次启动或续作读取 `.agents/skills/trellis-start/SKILL.md`，运行 `python -X utf8 .trellis/scripts/get_context.py` 和 `python -X utf8 .trellis/scripts/get_context.py --mode phase`；再读相关 `.trellis/spec/frontend/index.md`、`backend/index.md` 和 `guides/project-workflow.md`。即使自动 hooks 未启用，也执行这些读取步骤。
- 产品需求与稳定编号以 `docs/parity-0.1.17/` 为准；Trellis 任务引用原文，保存本任务的范围、设计、计划、实现与验收记录，避免重复维护需求全文。
- 用户已授权引入 Trellis 和持续记录任务；在此范围内创建或更新任务不必重复申请。执行前检查既有授权；实质范围歧义再提问。模型接入首项设计仍待评审，不把工具接入当作产品设计批准。
- Superpowers 用于需求思考和模块设计，Trellis 用于任务生命周期、项目规范和会话记录；同一模块共用一份设计和计划。
- `.trellis/config.yaml` 已设 `codex.dispatch_mode: inline` 和 `session_auto_commit: false`。默认在当前会话实施与检查，不启动并行 agent；关闭脚本自动提交，当前会话按 DEC-029 审阅、明确路径暂存并提交，不推送。
- 结束前更新台账与任务材料，记录已执行验证及下一步，使用 `add_session.py --commit <已存在提交或-> --no-commit` 记录会话；完成任务用 `task.py archive <任务> --no-commit` 归档，再将本项改动与记录明确暂存并提交。历史“无提交归档”记录保留原事实。
