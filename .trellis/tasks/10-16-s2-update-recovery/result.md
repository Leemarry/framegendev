# TASK-090 update failure recovery result

2026-10-16. Accepted only metadata/download failure recovery; TASK-090 and120 remain incomplete. No real update download/install or external release-page navigation was performed.

## Changes

UpdatesPanel.tsx and UpdatesPanel.test.tsx only. Metadata has explicit loading, inline error and retry; the unsupported environment/download-page controls wait for known capability. Both late resolve/reject paths retain the existing effect cancellation guard; subscriptions clean up on retry/unmount. Download bridge rejection is caught, shown via existing toast and releases its loading state in finally. Existing Electron action/API/status/success contracts are reused. No dependencies, public files, backend or desktop host changes. No new convention requires a shared spec edit.

## Checks

- Three files50tests pass: UpdatesPanel9, desktop/actions and Settings. Meaningful new coverage: initial loading versus unsupported, rejected metadata/retry, unsubscribe/late reject after leaving, rejected download and failed-ack retry without success/installation. Downloads and installs in tests are mocks only.
- Lint0 warnings/errors; TypeScript/Vite build pass (existing large-chunk advisory). Full cache-only LF format snapshot with latest two sources passes703files; no checkout-wide formatting. git diff --check passes. Backend not changed, so no additional Go gate required for this slice; previous native-window dependency gate separately passed.
- Actual own Electron54224/CDP9245: clicked Settings -> Updates, read real development app version42.4.1 and actual `非打包运行环境不支持应用内更新` capability. This is Electron development metadata, not official product0.1.17 or proof of a working release channel. Renderer capture native-readonly.png.
- Actual own Edge/CDP9241: at390x680, injected a temporary metadata-only bridge rejecting `S2 simulated metadata bridge failure`. Actual Updates button click produced inline error/retry and no release-page/check/download/install control. Captures simulated-error-390-light/dark.png are explicitly simulated failures, not native transport failures.
- Removed that temporary bridge before clicking Retry. The existing action then read actual browser fallback; error disappeared, browser unsupported reason and release-page command appeared. No link was clicked. Screenshot browser-retry-390-dark.png. Page reload cleared all injected state, theme remained light, actual Updates navigation still showed browser fallback, document width390. No project data/settings write was involved beyond real theme preference selection.
- Light/dark screenshots inspected: wrapped error text, no horizontal excess or overlapping controls. Actual desktop remains available at31453; its backend/workspace stays isolated in this worktree .cache.

## Official evidence and limits

Own official50812/CDP9243 was read-only clicked to Installation Settings and Updates. Installation root/source structure includes Runtime, ComfyUI, HyperFrames, Playwright MCP, audio transcription, mirror fallback, source order and save/reset controls. Updates distinguishes installed app0.1.17/new0.1.18 and runtime0.1.8 prerequisite. See official-installation.png and official-updates.png (renderer content, not full native windows). No values saved, location chosen, update downloaded or installed. Graceful Browser.close exited only own official50812; process and port9243 verified absent.

These official controls require installer/source/config/runtime contracts not present in the current app. The existing generic TASK-120 pending page remains truthful; these captures do not authorize speculative installers or a save form without consumers. Same applies to110 extensions/Feishu,130 Drami assets/runtime and140 commercial services.

An initial task-create command omitted required description and was refused before creation; corrected. Task start required --allow-empty-context because this authorized session runs inline, with no subagents; no shared config changed. Initial browser button lookup failed because390px settings drawer was closed; actual drawer button then updates were clicked. Temporary simulated bridge was removed and reload verified clean. No new auto-review rejection occurred for this task.

## Pending coordination

Native project-window implementation8ccef8b remains NOT accepted: full Electron restart retains A's local dirty draft key but no new-window recovery UI discovers it. Session1-owned document-recovery contract must resolve it; detailed evidence stays in ../10-16-s2-project-windows/result.md. Do not archive that task or integrate it as accepted. Project transfer/storage destructive operations remain awaiting the existing dbf28fa contracts. No user data was deleted.
