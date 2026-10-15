# TASK-100 native browser cache statistics

## Goal

Read-only real Electron session cache size with refresh/error recovery; workspace classification, deletion and budgets remain pending their shared contracts.

## Requirements

- TASK-100 limited local slice: show the current Electron session HTTP cache size, profile location and measurement time, with a real refresh action.
- Browsers and older desktop bridges must report unsupported capability instead of zero bytes.
- Failed reads remain visible and retryable. Retain a previous reading as explicitly stale when refresh fails.
- Workspace classification, budgets and safe cleanup remain pending the shared storage service contract recorded in s2-project-storage-contracts. No deletion or directory traversal.

## Acceptance Criteria

- [x] Native data comes from Electron getCacheSize, with trusted IPC sender and validated response.
- [x] Loading, refresh, failure/retry and unsupported browser states are tested.
- [x] Real isolated Electron page reload/restart and narrow light/dark layout are checked.
- [x] Relevant tests, lint, format and build pass; record any limitations separately from this slice.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
