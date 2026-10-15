# TASK-181 result

Status: implementation and isolated acceptance passed; integrate this commit in the main directory before archiving.

## Behavior And Contract

- PATCH 409 pauses the queue. Dirty SSE and Agent streaming preserve local body/base; own in-flight save echoes are recognized without a false conflict. Queues and retries are scoped to project/document.
- Conflict sheet shows both bodies and versions, explicit merged save, refresh, JSON download and backup-before-server-reload. A merged write uses the displayed server version and can conflict again. Existing comment IDs are combined; local values win matching IDs. Detailed comment workflow is TASK-050.
- Per-window/project localStorage recovery survives page reload. Missing/deleted remote documents remain visible as paused downloadable drafts; no automatic recreation. Storage errors surface instead of claiming recovery success. Browser profile deletion/storage clearing removes these local recovery copies.
- Legacy frontend workspace operations supply optional expectedVersions for the entire loaded snapshot. The existing service mutex atomically rejects changed/new/deleted remote IDs before any replacement. Legacy clients omitting this optional field retain compatibility; this does not establish universal CAS for external legacy callers.
- General non-conflict legacy operation rollback is unchanged and remains a TASK-050 review boundary. GAP-004 provenance remains unresolved; isolated success does not replace its failed original baseline.

## Actual Workflow

Only session-1 cache data was used. backend31450/frontend31451/CDP9240;
config, logs, browser profile, downloads and workspace are under
`.cache/parity/task-181/`. Fixture project `project-a97c2b23663d1c9b`, document
`doc-1792077838949-nq8fyxt18oc`. No production Agent/generation was sent.

1. Created a project/document through actual UI. Two separate browser windows held independent session IDs. Window B retained LOCAL_WINDOW_B/base2 while window A actually saved REMOTE_WINDOW_A/server3. B showed both versions. Escape and full reload retained B's original body/base and paused saving.
2. Explicit merge saved v4. B then typed OFFLINE_LOCAL while offline; an isolated HTTP concurrent writer saved REMOTE_DURING_OFFLINE/v5. B retained its offline draft.
3. With sheet displaying v5, an isolated HTTP writer advanced server to6. Real click on Save merged returned HTTP409, request `req-0f54f1bc36870109`, expected5/current6. No silent rebase occurred. Reopening showed both copies, and actual typing combined both sides. Explicit save produced v7:
   `Base document for concurrent editing. LOCAL_WINDOW_B OFFLINE_LOCAL REMOTE_DURING_OFFLINE SERVER_ADVANCED_AGAIN MERGED_CONFIRMED`
4. Full page reload and actual stop/restart of this session's backend retained exact v7/body. Git history head was `0bd8353c07bcee828528de3e377577927c315a45`, with all seven prior/update entries retained.
5. Additional offline BACKUP_LOCAL versus server BACKUP_REMOTE/v8: offline refresh displayed a failure while retaining local body/base7. Backup-and-reload stored local JSON in localStorage and adopted server v8 without a new write. A later download fixture retained DOWNLOAD_PENDING/base8 against DOWNLOAD_REMOTE/v9; downloaded JSON was actually read from disk and matched that local draft. Completed CDP download GUID `1d05fc37-643c-4669-8d2a-83f7e7cea8da`, 996 bytes.
6. Light390x844, dark390x844, desktop988x962 and short1280x600 inspected. Initial narrow grid overlap failed; fixed flex shrinking and repeated rectangle checks show ordered non-overlapping fields and scrollable actions. Document scrollWidth equals viewport width. Theme-transition screenshot was rejected and recaptured after settling.

Official application was opened on isolated desktop MediaGoParityS1Task181/CDP9242 using the repository launcher. Its storage UI confirmed cache-only workspace. Actual history/unified-tab clicks informed subsequent TASK-070; no production data or Agent request. These history observations do not claim official conflict UX equivalence.

## Checks

- `pnpm -C apps/workspace exec vitest run src/domains/documents`: 38 files / 232 tests pass, including repeated409, SSE/stream preservation, failed fetch, own echo, deleted-document recovery and cross-project queue regression.
- Workspace lint, full format check and production build pass. Existing >500KB chunk warning remains.
- Windows backend focused CAS regression, full `check`, explicit `test` and `build` gates pass using verified MinGW and goproxy.cn. check/test run real race tests. No race skip or lint suppression.
- Earlier attempts: CRLF checkout formatting failed; normalized only for checks. Initial Go lint dependency fetch failed at proxy.golang.org; rerun with invocation-local goproxy.cn passed. Start-Process launch was automatically rejected; direct executable launches succeeded. One Fetch-interception attempt timed out and is not409 evidence. Initial Edge download was canceled with an invalid slash-form Windows download path; native absolute path download completed. Agent runtime probe503/codex-acp absent is expected in this no-generation fixture and is not accepted Agent execution.

## Evidence

Selected PNGs: `docs/parity-0.1.17/evidence/task-181/`.
Runtime/API logs and intermediate failed captures: `.cache/parity/task-181/`.
Actual partial recording (46 frames; recording started after initial window setup):
`C:/Users/Amireux/.config/browser-harness/agent-workspace/recordings/parity-s1-task181`.

Next: integrate verified181; inspect session-2 committed native-menu slice and its remaining TASK-020 narrow-shell gap; continue TASK-070 as an independent item.
