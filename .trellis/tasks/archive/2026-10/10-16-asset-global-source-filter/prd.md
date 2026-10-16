# TASK-030 global library source filter

## Goal

Make the displayed global source filter actually apply existing media/selected semantics without changing project isolation or provenance contracts.

## Requirements

- TASK030: apply the already displayed source filter in global page mode as in
  project mode. Use existing media/selected semantics; do not invent provenance.
- Global scope has physical media but no project selected-resource fetch. Choosing
  selected shows the truthful empty result; media/all retain scoped physical media.
- Preserve project behavior, scope requests, other filters, failures and records.

## Acceptance Criteria

- [x] Page regression proves global selected hides physical-only assets and media
      restores them without project adoption requests or metadata writes.
- [x] Actual global source/main filter, failure/retry/clear and page/backend reopen
      preserve full media/document/history/task records and hashes.
- [x] Relevant frontend gates and embedded main build pass.

## Plan

One caller conditional in AssetLibraryButton plus existing page regression.
Fail test first, apply existing sourceFilter unconditionally, source workflow/gates,
explicit commit/main production validation/restart, result/archive. Backend unchanged.
Official provenance grouping remains a separate gap; no selected assets from
other projects are queried to fill global results.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
