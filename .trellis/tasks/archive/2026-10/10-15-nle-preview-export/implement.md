# Preview Export Implementation Plan

**Goal:** actual edited playback and matching local editable Jianying draft.
**Spec:** `design.md`, REQ-013/036.

- [x] Add tested native episode player/time mapping and integrate manual episode previews.
- [x] Extend Shot/native JSON with target/source time, speed, volume and transform; preserve legacy tests.
- [x] Bind all edited clip parameters in export service, reject missing media/ranges, expose actual export dialog/results.
- [x] Verify browser seek/play, cancel/conflict/failure and actual artifact content/media copies/JSON reopen; test 1.7/2.5s. Native editor acceptance pending, see result.
- [x] Workspace checks/tests, package check/race and backend complete check/build.
- [x] Record exact acceptance limits; local commit before TASK-041.
