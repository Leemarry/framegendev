# TASK-060 project folder action result

Accepted limited native-folder action correction, 2026-10-16. TASK-060/062 project transfer/open-existing/new-window remain incomplete.

## Change and contract

Only apps/workspace/src/pages/ProjectSettings.tsx, its test, and shared/desktop/actions.ts + test change. Both existing project-settings folder actions use openNativePath (Electron shell.openPath) with the loaded project path. Previously openProjectDirectory primarily called showItemInFolder, selecting the project in its parent. The reveal helper and other consumers remain untouched. Missing openPath on older desktop bridges now throws an explicit error. No new IPC/API/types/router/dependency/backend changes.

## Verification

- 19 tests / 3 files pass: ProjectSettings, desktop/actions, BasicSettingsPanel. Both project-files and project-general native failure/retry use the actual path; browser disabled; absent bridge rejects; native failure propagates.
- lint 0 warnings/errors; tsc + Vite build pass, existing large-chunk advisory retained. Full LF-normalized cache format snapshot (694 files) passes. No whole-checkout CRLF changes. git diff --check passes.
- Real browser-harness clicks created S2 Folder Open 20261016 through the existing UI, inside only .cache/parity/s2-settings/workspace. Project ID project-4b5308dd0a846694. No existing directory was registered and no Agent message/generation was sent. Existing Agent unavailable status was visible, not exercised.
- Clicked actual project settings -> project files -> open project folder. Own desktop Explorer PID52296/window594094 opened exact nested directory E:/AI/framegendev-wt/session-2/.cache/parity/s2-settings/workspace/projects/project-4b5308dd0a846694. Complete native Explorer PrintWindow capture confirms full breadcrumb and five expected entries: .mediago-drama, library, work, project.media.json, README.md. No toast error.
- Page reload preserved URL project-files selection and project path. Own Electron PID46708 was closed/verified gone and restarted with same isolated profile as PID55564/CDP9245; navigating to the project settings again read persisted project metadata and native folder opening succeeded.
- 390x680 light and dark screenshots: root theme classes verified, document width 390, project path wraps and action visible. Dark theme verified through actual visible AX radio label (app.theme.v1 dark).
- Recursive file hashes for this newly created fixture taken before native opening and compared after open/reload/restart/theme changes: no path/hash differences. Retained baseline .cache/parity/s2-settings/project-folder-before.json. No cleanup/deletion performed.

Evidence in this task's evidence/: project-folder-explorer.png is a full native Explorer window. project-folder-390-light.png and project-folder-390-dark.png are renderer content, not full native application windows. Additional own app native capture stays .cache/parity/s2-settings/project-folder-native.png.

## Failed and unrun checks

First test used general rather than actual project-general tab; corrected fixture, final19 pass. HMR reset a transient create dialog while test code changed; reopened via actual UI and created the fixture once. A read-only request guessed /api/projects and returned404; no write request was made. Earlier DOM theme queries did not click the visible label; final AX-derived visible label and root class verified dark. An optional Shell.Application COM evidence query from the helper did not produce a path report; full native screenshot provides direct breadcrumb evidence instead.

Native filesystem failure was not induced; error/retry covered by tests. Browser disabled state tested in ProjectSettings; existing actual browser unsupported behavior was also verified in the prior cache slice. No backend changes, so Windows Go quality gate not applicable. No new shared spec convention was introduced.

## Remaining work and recovery conditions

Import/export/open-existing must wait for session1 to assign non-destructive project service contracts (s2-project-storage-contracts). New-window depends on the accepted TASK-181 changes being provided in session2's branch; main integration status alone is not a local dependency. Storage workspace classification/cleanup needs active-file and scanner contracts. External browser host, extension installer, Feishu/account services and faithful Drami preview assets/runtime remain unimplemented. No broad task is marked complete by this correction.
