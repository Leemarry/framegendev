# TASK-040 M2 参数与草稿

## Goal

Frame-aligned editing, undo redo, save failure handling and durable reopening

## Requirements

- REQ-013/036: edit frame-aligned video source-in/duration, transforms, volume and speed; undo/redo and assign existing project videos.
- Explicit save, visible dirty/saving/failure state; failed save retains draft; cancel/close asks before discard.
- Saved manual edit is authoritative on reopen; legacy document-derived episodes continue rebuilding from current text.
- M3 owns rendered preview/export equivalence; TASK-041 owns captions/audio tracks.

## Acceptance Criteria

- [ ] Frontend tests cover validation, undo/redo, failed save retry and canceled discard.
- [ ] Backend tests verify edited episode survives resolved reads, legacy tests still pass, invalid edited ranges rejected.
- [ ] Full frontend/backend quality gates; isolated real edit/save/reload/restart, failed save and cancel verified.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
