# TASK-040 M1 Result

Full-screen Radix workbench in episode domain: entry in existing timeline, four real-data bins/search, shared selection, actual-media preview, inspector and multi-track overview. Escape/close restores focus. No backend changes or NLE save action.

## Verification

- Workbench/timeline tests: 10 passed. Workspace lint 0 warnings/errors, format and build passed, retaining existing >500kB warning.
- browser-harness: isolated 31438/31439 and Chromium 9225; overview → video resources → preview → workbench; actual selection updates inspector, empty assets/subtitles, Escape/close, 390×844 and 1600×1046. Evidence `.cache/parity/s2-nle/m1-desktop.png`, `m1-light.png`, `m1-narrow.png`, browser scripts.
- First fixture assertion failed: opening existing document/overview workflow changed version1→3 and inserted section-id comments. Failure retained, no reset. After upstream preparation, repeated NLE-only open/select/bin/close compares entire document payload and passes. This does not close GAP-004 or verify upstream editor no-write behavior.
- Browser exposed missing focus restoration; explicit Radix close-auto-focus callback/entry ref fixed it and actual focus assertion passes.
- Architecture reviewed: existing SWR assets, episode state and UI libraries reused. Backend gates not rerun for this frontend-only milestone.

## Remaining

TASK-040 remains incomplete: M2 edits/undo/save and M3 consistent preview/export next; TASK-041 captions/audio/waveforms follows. Different official media prevents pixel-identical claims. No production data, Agent task or external generation.
