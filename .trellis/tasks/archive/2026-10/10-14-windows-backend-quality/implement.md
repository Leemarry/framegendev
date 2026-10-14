# GAP-003 Implementation Plan

Use Superpowers writing-plans/executing-plans inline. This task has explicit user authorization; no separate approval, commits, worktrees or agent dispatch.

- [x] Read ledger/spec/source, reproduce native full test failures into `.cache/parity/gap-003/logs/baseline-tests.jsonl`, locate toolchain and resource owners.
- [x] Download portable MinGW, compare official asset SHA256, extract to ignored cache; verify native focused race. Use process-local CC/CGO/PATH only.
- [x] Add testutil.CloseDB and apply to actual test DB opens and path-taking repository/service constructors. Extend test constructors to register background shutdown before DB cleanup; handle lazy settings DB and reopened chat logs.
- [x] Implement native settings CLI and ffmpeg test fixtures, preserve existing argument/challenge/cancellation assertions. Set USERPROFILE alongside HOME in home fixtures; adapt NO_PROXY/no_proxy host expectation and retain direct list normalization coverage.
- [x] Run affected packages; inspect failure JSON for cleanup, platform issues and races. Six affected packages plus generation/media now pass native race; no skips or assertions suppressed.
- [x] Run full existing task check/test, explicit native race and build with logged environment. All exit 0; tidy only promotes existing x/sys to direct, no version/go.sum changes.
- [x] Archive GAP-003 with no commit only after gates pass; reactivate TASK-002 and follow its remaining isolated runtime replacement and read-only acceptance plan. Final runtime acceptance passed and TASK-002 archived.
- [x] Update specs/ledger/handoff/results and record Session8 with `--commit "-" --no-commit`; archive TASK-002 only after final acceptance passes. Session8 recorded; both archives completed without commits.
