# TASK-030 recorded asset provenance filters

## Goal

Align official source groups through recorded media/adoption provenance, retaining record-type filtering and truthful pending browser capture.

## Requirements

- TASK030 / REQ012: page source groups follow the actual isolated official
  dropdown: all, local import, browser capture, generation, other, unrecorded.
- Classify recorded upload/imported media as local, generation/toolbox as
  generated, preview/unknown nonempty as other, empty as unrecorded. Physical
  source is authoritative; only missing physical source falls back to recorded
  selected-asset imported/uploaded versus generated/edited types. Conflicting
  recorded groups are other. Never infer from filenames or fabricate provenance.
- Browser capture has no backend producer/contract and remains visibly disabled
  pending integration. No new backend/API/data/dependency changes or requests.
- Retain existing media/selected record filter under the clearer resource-record
  label. Provenance intersects folder/scope/search/tags/record filters and resets
  as local view state on open/scope/reload. Dialog keeps existing record controls.

## Acceptance Criteria

- [x] Meaningful mapping/precedence/unknown tests and page interaction regression.
- [x] Source/main actual local/generation/empty, intersections, failure/retry,
  clear/reload/390x480 and backend reopen preserve full records/hashes.
- [x] Relevant frontend gates and main embedded build pass; no external sends.

## Plan

Lightweight single-layer item: add provenance option to the existing pure filter,
one classifier of recorded fields, one page Select and local state/reset. Reuse
AssetLibrarySelect disabled option support for unavailable browser capture.
Regression first; actual existing uploaded fixtures and adopted video verify local
classification without creating generated media. Run focused tests/frontend gates,
commit source, integrate clean main, production checks/restart, record/archive.
Official screenshot is .cache/parity/task-030-filter-official/official-source-options.png.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
