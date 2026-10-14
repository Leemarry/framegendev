# GAP-003 Windows backend quality gates

Source: REQ-005/011, TASK-002 result and user instruction on 2026-10-14: process GAP-003 as one task, then finish TASK-002 acceptance.

## Requirements

- Run the existing server quality gates on native Windows, including race. Retain assertions and do not add skips or disable checks to report success.
- Release test-owned SQLite handles before temporary directories are removed. Stop test background workers before database cleanup.
- Use actual executable fixtures for process tests; preserve login challenge, logout, cancellation and argument assertions.
- Model environment keys and user home according to the host OS; keep Unix-specific expectations where applicable.
- Keep all previous source edits and isolated data. No production workspace access, external login, prompts, generation, Git stage/commit/push or subagents.
- After quality success, rebuild TASK-002 native companions, replace only the existing TASK-001 isolated server using its explicit config, and verify health/MCP and document version/hash consistency.

## Acceptance

`task check`, `task test`, `go test -race ./...` and `go build ./...` pass from services/server with documented local toolchain settings. New test helpers have checks for actual cleanup and native process behavior. Tests use independent directories, no real account or media generation. GAP-003 and TASK-002 records distinguish current results from prior failures; archive only after all criteria pass.
