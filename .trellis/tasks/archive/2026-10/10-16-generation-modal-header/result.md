# TASK-030/080 Generation Modal Header

## Source

GenerationModalShell alone changes responsive header layout: below640px the
title and its actions stack, the title wraps long words, and close cannot shrink.
Desktop keeps the horizontal arrangement. No state, API or dependency changes.

Actual390CSS and355CSS short-screen screenshots show the complete title;
355CSS wraps to40px with equal client/scroll dimensions, no page overflow.
History opens the actual nested generation drawer and closes back to the section
dialog. Library opens the actual selector and Cancel returns without importing.
Image preview opens; Escape starts PhotoView closing while the parent stays open.
Its removal assertion initially ran before compositor animation finished; browser
foregrounding and the follow-up screenshot confirm removal and retained parent.
Actual close/reopen restores the image. Complete fixture documents/history/tasks
and previous protected import records remain unchanged.

Existing3files27shell/caller tests pass; lint, full708-file canonical format,
build and focused direct format pass. Existing large-chunk warning remains.
One Vite ResizeObserver undelivered-notifications message occurred during
viewport emulation; retain it. A planning patch initially attempted delete/add
on one path and was rejected without edits; corrected in-place update succeeded.
No new test asserting CSS classes was added for this reversible layout change.

Source3e330de -> main3216d97. Main3files27tests, lint, canonical full708-file
format, build, Electron compile and workspace_dist Windows build pass. Main31456
runs mediago-server-modal-header.exe. Actual desktop/390CSS short-screen capture,
complete title dimensions, nested history/library open/cancel, close/reopen and
real imported image pass. Complete new and protected old document/history/task
baselines remain unchanged. No backend source changed; reuse the unchanged
backend Windows gates already recorded. Header adjustment accepted.
