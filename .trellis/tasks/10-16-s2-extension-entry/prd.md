# TASK-110 existing extension management entries

## Goal

Connect official Agent extensions page to existing skill, prompt pack and instruction management; preserve pending installation/diagnostic integration and audit120/130 gaps.

## Requirements

- TASK-110 bounded entry reuse: Agent extensions page must expose existing
  Codex skills, skill packs and instructions using their actual settings tabs.
- Existing official extension installation/diagnostics and Feishu remain pending.
  Do not implement TASK-010 or claim skills are a generic extension registry.
- Changed files: settings navigation catalogue and PendingSettingsPanel only;
  reuse existing link rendering and store. No new interface or persistence.
- Verify all three clicks reach real pages on desktop and390px; refresh/return
  and unavailable install states remain truthful. Run related51 tests and checks.

## Acceptance Criteria

- [x] Three existing management pages reached through extensions page.
- [x] No commercial/installation/diagnostic success or new external requests.
- [x] Theme,390px behavior and related quality checks pass; evidence committed.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
