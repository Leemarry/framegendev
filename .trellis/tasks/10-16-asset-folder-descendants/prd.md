# TASK-030 include descendant folder assets

## Goal

Add the official include-subfolders checkbox using the existing folder tree and scoped media listing, with real nested-folder restart acceptance.

## Requirements

- TASK030: add the actual official include-subfolders checkbox to the page's
  filter popover, initially unchecked. Reuse the current scoped folder tree.
- Checked: include current folder and all descendant folder assets. Unchecked:
  preserve current direct-folder behavior. Siblings and other projects stay out.
- Root includes its known descendant folders when checked. Keep immediate child
  folder navigation, all other asset filters, failure/loading guards and uploads.
- View state resets on scope/open changes; no folder/media/document writes from
  toggling. Saved folder placement, metadata and document/history survive restart.

## Acceptance Criteria

- [ ] Direct/child/grandchild/sibling/root and existing global-scope guard pass.
- [ ] Actual nested folders with real files: toggle/navigation, no-match/clear,
      failure/cancel/retry, refresh/backend restart and full records/hash pass.
- [ ] Source/main relevant frontend gates, build and production UI pass.

## Boundary And Plan

AssetLibraryButton.tsx and existing page tests only. Reuse libraryFolderPath's
cycle-safe ancestor traversal to derive valid visible folder IDs. No backend/API,
dependency or browse-mode/favorite/trash/usage-state changes. First fail nested
page regression; implement; actual source fixture and frontend gates; explicit
commit/main integration; production/restart records; record/archive.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
