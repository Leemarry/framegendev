# Local imported image adoption and resource round trip

## Goal

TASK030/150: verify existing real local import -> section result selection -> resource summary -> cancel/reload/restart flow without provider calls; repair only evidenced session1 production-logic gaps.

## Requirements

- Reuse the existing local-import, selected-resource and resolved episode APIs.
  A dedicated fixture must retain actual imported media and its truthful internal
  provider; never fabricate provider output or run external generation.
- Actual section generation -> select result -> close -> resource summary ->
  reopen must reflect the same adopted media and section/document identities.
- Blocked selection must retain failure and avoid persisting adoption. Recover
  through normal UI, save actual selection, then verify reload/backend restart.
- Preserve the full document body/version/history except explicit intended adoption
  mutations. Keep original baselines; record expected changes separately.
- Scope is acceptance first. Repair only evidenced documents/generation/episode
  defects; stop and plan any new backend/shared contract before changes.
- Actual successful local import selection persisted sourceType=generated. Reuse
  the existing imported sourceType contract and identify the actual history entry
  in MediaGenerationWorkspace's shared selection writer. Add focused regression;
  keep provider-generated and edited provenance unchanged. Resource panel remains
  a text summary; static-image timeline behavior belongs to excluded TASK178.
- Actual failed deselection exposed legacy document-sync racing rollback. Explicit
  selection overrides must prevent that sync. Keys derived from persisted selected
  resource records must not trigger writes on reopen; explicit legacy document
  keys retain their existing synchronization behavior.

## Acceptance Criteria

- [x] Source/main actual successful adoption and failed-write recovery pass.
- [x] Resource summary, editor and reopened result agree after restart.
- [x] Complete records/media hashes and existing protected baselines checked.
- [x] Applicable tests/checks run, failures/remaining external/native gaps recorded.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
