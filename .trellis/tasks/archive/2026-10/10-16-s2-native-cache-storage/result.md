# TASK-100 native cache statistics result

Accepted limited read-only slice, 2026-10-16. TASK-100 as a whole remains incomplete.

## Files and contract

- electron/src/ipc-contract.ts + test: desktop:get-cache-statistics, DesktopCacheStatistics { cacheBytes, profilePath, measuredAt }, runtime validation (nonnegative safe integer, nonempty path, valid time).
- electron/src/main.ts: authorizeDesktopIpc before session.defaultSession.getCacheSize; no input paths or directory traversal.
- electron/src/preload.ts: validate unknown IPC response and reject invalid data.
- src/shared/desktop/types.ts, actions.ts + test: typed capability, explicit unsupported browser/older bridge errors.
- src/domains/settings/components/StoragePanel.tsx + test: native reading, refresh/loading, retained stale reading after failure, retry, browser unsupported state.
- src/domains/settings/lib/settings-navigation.ts and src/pages/Settings.tsx + test: actual storage panel instead of generic placeholder.

All source paths above are under apps/workspace. No shared models/router/dependency/lockfile/backend edits. No cache clearing, workspace scanning, preference mutation or data migrations.

## Actual checks

- 5 files / 62 tests pass: ipc-contract, desktop/actions, StoragePanel, Settings, ProjectNavigatorPanels. Covers zero/invalid cache data, absent bridge, native failure propagation, initial failure without fabricated zero, stale reading/retry, overlapping refresh guard and browser state.
- electron:compile pass. lint 0 warnings/errors. tsc + Vite production build pass; existing >500kB chunk advisory remains.
- oxfmt full workspace snapshot: 694 files pass in .cache/parity/s2-basic-format/apps/workspace. Current changed/untracked source copied into the existing HEAD-based snapshot with LF normalization and its own node_modules junction. Checkout core.autocrlf=true remains; no whole-repo line-ending changes. Bare checkout-wide format remains subject to the previously recorded CRLF baseline issue.
- git diff --check pass. Reviewed UI -> action -> preload -> trusted IPC -> default session data flow. Existing boundary patterns reused; no shared spec edits needed.

## Real isolated workflow

Own development Electron PID45300 closed and verified gone, compiled runtime started as PID42300, then closed/verified gone and restarted with the same isolated profile as PID46708 / CDP9245, desktop MediaGoParityS2Development. Browser.close reports WebSocket closed on normal exit; PID/port checks confirmed exit before each start.

Actual browser-harness coordinate clicks opened storage. Native reading: 29,212,173 bytes (27.9 MiB); profile E:/AI/framegendev-wt/session-2/.cache/parity/s2-desktop-dev/official-profile. Actual refresh advanced measurement time to 00:55:37. Page reload resets the existing nonpersisted selected settings tab; reselecting storage read anew at 00:55:59. Process restart read the same cache at 00:58:20 with a new timestamp; light theme persisted. Statistics are measured again, not persisted snapshots or mocked values.

390x680 dark and light: document width 390, no alerts, wrapped profile path, visible refresh and pending workspace block. Light selection initially clicked the sr-only radio's tiny bounds without changing theme; clicking its visible label verified app.theme.v1=light and root light class. Replaced the mislabeled candidate capture with the confirmed light capture. Browser CDP9241 actual storage entry shows unsupported status and disabled refresh, no byte reading.

Renderer-content screenshots (not complete native-window captures), all under .cache/parity/s2-settings/: storage-native-dark.png, storage-native-390-dark.png, storage-native-390-light.png, storage-native-restarted.png, storage-browser-390.png. Inspected the dark desktop and narrow capture pixels. Official storage scope source: BASELINE-REVIEW storage84 and prior isolated official session; no new official storage behavior is claimed here.

## Failures, limits and next dependencies

Initial Settings test mock omitted the new action; fixed the fixture. Next run found the generic pending-marker assertion incompatible with a task number inside the brackets; standardized the visible pending marker and final 62 tests pass. One reload inspection ran before content/selection existed; reselected the actual storage entry and verified the new measurement. Initial Chinese literals through the shell pipe did not match AX names; escaped Unicode in the harness script and verified actual clicks.

Native failure recovery is tested at contract/action/component boundaries; no actual disk/Chromium failure was induced. No cancellation command exists because this read-only operation has no write side effects. No backend changes, so Windows Go check was not applicable. No deletion, cleanup, install, login or external sending performed.

Workspace classification, budgets, safe cleanup and active-file detection still require session1's shared contract/ownership assignment, as recorded in s2-project-storage-contracts/result.md. Project transfer/open-existing remains blocked on non-destructive services. New project windows require TASK-181 to be provided in this branch before integration. Local Drami animation preview needs session1's assets/rendering dependency decision; external account, Feishu, plugin host and installer capabilities remain pending. These are not marked complete by this cache slice.
