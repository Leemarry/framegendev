# TASK-030 selected history source project isolation

## Goal

TASK-030/REQ-012,044,045: selecting or unselecting imported/generated history for a project must not mutate another project's source task or selections.

## Requirements

- Reject a task source belonging to another project before any task/selection write, including explicit sourceTaskId and taskId aliases.
- Keep same-project and projectless global task sources usable; preserve existing missing-task direct-media fallback.
- This item covers task-source ownership only. Direct media ownership and overall adoption/reference workflow remain separately reviewable; no new provider, schema, API or dependency.

## Acceptance Criteria

- [ ] Reproduce using a disposable local-import task and two isolated projects; retain the changed pre-fix fixture without restoring it.
- [ ] Table regression covers select/unselect, foreign/global/same-project sources and direct fallback; rejection leaves complete source task and both project selections unchanged.
- [ ] Windows complete quality gates, race/build; actual API failure/success and backend restart; existing frontend adoption controls remain compatible.

## Notes

Source ownership: generation_tasks_service.go, generation_runtime_tasks.go and colocated tests; shared schema/routes unchanged. Main integration and ledger remain session1-only. Do not modify session2 files.
