# TASK-090 basic settings appearance and workspace

## Goal

Official basic-settings sections with working existing theme persistence and workspace directory open/error recovery; unavailable language, analytics and diagnostics are explicit pending states.

## Requirements

- TASK-090 independent basic-settings slice; whole task stays open.
- Match screenshot80 and isolated official appearance page: appearance/language,
  workspace and usage preferences sections. Preserve real theme persistence.
- Open the actual configured workspace folder, with visible fetch/open failures
  and retry. Browser builds must not pretend to open a native folder.
- Language, anonymous statistics and diagnostics have no matching implementation;
  keep their official positions with disabled controls and explicit pending reasons.

## Acceptance Criteria

- [x] All three modes survive reload; native dark mode survives process restart.
- [x] Actual isolated directory is shown; native open and failure retry work.
- [x] Loading/error/browser-only states are accurate; no silent success.
- [ ] Full390px layout acceptance awaits TASK-020 shell ownership/integration.
- [x] Related tests and frontend lint/format/build checked; actual UI evidence recorded.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
