# TASK-070 history diff and safe restore

## Goal

REQ-018/045: compare real history side by side or unified, navigate changes, and restore with concurrent-save protection while retaining history.

## Requirements

- TASK-070 history slice / REQ-018,045: inspect real versions in parallel or unified mode; navigate actual changes; restore creates a new version and preserves earlier history.
- Retain existing Git metadata/source attribution. Reuse document services and theme/UI primitives. No new diff engine/dependency.
- Unsaved/conflicted local text must not be overwritten by history restore. A concurrent remote save during review must return409 and leave current content/history unchanged.
- Scope excludes view/resource-bar round trips (next070 slice), TASK-042 and170~178.

## Acceptance Criteria

- [ ] Actual official isolated history observations inform the implemented controls.
- [ ] Nonempty/empty/failure states, parallel/unified modes and change navigation work at desktop and390px/short viewports in light/dark themes.
- [ ] Actual restore/cancel/repeated restore preserve prior history; complete body/version survive reload and backend restart.
- [ ] Restore rejects stale expectedVersion and local dirty/conflict state; required frontend/backend checks pass.
- [ ] Review, explicit local commit, serial main integration and result records complete.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
