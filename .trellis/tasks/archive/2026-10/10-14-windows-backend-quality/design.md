# GAP-003 Design

Superpowers bounded repair of existing test flows, using the user's explicit authorization; project inline/no-commit rules govern execution. No product feature/API/schema changes are planned.

## Root causes and approach

Repository OpenGormSQLite caches Gorm handles by filename. Most tests never close their SQL pools; Windows therefore rejects TempDir cleanup. Add `internal/testutil.CloseDB(t testing.TB, db *gorm.DB)` to register a cleanup on the actual handle. Mechanically apply it to test DB opens; update test store/HTTP helpers to capture their cached handles and close only after workers flush/stop. Leave production caching and ownership unchanged; every temp path is unique.

Settings and episode preview tests execute POSIX text scripts as if they were Windows binaries. Use native helper subprocesses: test executables detect an explicit fixture marker in TestMain, implement deterministic CLI outputs, argument logs and cancellation behavior, then exit without executing tests. Fixtures are test-owned copies and cannot invoke external CLIs. Existing Unix-only permission/symlink tests remain unchanged; no new skips.

HOME tests must set USERPROFILE on Windows. Windows NO_PROXY/no_proxy cannot hold independent values in os.Environ; adapt the OS-specific expectation to the actual inherited key. Test appendEnvListValues independently so the original list behavior remains covered. Do not alter ACP runtime behavior during this task.

## Toolchain and gates

Portable x86_64 MinGW GCC under `.cache/parity/gap-003/toolchain`; official release source/digest recorded, mirror bytes must match official SHA256 before extraction/use. No global installation or persistent environment changes. A local PowerShell runner supplies process PATH/CC/CGO_ENABLED=1 and optional process-only Go mirror, with bounded Go build parallelism to avoid link resource exhaustion. Existing frontend dist is synced using the repository script before embedded build.

## Boundaries and rollback

Expected changes: testutil plus repository/service/app test files with missing cleanup; settings/app CLI fixtures; host environment assertions; local tooling runbook and task records. Mechanical edits use AST traversal rather than guessing from string matches. Additional failures revealed by full race runs are examined before any product edits. Restore only this task's changes if required; do not revert the earlier MCP patch or frontend edits.

After gates pass, continue the existing TASK-002 plan: dedicated sibling MCP probe against both isolated workspaces, shutdown/restart only the verified TASK-001 server executable/config, health and four preserved document snapshots. ACP exit remains TASK-003; no prompt or generation call is needed.
