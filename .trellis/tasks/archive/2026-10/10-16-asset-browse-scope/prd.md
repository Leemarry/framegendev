# TASK-030 directory and all-asset browsing

## Goal

Add directory/all browsing using existing scoped asset and folder data, preserving folder navigation and read-only state.

## Requirements

- TASK030: expose actual official directory/all browse options using existing
  scoped listing. Directory keeps direct/subfolder rules; all lists assets across
  folders and hides folder cards. Keep current folder/breadcrumb as upload target.
- Preserve existing search/tag/type/rating/source filters and scope requests.
- Folder navigation restores directory mode; open/scope change resets view state.
- All mode disables include-subfolders without destroying its current choice.
- No browse interaction writes folders/media/documents. Favorite/trash and usage
  states require separate work and are outside this independent item.

## Acceptance Criteria

- [x] All/direct/subfolder/filter/navigation and unchanged scope API tests pass.
- [x] Source/main actual existing nested fixtures: select all/directory, filtering,
      failure/cancel/retry, reload/backend restart retain complete records/hash.
- [x] Relevant frontend tests/lint/full format/build/Electron/embedded build pass.

## Boundary And Plan

AssetLibraryButton and existing page tests only; reuse scoped data/Select. No API,
model/storage/dependency changes. Fail page regression, implement small local state,
source actual acceptance/gates, explicit commit/main production acceptance, then
record/archive. Reuse previous read-only nested fixtures and protected snapshots.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
