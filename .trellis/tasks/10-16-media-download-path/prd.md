# TASK-030 configured media download path projection

## Goal

Use the configured workspace root when projecting global adopted/history media download paths; never access the default production root.

## Requirements

- TASK-030/080/REQ-012: existing global media history and adoption must expose a downloadPath inside the configured workspace, consistent with the media content API. Keep same-project paths, absolute stored paths and existing local-media identity intact.
- Projection reads must not change files, documents, task versions/timestamps or selections. Do not access the default/production workspace. No external generation or native download-dialog redesign.

## Acceptance Criteria

- [ ] Reproduce against current source with an explicit temporary workspace; test configured global/legacy paths and project/absolute/empty compatibility.
- [ ] HTTP through real app wiring returns correct paths for imported history and adopted media; hash actual isolated file against media content. Restart and compare complete persisted records (only the corrected projection may differ from the old output).
- [ ] Actual browser history/reference rendering and failure/cancel controls retain behavior; frontend gates and related regressions, full Windows backend checks/race/build pass. Record native dialog limitations explicitly; no fake desktop success.

## Notes

- Session1 files: generation_tasks_service.go and its tests, app/wire.go plus a focused app regression, backend database spec. Shared app wiring remains session1-owned. Do not edit session2 files/instances or core download helpers.
