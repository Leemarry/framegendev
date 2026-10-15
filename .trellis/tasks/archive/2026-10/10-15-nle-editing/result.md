# TASK-040 M2 Result

Implemented immutable local draft history (up to 100 undo steps), redo, 30fps timecode and fractional duration/source-in, canvas ratio, position/scale/rotation/opacity, volume/speed controls; existing video asset replacement. Explicit save updates existing episode API/cache. Failed saves retain edits, close asks before discard. Manual episodes carry optional editVersion=1 and are preserved by resolved reads; legacy Markdown rebuild/merge behavior unchanged. Generation reconciliation does not overwrite manual edits.

## Evidence

- Episode domain: 17 files / 93 tests passed, including undo/redo, failed-save retry, discard cancellation, frame timing, source bounds. Workspace lint/format/build passed (existing bundle warning).
- Real browser-harness on isolated 31438/31439: change duration 1.7s, undo/redo, cancel discard, blocked save request displays error and keeps edit, unblock/retry succeeds, close/reopen and full service restart/browser reload preserve complete episode equality. All eight edit parameters verified through API after actual form input.
- Evidence `.cache/parity/s2-nle/browser-m2*.py`, `m2-accepted.json`, `m2-saved.png`, `m2-parameters.png`; restarted server PID45256 is `mediago-server-m2.exe` with dedicated config/workspace.
- Backend explicit `go build ./...` via Windows build gate passed. First full check failed on proxy.golang.org timeout; retained `m2-backend-check.log`. Mirror retry `m2-backend-check-cn.log` exited 0: tidy, format, vet, lint, build, Swagger and full `go test -race ./...` passed.
- Uploaded two synthetic local video fixtures through the actual project upload API. Actual browser replaced both shots using bin controls, saved 4s+5s ranges (second starts at 4s), verified persisted URLs/status and ripple. Evidence `browser-m2-assets.py`, `m2-real-assets.png`. These are explicit test fixtures, not supplier-generated/user media.

## Remaining

M3 must honor all edits in actual preview and local Jianying export before TASK-040 completion. Caption/audio track editing and real waveforms belong to TASK-041. No claim that selected-source preview already reflects every parameter. No external tasks or production data.
