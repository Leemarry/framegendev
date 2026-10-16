# TASK-150 local production combination acceptance

## Goal

TASK-150 / REQ-013,016,018,019: verify one local production combination in the
integrated main build using a dedicated project. This is acceptance of existing
capabilities; no provider generation, Agent send or new automation feature.

## Requirements

- Author screenplay/storyboard through the current document UI and preserve
  content, versions and history through navigation/reopen/backend restart.
- Import genuine local media, adopt to the correct storyboard section, inspect
  history/resources, then use the existing timeline/NLE and export real files.
- Exercise save failure/retry, export cancel/conflict preservation and read-only
  reopening. Compare complete records and actual copied-media hashes.
- Use own .cache/parity/task-150-combination outputs. Existing synthetic NLE
  test media may be copied read-only as fixtures, never claimed as generated.
- Record gaps and failed probes. Native Jianying remains unrun without client;
  external generation/Agent and excluded042/170-178 remain out of this item.

## Acceptance Criteria

- [x] Main real document -> local media -> adoption/history -> NLE/export flow.
- [x] Failed save recovery, export cancel/conflict and actual media/playback.
- [x] Page/backend reopen preserves complete project records and media/export hashes.
- [x] Appropriate checks and explicit committed result/ledger integration.

## Plan

Acceptance-only lightweight item: inspect existing UI/contracts and prior NLE
results; create a dedicated main project; author documents through UI; import
copied local video/audio fixtures; adopt section video; enter timeline/NLE, edit
and save with blocked-write retry, preview and export; cancel/conflict checks;
snapshot full records/files; page/backend reopen and compare. Any discovered
product defect requires a scoped design/implementation update before edits.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
