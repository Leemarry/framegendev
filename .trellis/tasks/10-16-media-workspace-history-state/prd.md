# MediaGenerationWorkspace history read state

## Goal

Align the independent media generation workspace with existing history loading/error/retry state: hide stale history actions while reads fail, preserve prompt input, and verify real reload/failure/recovery without changing generation contracts.

## Requirements

- Use the existing `useGenerationWorkspace` history read state in the independent
  media workspace. During initial loading/revalidation or after a failed task
  read, hide cached history entries and every history-derived action target.
- Keep the prompt editor, generation controls, reference inputs and unsaved
  local prompt available while history is unavailable.
- Show an explicit loading/error state and use the existing bound `mutateTasks`
  for retry/refresh. Do not add a new API, cache, persistence store or success
  state.

## Acceptance Criteria

- [ ] Focused regression proves cached entries/actions disappear on history
  error, prompt input remains, and the same mutator is used for retry.
- [ ] Existing generation workspace tests, frontend lint/format/build pass.
- [ ] Real isolated source/main failure, cancel/recovery or reload flow confirms
  no stale history action is available and the prompt survives; successful reads
  restore the real history.
- [ ] Architecture review confirms no backend/API/dependency/session2 changes;
  result and remaining limitations are recorded before commit.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
