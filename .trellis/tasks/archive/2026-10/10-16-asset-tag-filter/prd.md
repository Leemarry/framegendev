# TASK-030 dedicated saved tag filter

## Goal

Add the official dedicated tag filter using existing saved media tags; preserve full-text search and scope isolation.

## Requirements

- TASK030: dedicated saved-tag input in the page filter popover (official shot59).
- Match trimmed case-insensitive substrings of media tags only; filename/note
  matches remain in existing full-text search. Combine all active filters.
- Empty input means all. Local view state resets on scope/open changes; saved
  tags remain persistent. Filter interactions must not write metadata/documents.

## Acceptance Criteria

- [x] Tagged/non-tagged/missing-tag and combined-filter cases pass.
- [x] Actual source/main saved tags, filtering/clear/cancel/failure retry and
      page/backend reopen preserve complete records and file hashes.
- [x] Relevant frontend tests, lint/full canonical format/build/Electron pass.

## Boundary And Plan

AssetLibraryButton page popover, lib/asset-library filter and existing tests.
Reuse mediaAsset.tags and Input; no backend/API/dependency, browse-scope or
usage-status changes. Failing tests -> implementation -> source actual workflow
and frontend gates -> explicit commit/main production integration -> restart
comparisons -> result/archive. Filter preferences need not survive reload.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
