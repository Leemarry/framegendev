# TASK-090 update failure recovery

## Goal and boundary

Make the existing UpdatesPanel recover visibly when reading desktop version/capability or downloading through the bridge rejects. Scope is UpdatesPanel.tsx and its test; reuse existing actions, status subscription, toast, layout and retry button. No IPC/API/dependency/shared-file change, no new update channel or runtime installer. No actual download/install is authorized or needed for this failure-boundary correction.

## Current evidence and design

The mount Promise.all has no catch and initially renders unsupported-environment copy before capability resolves. Download has finally but no catch, so bridge rejection becomes an unhandled promise. Metadata will have explicit loading/error/retry state; no unsupported classification or release-page action until capability is known. Retain effect cancellation guard and unsubscribe. Download rejection surfaces the actual error and always restores the action; existing success/ack behavior remains.

Official own isolated CDP9243 was clicked read-only: updates page has software version/channel and a separate runtime dependency; installation page has root and source tabs. No official download/save/install was clicked. Existing local updater is retained; no official runtime version/capability is invented. Official renderer captures are in .cache/parity/s2-settings/official-updates-readonly.png and official-installation-settings.png.

## Acceptance and execution

- [x] Loading is explicit; metadata rejection has inline error and retry, without false unsupported/download action. Retry reads real bridge metadata and restores known capability.
- [x] Download rejection shows an error and re-enables retry; check/install paths retain existing behavior. Tests use mocks only for download/install.
- [x] Tests cover rejection/retry and subscription cleanup/stale completion. Run relevant tests, lint, format and build.
- [x] Actual isolated desktop read-only metadata, browser fallback, injected metadata failure/retry, refresh, 390px and light/dark checks. Label injected failure as simulated; no successful upgrade claim.
- [x] Record exact files/checks/limitations and prepare explicit-path local commit; only this failure-recovery slice can complete.
