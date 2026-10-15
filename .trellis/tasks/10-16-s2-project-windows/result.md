# TASK-062 project windows: implementation, acceptance blocked

2026-10-16. Baseline d62b69f incorporates accepted TASK-181/070 from main33eaff9. The native-window implementation is reviewable, but this task is NOT complete and must not be archived or integrated as accepted until the recovery issue below is resolved by session1. TASK-060/062 import/export/open-existing remain blocked on the earlier service contract request dbf28fa.

## Implementation and contracts

- Projects.tsx and test: shared card/context action for active projects; recheck active existence, loading/error/retry; browser disabled with desktop label; no source selection/navigation mutation. Archived/trash actions do not include new windows.
- Electron ipc-contract/preload plus shared/desktop types/actions/tests: additive openProjectWindow(projectId): Promise<void>, channel desktop:open-project-window. Sender authorization precedes ID validation; fixed /projects route, URLSearchParams encoding, bounded string/no control characters. No renderer-supplied route or URL.
- Electron main: independent secure workspace windows in a Set, one app/server lifecycle; only show after renderer loading, destroy failed window, replace fallback on close. Native pickers use sender window, menu/About use focused workspace, notification clicks restore their originating window. Existing prompt-pack editor remains separate.
- updater.ts/test: broadcast status to live workspace windows; existing single-window dependency shape remains compatible. No real check/download/install was invoked.
- New project-window.ts/test validates the trust boundary. No backend business, document editor/save queue, shared router/model/styles/dependencies/lockfile changes. No new public spec written because those files belong to session1; this document provides the contract for coordination.

## Actual workflow evidence

Only own .cache/parity/s2-settings workspace/profile and MediaGoParityS2Development desktop were used. Backend31452 PID47680, Vite31453, Electron CDP9245 (9241/9243 reserved for own Edge/official). The same backend PID stayed alive while windows opened and the original root window closed.

1. Actual project-card menu opened two independent same-project native windows. Source stayed at /. IDs d00582b4-a71e-4330-8a4e-09a27be7ed27 and 7ab80a60-7942-446d-96d6-8fb79771f599 prove separate recovery session IDs. Different project project-8e719f5b2ddc8eb2 opened separately from project-4b5308dd0a846694.
2. Own disposable document doc-1792084891899-7w59e00ikcn: actual editor changes in two windows caused backend PATCH409 (expected2/current3). A retained local text `S2 window baseline Window A saved` (the words are test text, NOT a claim that A saved); server retained B's `Window B local retry,` plus baseline. Conflict UI paused autosave; closing conflict panel kept local text; page reload kept conflict/recovery state. No silent overwrite was observed.
3. Offline source request showed a network error and created no window. Recovery online allowed retry. With only own Vite stopped, creation briefly produced a hidden loading target, then rejected ERR_CONNECTION_REFUSED and destroyed that target; menu became available. Restarted Vite; actual same-menu retry opened target78001C64F370C15EBF1FB735C6E34737 while source stayed /. A renderer-only failure screenshot retains the final error toast; the earlier loading capture alone is not success evidence.
4. Closed the original native root; remaining windows/backend survived. Actual native Tools -> Software Settings was clicked through the native popup; only focused source21BCCF91CB58417C48D362792836F9AD navigated to /settings, three other target routes stayed unchanged. Native popup capture is separate from the complete window capture.
5. Browser-harness actual 390x844 card menu verified light/dark root classes and width390, readable new-window action. Browser Edge menu AX disabled=true with desktop-only label. These are renderer captures; Electron retains existing minimum native width960.
6. Graceful CDP Browser.close exited own Electron45336 (connection-close exception expected), own backend stayed47680. Restarted same isolated profile as Electron54224; actual card menu opened another project window, source stayed /. Persisted project metadata and server B body loaded; light theme persisted. New recovery ID c467cde2-98fc-4017-b128-f393bd252aa8 differed from prior windows.
7. Bridge-level native picker check (not a claimed page workflow): child invoked existing pickDirectory. Actual dialog3870748 owner6360936 matched the titled child, not root1249056. Native WM_CLOSE cancellation returned null. Temporary title/test result property restored. Project-root recursive path/SHA256 snapshots before and after restart/read/picker cancellation compared equal. No import/export/cleanup/install/login/Agent/generation/external send was performed.

Evidence in evidence/: native-window.png is the earlier complete1600x1136 Electron window; native-tools.png is a complete native source window and native-popup.png its separate menu; other PNGs are renderer screenshots. Raw failed white PrintWindow capture and attempted UIAutomation inspection remain only in .cache; neither is passed evidence.

## Blocking recovery issue for session1

Full Electron restart exposed a remaining TASK-181 boundary. The localStorage key
`mediago-document-recovery-v1:d00582b4-a71e-4330-8a4e-09a27be7ed27:project-4b5308dd0a846694`
still contains A's dirty v2 body and server v5 snapshot. A newly opened window gets a fresh sessionStorage window ID and shows only saved B content, with no old-draft recovery affordance. The original local draft bytes are retained, not deleted. Page reload within the original window had recovered correctly.

Read-only root cause: domains/documents/stores/document-recovery.ts recoveryKey creates a fresh sessionStorage ID; readRecovery only reads that ID's localStorage key. No old-window discovery occurs. This file and document UI are session1-owned, so no cross-owner edit was made. See recovery-after-restart.json/png. Reproduce: conflict A/B -> close own app -> restart same isolated profile -> new project window -> open same document -> inspect old key versus absent recovery banner.

Minimum requested fix/coordination: session1 supplies a safe explicit discovery/recovery path for orphaned window drafts, preserving independent live-window isolation and multiple competing drafts. Do not reuse a single global window ID or auto-save an old draft over server content. Acceptance must repeat full restart with two distinct drafts, deliberate recovery/cancel, missing remote document, and untouched server versions/content. Session2 can rerun the actual native workflow after that committed contract is available. Until then this task remains in_progress, acceptance pending, not archived.

## Checks and failures

- Final 8files/67tests pass: project-window, updater, ipc-security, navigation-security, desktop/actions, Projects, ProjectSettings, StoragePanel. Lint:0 warnings/errors. Electron compile, TypeScript/Vite build pass; existing large chunk advisory remains.
- Full LF-normalized verification snapshot .cache/parity/s2-project-windows-format (HEAD plus pending source,703files) passes pnpm format. No whole-checkout line-ending rewrite.
- Windows accepted-backend dependency check: own LF snapshot .cache/parity/s2-windows-check passed check-windows.ps1 -Gate check with verified MinGW gcc and goproxy.cn. Includes tidy, fmt, vet, lint, three binaries, Swagger, full go test -race ./...; final exit0. Log .cache/parity/s2-settings/windows-check-project-windows-retry.log. No backend product edits.
- Original checkout check first failed fmt due CRLF; first snapshot missed frontend agent-wire-contract fixture and retained CRLF golden snapshots, so race failed. Added exact committed fixture and normalized only snapshot .golden newlines; final full check passed. No test expectations were regenerated or assertions suppressed.
- Earlier harness screenshot helper name was unavailable; used CDP screenshot instead. Background AX became stale until Page.bringToFront. Ctrl+, through CDP did not exercise a native accelerator and inserted a comma into own B fixture; native menu click was later actually verified. UIAutomation inspection produced no report; direct own HWND/menu captures supplied evidence instead.
- Native update installation, macOS behavior, packaged sidecar multiwindow lifecycle, notification delivery/click and native file-picker ownership were not end-to-end exercised. Updater broadcast/security/parameter cases are tested. Native directory-picker ownership/cancel was actually checked as above. Do not treat desktop090, transfer062 or product parity as complete.
