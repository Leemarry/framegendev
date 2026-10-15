# TASK-070 History Diff And Safe Restore

2026-10-16. This independently accepted history slice covers parallel/unified
diffs, change navigation and safe restoration. Whole TASK-070 remains open for
reading/source/document view roundtrips and resource/reference reopening.

## Implementation

- Reuse the existing Git history service, diff API, Sheet and Tabs. Pair changed
  line runs for parallel display, retain line numbers and blank counterparts;
  unified display and cyclic previous/next navigation use the same changed runs.
- Restore compares the selected snapshot explicitly against current history.
  Freeze the reviewed numeric version on opening; block dirty/conflicted drafts
  and check the actual project/document store again after confirmation.
- Optional positive `expectedVersion` query travels through workspace API,
  handler and app adapter into existing atomic document CAS. Invalid values400;
  stale values409. Legacy empty POST remains compatible but unprotected.
- Refreshing/error states disable restore. Restore failures close confirmation
  and expose the panel error;409 requires refreshing the document page and a new
  explicit review. No automatic version advance/retry. Metadata differences are
  disclosed; restoring empty historical tags now clears current tags.
- Responsive version list/diff with fixed footer, explicit close/cancel, retries,
  semantic light/dark diff colors. No new dependency, route or persistence store.

## Actual Acceptance

Own cache/profile only: backend31450, Vite31451, CDP9240; project
`project-9d7c9e501f0f7284`, document `doc-1792082854660-cfu5xc55cl`.
Fresh backend config/workspace live under `.cache/parity/task-070/`.

- Official own isolated CDP9242 history clicked: version list, parallel/unified,
  change navigation and reading/source menu inspected. The menu and comparison
  version/swap controls are not part of this bounded slice; do not claim complete
  official history UI parity. Official application/reference files unchanged.
- Real UI created project/document and typed two different bodies. History
  displayed two distinct changed runs; parallel/unified/previous/next clicked.
- While panel reviewed v3, isolated HTTP writer saved v4. Actual UI restore sent
  expectedVersion3 and returned409, request `req-d20d2b87f0e58925`; v4 body,
  remote-tag and all four history entries stayed unchanged. Initial confirmation
  obscured the panel error; fixed and repeated against v4/v5, returning409
  `req-49cf99dae979c0e6` with confirmation closed and error visible.
- Canceling confirmation left v4/body/history unchanged. Offline refresh showed
  both read errors and disabled restore; reenabling network plus real Refresh
  recovered. Current version stayed frozen while refreshing history. After a
  backend restart the editor can retain a stale numeric version, so recovery
  wording explicitly requires full page refresh, not merely reopening the panel.
- Fresh page reviewed v5, selected `e353430038115d4076cc7843009836ee19d4e42b`,
  actual Restore returned200 `req-c07c5046fac9c9e0` with expectedVersion5.
  Result v6 exactly matched historical body and cleared remote-tag. All six
  entries retained; new head `a91f09260aa87b0b00ab793efd1e3989a7aea4bb`.
- Full page reload and actual backend stop/restart retained v6, complete exact
  historical body and six entries. Browser reopened the history afterward.
- Settled desktop,390x844 light/dark,390x480 short screenshots inspected. Dialog
  clientWidth==scrollWidth390 and clientHeight==scrollHeight480/844. Header and
  footer visible, version list/diff scroll separately. Initial pre-open screenshot
  was not used as history layout evidence.

## Checks And Limits

- Frontend document suite:40 files237 tests pass. Focused alignment/history tests
  cover unequal changed runs, insert/delete, frozen base, dirty-after-confirmation
  and read failure. An initial tsc failure found missing required `message` in
  the new fixture; corrected before successful full lint/format/build.
- Full Windows backend check passes: tidy/gofmt/vet/golangci-lint, all binaries,
  Swagger generation and full `go test -race ./...`; verified MinGW/goproxy.cn.
  Repeated after the empty-tag restore fix. New real Git service regression checks
  stale no-write, current restore/new history, old body retention and empty tags.
- Temporary LF conversion was required by checkoutCRLF/editorconfig mismatch.
  Full690-file format passed;1215 original checkout paths restored to their CRLF
  afterward. No bulk newline changes submitted. Final tiny wording change gets
  focused formatting/tests before commit.
- ACP runtime probe503 remains because codex-acp is absent; no Agent/generation
  was sent. No login, payment, external send, cleanup or real workspace access.
  Native NLE/Jianying reopening is outside this document slice and remains open.
- Feature b7bc362 integrated as c2261df. Main combined document/settings/desktop
  suite69 files406 tests, lint/full700-file format/build/Electron compile and
  Windows full check/race pass. Fresh main embedded build is served on31456;
  actual390px Settings drawer/account/return focus and document history passed.
  Main old document body/version2 retained. No TASK-150 complete claim.
