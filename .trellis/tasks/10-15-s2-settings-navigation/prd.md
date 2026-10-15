# TASK-020: Session 2 settings navigation

REQ-010/045/046. Baseline: c5a1738, branch codex/parity-s2, worktree
E:/AI/framegendev-wt/session-2. User authorized this worktree creation on
2026-10-15. Main worktree remains untouched. Public ledger/handoff/specs belong
to session 1; this directory is the session 2 execution and result record.

## Scope

Match the official workspace / generation services / generation configuration
groups and entry order (screenshots 80-95). Reuse all existing settings panels.
Missing capabilities must show their actual pending development/integration
state. TASK-010 remains awaiting review. Long navigation must scroll, preserve
selection and return behavior, and work in both themes and narrow windows.

## Acceptance

- All official entries open their matching page or explicit honest pending state.
- Existing API keys, Codex access/skills, instructions and prompt packs remain usable.
- Project settings stay separate. Returning restores the originating screen.
- Theme preference survives reload; no unavailable setting reports success.
- Relevant tests and workspace lint/format/build pass; browser interactions and
  screenshots cover desktop/narrow, dark/light and short viewport scrolling.

## Ownership

Session 2 owns Settings/Projects/ProjectSettings pages, projects/settings/billing
domains, explicitly assigned navigation/user menu and Electron/desktop bridge.
This item changes Settings.tsx, ProjectNavigatorPanels.tsx and tests, plus new
settings-domain navigation/pending panel files. No shared routes, models,
dependencies, lock files, generic components or backend contracts change.
Session 1 owns document saving/editor/material generation/episode/NLE and
shared integration. Project new windows wait for TASK-181.

## Remaining Queue

TASK-090 desktop basics; TASK-060/062 import/export/directory opening;
TASK-100 safe local storage; then independently verify TASK-110/120/130/140.
Each deliverable requires its own plan, validation and local commit.
