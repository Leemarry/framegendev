# TASK-070 storyboard document timeline roundtrip

## Goal

REQ-018/045: restore direct storyboard document to existing timeline/NLE entry, retain body and reviewed route across switching/reload, verify cancellation and read failures without generation.

## Requirements

- TBD

## Acceptance Criteria

- [ ] TBD

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
# TASK-070 Storyboard Document Timeline Roundtrip

REQ-018/045. A storyboard document needs the official direct document/timeline
switch. Existing EpisodeTimelineView and NLE already implement the domain logic;
reuse them rather than a new editor/player. Personal workflow: read/edit shots,
review the same document's timeline and enter NLE without navigating overview.

Accept URL-owned documentMode, same project/document and route state preserved,
non-storyboard fallback, dirty/conflict protection, actual body/version/history
unchanged by switching/reload/backend restart, actual NLE open/close/cancel,
loading/failure/retry and light/dark narrow layouts. No generation or export sent.
Resources/adoption, NLE functionality and native reopening keep their own scope.
