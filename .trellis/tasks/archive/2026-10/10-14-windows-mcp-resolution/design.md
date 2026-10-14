# TASK-002 MCP executable resolution

来源：REQ-005/011/016与TASK-001日志；本轮用户要求继续下一任务。已有授权允许常规修复和任务记录；TASK-010设计评审独立保留。Superpowers bounded设计：修改现有公共解析，不改变协议或引入新配置。

## Root cause and scope

Root Taskfile already builds mediago-document-mcp.exe and mediago-generation-mcp.exe on Windows. acp_mcp.go:mcpExecutable probes the bare name for both sibling and ancestor-bin candidates. Existing fake-file tests only create bare names, so they pass without testing the deployed Windows filenames.

Change only acp_mcp.go and its colocated tests, plus task/ledger/spec records. Normalize the binary filename using runtime.GOOS: Windows appends .exe if absent; Linux/macOS keep the caller name. Keep current process lookup, sibling-first ordering, eight cwd ancestors, deduplication and missing/directory errors. A small resolveMCPExecutable(binaryName, goos) internal function permits table tests for both name policies on the host filesystem; mcpExecutable delegates with runtime.GOOS. No PATH/PATHEXT search or legacy Windows extensionless fallback, no API/config changes.

## Acceptance

Document and generation Windows sibling/ancestor/self resolution works using actual .exe names; native fake fixtures use platform filenames. Cross-policy tests verify Linux/macOS bare names, sibling priority, go-run fallback, directories and missing files. HTTP transport remains preferred when the bridge is valid; generation unavailable does not remove document tools.

Build actual binaries into task-specific bin; direct MCP stdio initialize/tools-list and a read-only document tool call must work against a new isolated workspace. Do not send prompts or run generation tools. Rebuild/restart the existing isolated HTTP server only after checks permit it; preserve its configuration/data and compare baseline document hashes/versions. ACP failures remain TASK-003, not proof of MCP resolution failure.

## Validation and rollback

Run focused tests before/after, task check/task test/go build from services/server; record actual platform/toolchain limits. Never fix unrelated failing tests or tidy metadata without necessity. Runtime evidence belongs in .cache/parity/task-002; no production access, login, commits or parallel agents. Rollback only this two-file change and task-specific binaries; preserve all older uncommitted work.
