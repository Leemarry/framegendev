# TASK-040 M1 框架与选中态

## Goal

Official bins, full-screen workbench, selected clip and inspector

## Requirements

- Current episode title, storyboard/assets/audio/subtitle bins, search, selected clip, actual preview, inspector tabs and episode tracks.
- Real project assets with loading/error/empty states; no sample media.
- Selection shared by bin/timeline/inspector. Closing restores underlying workspace and keyboard focus.
- Responsive three-column desktop arrangement and narrow scrolling layout.
- M1 parameters are read-only; editing is M2, consistent export M3, captions/waveforms TASK-041.

## Acceptance Criteria

- [ ] Focused tests and workspace lint/format/build pass.
- [ ] Browser desktop light/dark and narrow views, bins/search/selection/Escape verified.
- [ ] Opening and closing writes no episode/document data.

## Notes

- References: screenshots 25-29 and REQ-013. Current modal entry reuses mounted episode state.
