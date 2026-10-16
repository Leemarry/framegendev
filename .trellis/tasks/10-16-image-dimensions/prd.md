# TASK-030 local image dimensions

## Goal

Read actual local image dimensions using existing media metadata fields, display in asset details, verify import/backfill/restart without document changes.

## Requirements

- TASK-030: show actual image width/height in asset details using existing fields.
- New local image imports and existing local images missing dimensions are covered.
- Read only local image headers; preserve file bytes/hash, metadata edits, IDs,
  document body/version/history and selection relationships.
- Undecodable/unsupported/missing images must not fabricate dimensions or break
  asset listing/upload. No external fetch, new decoder dependency or migration.

## Acceptance Criteria

- [ ] PNG/JPEG/GIF dimensions persist on import and missing dimensions backfill.
- [ ] Unsupported/corrupt images remain usable with no fake dimensions.
- [ ] Actual source/main import, detail/reopen/restart and unchanged records pass.
- [ ] Frontend and Windows backend quality gates pass; failures remain recorded.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
