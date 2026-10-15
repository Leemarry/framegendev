# TASK-060/062 and100 shared service contracts

## Goal

Record minimum shared service requirements before project import/export or storage deletion; no shared-file edits by session2.

## Requirements

- TASK-060/062 need a non-destructive import/open-existing contract from the
  session1-owned document service; do not route into CreateProject.
- TASK-100 needs a service-owned file classification and active-use contract
  before deletion; allow read-only work only after ownership assignment.

## Acceptance Criteria

- [x] Locate actual service ownership and dangerous reuse paths.
- [x] Record minimum interfaces/files and recovery conditions for session1.
- [ ] Session1 assigns shared service implementation and returns contracts.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
