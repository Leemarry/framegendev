# TASK-040 M3 真实预览与剪映导出

## Goal

Native media preview and matching frame-accurate editable Jianying drafts

## Requirements

- REQ-013/036: actual source-in/speed/volume/transform playback and matching Jianying editable ranges, accurate to one 30fps frame.
- Whole timeline scrub/play, missing/error states, explicit local export root/name, cancel and conflict behavior.
- Preserve legacy exports and previews; reject incorrect edited server concatenation.
- No AI proposals, supplier generation or production data.

## Acceptance Criteria

- [ ] Actual browser playback/seek and real file export agree for fractional durations/parameters.
- [ ] Export failures and cancel do not report success or overwrite existing files.
- [ ] All required checks pass; native desktop compatibility limits explicitly recorded.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
