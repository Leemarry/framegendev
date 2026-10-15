# TASK-181 document conflict protection

## Goal

REQ-018/045: pause conflicting saves, preserve both versions and verify explicit resolution/reopening.

## Requirements

- TASK-181 / REQ-018,045: conflicting windows, Agent updates and external file edits must not silently replace either side.
- Retain a per-window local recovery draft through reload; show the server and local versions, allow explicit merged saving or server reload with a retained recovery copy.
- Reuse document PATCH expectedVersion and history. No production Agent/generation, new version table or new dependency. GAP-004 remains separate.

## Acceptance Criteria

- [x] A 409 pauses autosave; later edits, SSE and background retry cannot overwrite the server.
- [x] Loading failure, cancel and repeated conflicts retain local content and the original save base.
- [x] Explicit merged save uses the displayed server version; another write causes a fresh conflict.
- [x] Two isolated windows, reload/reopen, persisted body/version/history, frontend gates and relevant backend gates are recorded truthfully in result.md.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
