# Workbench Shell Implementation Plan

**Goal:** TASK-040 M1 official workbench structure and shared selection.
**Architecture:** Domain modal consumes mounted episode and existing assets API.
**Spec:** `design.md`, REQ-013 and screenshots 25-29.

- [x] Create `EpisodeNLEWorkbench.tsx` and colocated CSS: header, bins, preview, inspector and tracks; selection calls `onSelectClip(id)`.
- [x] Wire entry in `EpisodeTimelineView.tsx` with existing assets and SWR error; pause on open.
- [x] Focused tests: bin/timeline selection, search, empty media, close without write.
- [x] Run episode tests and workspace lint/format/build.
- [x] Launch isolated 31438/31439; browser-harness verifies desktop themes, narrow view, actual selection, errors and unchanged data.
- [ ] Record result/handoff, archive child, journal `--no-commit`, review explicit paths and commit before M2.
