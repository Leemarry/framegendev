# TASK-181 prior-window recovery checkpoint

2026-10-16. Implementation remains pending acceptance, not completed or archived.

## Implemented And Checked

Same-project read-only discovery keeps each window/document draft separate and excludes own-window, backup, malformed, clean and other-project records. Existing parser and per-window keys are reused. DocumentConflictNotice offers preview, individual JSON download and explicit staging as a dirty paused conflict against a fresh server read. Rechecks current project/dirty state after the read. Missing remote documents remain downloadable with a null-server conflict; no server mutation is sent by staging. No API/schema/dependency change.

Four files53tests pass: document-recovery, DocumentConflictNotice, document-save-queue, store. Includes competing sources, cancellation, download/backup without source replacement, pre-existing/concurrent dirty edits, missing remote document, API failure and project switch. Lint0warnings/errors; full704-fileformat; TypeScript/Vite build pass. Existing large-chunk advisory remains. Temporary line-ending normalization restored, no bulk formatting included. Earlier commands accidentally named nonexistent index/documents-store tests and ran only3files; final command explicitly used store.test.ts and ran4files53tests.

## Actual Browser Evidence And Blocker

Own31450/31451 and CDP9240 profile under session-1/.cache/parity/task-181/browser-profile. Fixtureproject-1aaf5417c61eec78, normaldoc-file-bb669c6aaf57c4b9, missing-candidatedoc-file-331bd5963b27be58. Browser tabs A/B produced real typed drafts. An initial CDP offline simulation stopped applying after switching targets, and A saved successfully asv2; this was not data loss. API advanced normal document tov3/body `Stable server recovery baseline v3.\n`, then A retained `Stable server recovery baseline. A_RESTART_UNSAVED A_PAUSED_RECOVERY` againstv2, B retained `Stable server recovery baseline. B_RESTART_UNSAVED` againstv1. After stopping only verified own backendPID48724, B also typed `Missing document server baseline. MISSING_RESTART_UNSAVED` againstv1. Exact source localStorage values captured in .cache/parity/task-181-recovery/source-before-restart.json; screenshota-paused.png does not prove409 pause. No claim of an actual409 is made for this run.

Browser.close completed for own9240 instance. Backend restarted using the same isolated task-070/server.yaml. Automatic approval review rejected reopening Edge with that exact isolated profile and9240, reporting only `blocked by policy`. A combined command with disposable document deletion was rejected before execution; the document was NOT deleted. A separate browser-launch command was also rejected. No alternative launch mechanism was used. Thus full restart/new-ID discovery, source-byte comparison after reopening, UI download/staging/missing-document behavior and390px/light/dark remain UNRUN. The unit checks do not substitute for them.

Recovery condition: permitted reopening of this same test profile, then verify new window identity, three retained drafts from two sources, cancel/selection/download/stage/failure, exact server body/version/history and source values; delete only the disposable missing-candidate document through its isolated API/UI for that branch of acceptance. Keep original snapshot and failed attempts. Session2 native-window8ccef8b is still pending and must independently reverify after this contract is accepted.

Main integration remains atd6799f8; pending recovery source must not be represented as an integrated verified capability. Continue independentTASK-080 local-history work while this environment blocker persists.
