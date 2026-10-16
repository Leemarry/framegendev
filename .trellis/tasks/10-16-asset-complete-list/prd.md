# TASK-030 complete material list beyond 200 items

## Goal

Return all currently visible media through the existing list contract so older-than-200 assets remain searchable without changing project visibility.

## Requirements

- REQ-012: return every currently visible media item through existing List and
  assets[] response. Its lack of cursor/total/partial marker makes a hidden cap
  produce false empty search/filter results beyond the newest200.
- Preserve descending update order, project+global visibility, studio global-only
  visibility, metadata backfill and failure semantics. No schema/API/dependency or
  frontend behavior changes. Complete loading/rendering remains O(N); scalable
  pagination and virtualization remain separate limits.
- Owned files: service/media/store.go and store_test.go; repository/media_repo.go
  and media_repo_test.go. Shared frontend callers and routes remain compatible.

## Acceptance Criteria

- [ ] SQLite regression fails meaningfully before the correction, then verifies
  201global+201project+foreign records, oldest-item search, scope and order.
- [ ] Full Windows backend check/race/build and relevant frontend tests/gates pass.
- [ ] Source/main201real imports: oldest search/filter/error/retry/cancel and
  page/backend reopen preserve complete records/hashes and protected prior data.

## Plan

Lightweight bounded backend correction: remove the sole service's fixed200 cap
and unused repository limit argument. Retain its current visibility query;
exact-scope or all-project helpers have different semantics. Add a meaningful
SQLite service regression before changing product code; adapt existing repository
call sites. Run full Windows gates. Actual independent201-file scan through the
library refresh UI proves older items appear and remain searchable, failure hides
cached operations, retry/cancel/reload works and complete records/hashes survive
backend restart. Commit source, integrate clean main, repeat production acceptance,
record and archive. No external calls, production paths or native reopen claims.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
