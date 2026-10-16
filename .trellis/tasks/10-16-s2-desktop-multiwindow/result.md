# TASK-090 Desktop Follow-up

Status: in progress. The packaged desktop and native picker portions are accepted; native system notification click remains unverified, so this task is not complete.

## Packaged lifecycle acceptance

Built an isolated Windows unpacked package from the current branch with `electron:stage-app` and `electron-builder --dir --win --x64 --publish never`. The package used only `.cache/parity/s2-packaged-runtime` for its profile, APPDATA, LOCALAPPDATA and workspace, and staged the rebuilt `server-takeover.exe` as its only sidecar.

Three real Electron windows shared one backend process (PID 25656). Closing the root and one child left the remaining child and backend alive. Closing the last window stopped both app and sidecar. Restarting the same profile retained the created project and exact workspace path. Project file SHA-256 snapshots before and after final exit matched.

## Native dialogs

The real `pickFile` and `pickDirectory` bridge calls were issued from a child renderer. Win32 inspection found each dialog on the isolated desktop with the child window HWND as owner. Closing each dialog returned `null`; no project or settings files changed. These are bridge/native ownership checks, not import success claims. Evidence: `file-dialog-owner.json`, `directory-dialog-owner.json`, `file-dialog.png`, `directory-cancel.json`.

## Settings and notification

The packaged app exposes the existing shortcut catalog and the official browser settings entry. Browser settings truthfully remains `待开发` / `TASK-090` because no browser runtime or preference consumer exists; no inert setting was added. A native notification returned `shown: true`, but OS-level click delivery was not available to the isolated harness, so no click-to-origin-window success is claimed. Evidence: `packaged-shortcuts.png`, `packaged-browser-pending.png`, `native-notification-attempt.json`.

## Checks and remaining work

The package build, Electron compile, existing desktop tests, and prior frontend lint/format/build passed. This task has no product code changes. Native notification click and any packaged installer-specific behavior remain unverified. Do not archive until notification click is exercised or explicitly recorded as an OS-blocked acceptance gap.
