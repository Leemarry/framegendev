# Quality Guidelines

Inspect `services/server/Taskfile.yml`. Required backend product gates,
run from that module:

```powershell
task check
task test
go build ./...
```

Currently check includes tidy, fmt verification, vet, lint, build and tests.
Tests generate Swagger into `.cache/server-swagger` then run `go test -race ./...`.
Tasks contain POSIX shell commands interpreted by go-task. On Windows use
`./scripts/check-windows.ps1 -Gate check|test|race|build` with a verified native
compiler; see the module README. Review tidy/generated metadata changes.

Development without embedded frontend uses root
`task build:server INCLUDE_WORKSPACE_DIST=0`; it does not replace quality gates.

Use table-driven cases where useful, consumer-boundary mocks and existing
isolated SQLite repository helpers. Cover changed contracts, persistence,
cancellation and external failures. Docs/tooling integration needs its own
checks; do not claim product runtime acceptance.

Windows quality prerequisites: default CGO_ENABLED=0 cannot run -race; enabling
CGO additionally requires a Windows-compatible C compiler. The module's embedded
build needs the existing frontend dist synced with root
`node scripts/sync-workspace-dist.mjs`. Keep these as build prerequisites, not
changes that suppress checks. GAP-003 repairs test SQLite ownership, native
subprocess fixtures and host environment assumptions. Focused success cannot
replace the required full gates.

## Windows Test Resource Contract (GAP-003)

### Scope / Trigger

All isolated SQLite tests and tests that launch CLI fixtures on Windows. Product
database caching, schema ownership and protocol behavior stay unchanged.

### Signatures

`testutil.CloseDB(t testing.TB, db *gorm.DB)` registers SQL pool cleanup and accepts
a nil handle. `WriteExecutable(t testing.TB, path string, fixture ExecutableFixture)
string` returns a native fixture path; the package TestMain must first call
`RunExecutableFixture()`. `check-windows.ps1 -Gate check|test|race|build` accepts
optional CompilerPath/GoProxy/GoSumDB parameters.

### Contracts

Capture the actual cached database opened by each fixture, including path-taking
repository/service constructors and lazily opened settings DBs. Register pool
cleanup before worker/store cleanup (LIFO: stop workers, flush logs, close pools,
remove TempDir). TestMain closes its global pool before checking RemoveAll errors.
Use existing local test constructors in app, generation and media; raw opens
register CloseDB. Unique test paths prevent sharing a production pool.

Fixtures copy the test executable with a sibling `.fixture.json`, append `.exe`
on Windows and implement deterministic argument/output/cancellation behavior.
They never invoke real login providers. Home tests set HOME and USERPROFILE;
Windows environment keys are case-insensitive, so NO_PROXY/no_proxy cannot store
two independent inherited values. Retain direct env-list normalization tests.

### Validation / Error Matrix

| Condition | Expected |
| --- | --- |
| Nil DB | Cleanup helper returns safely |
| DB cleanup or TestMain directory removal fails | Test exits failed |
| Compiler missing | Windows runner fails before running gates |
| Invalid fixture marker/arguments | Native fixture exits nonzero |
| Existing process at stored fixture PID | Replacement login must cancel it first |
| Gate fails | Preserve exit status; restore process environment in finally |

### Good / Base / Bad Cases

Good: a worker finishes before its isolated DB closes and TempDir cleanup passes.
Base: direct DB cleanup leaves pool.Ping returning an error after a child test.
Bad: a FromRepository fixture hides an unclosed path-taking repository constructor.

### Required Tests

`TestCloseDBReleasesPoolAtTestCleanup` verifies the pool is open during ownership
and closed afterward. Existing settings tests assert real subprocess arguments,
OAuth challenge fields, replacement and cancellation. Existing app preview tests
assert native fixture output. Run full check, test, race and build on Windows;
record failed attempts and tidy changes, including x/sys becoming a direct import
for native process liveness checks without a version change.

### Wrong / Correct

Wrong: skip TempDir failures, disable race, use extensionless shell text on Windows,
or close a fresh unrelated DB. Correct: close the actual cached pool after its
workers and use native test executables with the existing business assertions.

## MCP Native Executable Contract

### Scope

TASK-002 fixes document and generation ACP stdio launch resolution in
`internal/service/acp/acp_mcp.go`; HTTP transport and protocol are unchanged.

### Signatures

`mcpExecutable(binaryName string) (string, error)` delegates to
`resolveMCPExecutable(binaryName, runtime.GOOS)`. The internal helper takes an
explicit goos for filename-policy tests, not for cross-platform process execution.

### Contracts

Windows appends `.exe` unless a case-insensitive suffix is already present.
Other platforms retain the caller name. Search the running executable's
directory first, then bin directories of at most eight cwd ancestors. No
PATH/PATHEXT lookup or Windows extensionless fallback. Launch arguments still
carry explicit `--config` and `--project` when supplied.

### Validation And Errors

Process path error propagates; empty process path returns empty path without
error. Candidate directories and missing files are skipped; if no file matches,
return the first candidate error. Generation resolution failure leaves document
tools mounted. A valid authenticated HTTP bridge stays preferred over stdio.

### Cases

Good: Windows sibling mediago-document-mcp.exe is selected before ancestor bin.
Base: go-run process falls back to cwd ancestor bin; Unix keeps bare filenames.
Bad: directory or extensionless Windows artifact cannot satisfy resolution.

### Required Evidence

Use actual platform names in fixtures. Cover both binaries, existing/uppercase
suffix, sibling/ancestor/self, priority, missing/directory and process errors.
Build native binaries in an isolated task directory; verify resolved commands,
actual MCP initialize/tools-list and a read-only document tool. Do not run
generation or Agent prompts as a substitute for path acceptance.

### Wrong And Correct

Wrong: create only bare-name Windows fixtures or rename build outputs to hide a
resolver bug. Correct: normalize the filename once in the shared resolver and
prove real sibling .exe stdio startup. Native Windows runtime verification does
not claim Linux/macOS runtime verification, even when policy table tests pass.
