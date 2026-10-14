# TASK-003 Implementation Plan

> Execute Superpowers executing-plans inline; no subagents, commits or worktree migration under project/user constraints.

**Goal:** Distinguish successful ACP inspection teardown from failures and remove duplicate/early termination races.

**Architecture:** Keep the public InspectSessionConfig contract; synchronous inspector defer, scoped diagnostic attributes, EOF grace before force, and a Windows private Job Object closer passed to common cleanup. Non-Windows process launching stays unchanged.

**Tech Stack:** Go, os/exec, existing ACP SDK and slog.

**Spec:** [design.md](design.md), [prd.md](prd.md).

- [x] Read lifecycle callers, dedicated JSON logs, task/specs and isolated runtime identity; preserve four-document baseline.
- [x] Add native fixtures in acp_runner_process_test.go and dispatch before ACP TestMain DB setup. Old code reproduces Access denied for EOF/already-exited children and returns before inspection cleanup; focused-before.log exits1. First invocation only failed to create the root log directory and did not run tests; corrected invocation supplies this failure evidence.
- [x] Implement stdin EOF grace and sole Wait in acp_runner_process.go; inspector synchronous cleanup and stage/purpose/reason logs in acp_runner.go; resident caller adds resident_closed reason. Initial 500ms focused race regression passed, but real descendant verification exposed insufficient grace. Official npm integrity/source confirms adapter's 2s fallback; delayed-EOF fixture fails before increasing product grace to 3s. Child GORACE removes only the artificial exit sleep, retaining race instrumentation.
- [x] Run focused ACP tests including resident lifecycle, then full check/test/race/build through scripts/check-windows.ps1; all final gates exit0 in gates-accepted.json and *-job.log.
- [x] Real 3s-only runtime still failed descendant observation. Add suspended Windows job assignment/resume and close-on-cleanup, using existing x/sys; EOF/force/cancellation descendant regression and all focused race checks pass (job-focused.log).
- [x] Preserve earlier bin/bin-final; build Job revision under .cache/parity/task-003/bin-accepted. Verify PID/path/config before replacing only isolated31430, now PID75752. Final 3 probes200, forced exit1 retained, no WARN/ERROR or descendants, HTTP health and all four document snapshots unchanged.
- [x] Update result/spec/ledger/handoff; Session9 recorded and task archived with --no-commit. All existing changes/data retained; no staging, commit, push or next-task activation.
