# TASK-030/080 Generation Modal Narrow Header

## Goal

Keep the section generation title and existing history/library/close actions
readable and reachable at narrow widths. Actual355/390CSS-pixel screenshots
show the current horizontal header reducing the title to one clipped character.

## Requirements

Only GenerationModalShell.tsx needs a responsive layout adjustment. Stack title
and title-aside controls below640px; keep the close button beside the title and
allow the title to wrap long words. Keep the desktop arrangement, dialog
behavior, content height constraints and generation/persistence contracts.
No shared primitive, dependency, API, session2, NLE or provider changes.

## Acceptance Criteria

- [ ] Actual355/390CSS-pixel and short-screen dialog shows the complete title
  and reachable library/history/close actions without overflow or overlap.
- [ ] Desktop shell and existing nested preview/Escape behavior remain usable.
- [ ] Existing shell/caller tests, frontend lint/format/build pass.
- [ ] Source/main real cancel/reopen and full document/history/task comparison
  remain unchanged; main embedded build runs the verified adjustment.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
