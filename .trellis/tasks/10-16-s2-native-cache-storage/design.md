# TASK-100 cache statistics design

The owned Electron main process exposes a parameterless desktop:get-cache-statistics IPC. After authorizeDesktopIpc, it calls session.defaultSession.getCacheSize and returns cacheBytes, profilePath (session storagePath), and measuredAt (ISO time). This measures Chromium HTTP cache only, not project or entire profile usage. No renderer path input, cleanup or new dependencies.

ipc-contract owns DesktopCacheStatistics and its runtime validator. Preload validates the unknown IPC result before exposing it. shared/desktop/actions rejects unsupported browser/older host capabilities explicitly. The owned StoragePanel uses SWR with focus revalidation and automatic error retry disabled; refresh disables while validating and errors preserve the previous reading with a stale warning. Nothing is persisted or mutated by this feature.

Settings.tsx routes storage directly to the new panel. Remove its generic pending catalogue entry, but retain TASK-100 pending classification/budgets/cleanup within the panel. All edits stay in assigned settings/desktop files. Revert this feature commit to roll back; no data migration is needed.
