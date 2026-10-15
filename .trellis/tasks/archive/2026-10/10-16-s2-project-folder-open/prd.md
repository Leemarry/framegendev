# TASK-060 project settings native folder opening

## Goal

Open the project folder itself from ProjectSettings using existing native openPath; retain honest failure/retry and browser disabled state, without document-service or transfer changes.

## Requirements

- Both project-files and general ProjectSettings actions open the project directory itself, rather than selecting it in the parent folder.
- Preserve current loaded-path guards, browser-disabled behavior and failure recovery. Older desktop hosts missing openPath must fail explicitly.
- Do not change project registration/import/export, document state, shared routes or the existing reveal helper used by other features.

## Acceptance Criteria

- [x] ProjectSettings uses the actual loaded project path for native opening; failures show an error and allow retry.
- [x] Browser and missing native capability cannot claim success.
- [x] Isolated real Electron opens the exact nested project folder; verify refresh/restart and theme/narrow layout.
- [x] Relevant tests, lint, format and production build pass with limitations recorded.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
