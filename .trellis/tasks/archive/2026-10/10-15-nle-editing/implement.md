# NLE Editing Implementation Plan

**Goal:** edited parameters survive save and reopening with undo/redo and honest failure handling.
**Spec:** `design.md`, REQ-013/036.

- [x] Add additive TS/Go edit contracts and pure editing/range helpers; test frame durations, bounds and ripple.
- [x] Add inspector form and workbench history/save/discard; tests verify failed save retry and canceled close.
- [x] Preserve manually edited episodes on resolved read; validate edited data before persistence, add service regressions.
- [x] Wire real parent save/cache update and protect manual edits from generation reconciliation.
- [x] Run workspace lint/format/build/episode tests, Windows backend check and explicit build.
- [x] Rebuild isolated server; actual browser edit/undo/redo/save/reopen, request failure, cancel and restart persistence.
- [x] Record evidence, archive, journal and explicit commit before M3.
