# TASK-002 Implementation Plan

> Use Superpowers executing-plans inline; current user/project constraints exclude commits, worktree migration and subagents.

**Goal:** Resolve native Windows MCP binaries and verify real stdio availability.

**Architecture:** Keep mcpExecutable(binaryName string) (string, error), delegate platform filename handling and existing candidate search to resolveMCPExecutable(binaryName, goos string).

**Tech Stack:** Go 1.25, existing ACP/MCP SDKs, native filesystem.

**Spec:** [design.md](design.md), [prd.md](prd.md).

## Execution

- [x] Load ledger/source/specs; identify document and generation callers and native binaries. User has authorized proceeding to next bounded task; no new approval needed for routine details.
- [x] Add native regression TestMCPExecutableUsesNativeBinaryNames, creating both actual .exe fixtures on Windows; run `go test ./internal/service/acp -run TestMCPExecutableUsesNativeBinaryNames -count=1` to confirm failure. Both binaries failed before the fix.
- [x] Add resolveMCPExecutable and platform normalization; adapt old bare-name fixtures using test-only native filename helper. Add table resolution coverage on Windows/Linux/macOS policies, sibling/ancestor/self, missing/directory and preferred sibling.
- [x] Run ACP regression, task check, task test and go build ./...; record failures/unrun gates. Focused tests/build/vet passed; full gates failed for the reasons in result.md. Execution of checks is complete, their success is not.
- [x] Build into .cache/parity/task-002/bin; create config with fresh .cache/parity/task-002/workspace. Real MCP SDK initialize/list succeeded: 9 document and 2 generation tools. list_comments returned threads=[]; document version/body/updatedAt unchanged.
- [x] GAP-003 resolved all full gates. Restart existing isolated server with rebuilt sibling binaries and its original server.yaml; health, dual-workspace real MCP and all document body/version/hash/updatedAt checks pass. No Agent prompts.
- [x] Result/ledger/spec/handoff updates; no-commit archive and Session8 record complete the task. Initial gate failures remain in result.md as history.

## Resolved Gate

GAP-003 completed separately, all original gates passed, then the isolated runtime was replaced and document snapshots matched. Runtime-config now returns HTTP200 with real options, while ACP cleanup logs exit1; TASK-003 diagnosis remains independent. No prompts or generation were sent here.
