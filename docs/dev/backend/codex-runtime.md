# Codex Runtime (local dev)

Scope: how the replica runs the Codex (GPT) agent backend locally, and why a fresh
checkout reports `Agent 运行环境暂不可用` / `bundled Codex account service is unavailable`.

## Architecture: ACP here, app-server upstream

| | This replica (0.1.8 lineage) | Official 0.1.17 | `infinite-canvas-unified` |
|---|---|---|---|
| Transport | ACP over stdio | Codex app-server JSON-RPC | Codex app-server JSON-RPC |
| Process | `codex-acp` adapter → `codex` | vendored `codex.exe` | `node @openai/codex/bin/codex.js app-server --stdio` |
| Manifest | `agents/codex/agent.json` with `bin` + `codexBin` | `agents/codex/agent.json`, `bin` **is** the CLI, no `codexBin` | npm dependency, no manifest |

Evidence for the official side: `resources/agents/codex/agent.json` in the installed
0.1.17 app names `vendor\x86_64-pc-windows-msvc\bin\codex.exe` with no `codexBin`,
and `drama-server.exe` contains `codex-app-server` / `starting app-server: %w` with
zero `codex-acp` strings. Our `bin/mediago-server.exe` still contains `codex-acp`,
`CODEX_PATH` and the ACP engine. ADR-0005 pins the adapter contract.

Consequence: the ACP adapter is **our** runtime dependency. Upstream stopped shipping
it, so it has to be vendored (below) instead of copied from the official install.

## Vendoring

```powershell
pwsh scripts/dev/vendor-codex-agent.ps1
```

That installs `codex-acp@1.1.2` + `@openai/codex@0.144.0` into `bin/agents/codex/adapter`
(gitignored), writes `bin/agents/codex/agent.json` and the `codex-acp.cmd` launcher shim.

Keep both versions pinned to ADR-0005. `codex-acp` 2.x and Codex 0.16x changed the
event and metadata contract the runner translates.

## Environment

`scripts/parity/dev-isolated.sh` exports both:

- `MEDIAGO_AGENT_BIN_DIR=<repo>/bin/agents` — `AgentBackendService` looks for
  `<binDir>/<id>/agent.json`; without it the backend falls back to the `codex-acp`
  command on `PATH` and the probe fails with `executable file not found in %PATH%`.
- `CODEX_HOME=<repo>/.cache/codex-home` — Codex state lives here instead of
  `%USERPROFILE%\.codex`.

`CODEX_HOME` is required on machines that also run the newer Codex desktop app: that
app owns `%USERPROFILE%\.codex` with a newer sqlite state schema and locked
`tmp/arg0` directories, so the pinned codex 0.144 exits with
`failed to initialize sqlite state runtime`. An isolated home keeps the two installs
from fighting and never touches the user's global Codex data.

## Login

The Codex backend needs a ChatGPT login even though the runtime starts fine:

1. Start the dev stack and open 设置 → 模型接入 → Codex 接入.
2. Trigger the browser login. The callback is served by the server process on
   `http://localhost:1455/auth/callback`, so keep that server running while an
   attempt is pending (`codexAccountLoginTimeout` = 10 minutes).
3. `GET /api/v1/settings/codex-account` then returns
   `{"status":"loggedIn","email":...}` instead of `notLoggedIn`.

A Codex relay profile (`设置 → 模型接入`, `responses` protocol) is the alternative to a
ChatGPT subscription; it writes an isolated home plus a local bearer token under
`<workspace>/.mediago-drama/runtime/agents/codex/home`.

## Symptom → cause

| Symptom | Cause |
|---|---|
| `503` on `/agent/runtime-config`, `acp config probe failed ... codex-acp: executable file not found` | `MEDIAGO_AGENT_BIN_DIR` unset and no global `codex-acp` |
| `503` on `/settings/codex-account`, `bundled Codex account service is unavailable` | `agent.json` missing or has no `codexBin`; `SetCodexCLIPath` is never called |
| probe fails at `stage=session_new` with `Authentication required` | Runtime is healthy; Codex is not logged in |
| codex exits with `failed to initialize sqlite state runtime` | Process inherited the desktop app's `%USERPROFILE%\.codex`; set `CODEX_HOME` |
