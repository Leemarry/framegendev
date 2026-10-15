# TASK-041 Result

Implemented caption insertion/text/start/end/delete, audio insertion into
voice/music with start/duration/source-in/speed/volume, immutable undo/redo and
manual save recovery. Native browser audio synchronizes with timeline playback
and captions. Waveforms fetch actual bytes and decode multichannel PCM; failures
are visible, with a64MB decode limit. Existing planned clips remain explicitly
pending generation. The underlying player unmounts while NLE is open.

Reused manual episode persistence, existing media API, clip validation/history,
native browser media/WebAudio and the existing jianyingdraft library. Optional
audioUrl preserves legacy data. Native exports validate actual local audio,
project ownership, source bounds, Unicode UTF-16 text ranges, independent overlap
audio lanes and copied media. No new dependency or external generation service.

## Visual Acceptance

Official shell/bin/inspector layout from M1 retained. Inspected desktop dark,
light and390px screenshots. Mobile header is stable and inspector reachable by
scroll; live timecode/playhead and waveform visible. Synthetic color bars/WAVs are
test fixtures, not provider generation. Evidence under `.cache/parity/s2-nle/`:
`m41-caption-audio.png`, `m41-final-dark.png`, `m41-final-light.png`,
`m41-restart-desktop.png`, `m41-restart-narrow.png`, `m41-waveform-failure.png`.

## Interaction And Functional Acceptance

Actual browser-harness/Edge CDP9237 inserted/edited/deleted/undid captions/audio,
switched inspectors, retained failed saves, canceled close, retried and reopened.
Two saved captions: .5-2.2 and2.5-4.2s. Voice: .5-3s, source1s, speed1.5,
volume.4; music0-4s, volume.25. Native audio sources reflect these ranges.
Actual silence/signal canvas pixel counts [80,960] prove decoded signal differs.
Blocked audio fetch displays an error; reopening recovers actual waveform.

Reload and backend restart preserve complete episode JSON. Complete documents
API payload is unchanged, including Markdown body/version3/updatedAt/comments.
Paused timeline .9666667s maps to voice1.69595s/music.963966s within one30fps
frame. The new backend binary exported `exports/m41-after-restart` with two real
audio materials, two text materials and copied WAVs. M3 cancel-before-submit and
conflict preservation remain verified; no production data was used.
Evidence: `m41-accepted.json`, `m41-final-accepted.json`,
`m41-restart-accepted.json`, `m41-documents-before-restart.json` and harness scripts
under the same isolated cache directory.

## Automated Verification

Final frontend: lint0 warnings/errors, format, TypeScript/Vite build and21 episode
test files/100 tests pass. Build retains the existing large-chunk advisory.
Windows backend full check (tidy/format/vet/lint/build/full race tests), explicit
build, and draft package tidy/format/vet/full race pass; command logs are
`m41-backend-check.log`, `m41-backend-final.log`, `m41-backend-build.log` and
`m41-package-accepted.log`. Latest final full check is `m41-final-gate.log`.
Review found and fixed default caption insertion after selecting an out-of-range
legacy asset, and unmounted both legacy/manual underlying previews while NLE is
open; regressions included in100 tests. The legacy preview unmount test emits
jsdom's native HTMLMediaElement.pause not-implemented diagnostic; actual Edge
playback was verified separately. No unrelated refactor.

Failed attempts preserved: initial format check found concurrent README changes
and was mechanically corrected; wrong-root gofmt and one targeted Go command
with nonexistent `./pkg/jianyingdraft` failed before corrected package checks.
One browser assertion expected voice to play after its3s end; actual voice stop
was correct, assertion corrected and final workflow passed. M3 H.264 decoding
failure in bundled Chromium remains recorded; actual acceptance used Edge.

## Remaining Acceptance And Handoff

Native Jianying client not found in inspected installation roots. Native desktop
reopening, audio/text rendering and typography remain **待验收**; file parsing and
actual copying are verified, not native compatibility. Restore acceptance by
opening the isolated exported draft in the intended Jianying client and comparing
playback/caption placement/audio against browser reference. TASK-040/041 ledger
stays待验收; implementation child acceptance explicitly excludes that runtime.
Advanced styling/ASR/TTS/MP4 rendering/TASK-042/178 remain outside this item.
GAP-004 and TASK-010 are unchanged.

Dedicated frontend31439/backend31438 uses `.cache/parity/s2-nle/server.yaml` and
`workspace`; accepted binary `mediago-server-accepted.exe`. Dedicated Edge9237;
verify current process identity instead of relying on historical PIDs. Other
session documentation changes are preserved and excluded from the code commit.
