# TASK-062 native project windows

## Goal

Open an active existing project in an independent secure Electron window using accepted TASK-181 conflict protection; do not duplicate servers or alter document core.

## Requirements

- Active project card menus offer a native new-window action. Browsers show it disabled with a clear desktop capability label; archived/trashed projects do not offer it.
- Opening does not navigate or change the selected project in the source window, duplicate a backend process, or write project content.
- Each window uses the existing secure renderer configuration and TASK-181 conflict protection. Native dialogs/menus target the originating/focused workspace window.
- Failed window creation remains visible/retryable without leaving a blank window. Closing one window preserves others and their shared backend.

## Acceptance Criteria

- [ ] Trusted parameter-validated IPC opens a fixed project route and rejects unsupported/missing bridges.
- [ ] Actual project-card menu opens a separate native window; source route/state unchanged, reload and close-one-window work.
- [ ] Same-project windows keep TASK-181 conflict/recovery behavior; different-project state remains separate.
- [ ] Relevant frontend/Electron tests, lint/format/build and actual narrow/theme/error checks are recorded.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
