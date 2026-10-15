# TASK-030 direct media adoption source isolation

## Changes

GenerationTaskService now checks direct and task-derived media before changing source history, replacing resource selections or deleting selected rows. The existing media repository supplies the source using the same DB; missing/foreign assets map to404, database errors still500. Same-project/global media, missing-task direct fallback and voice previews remain supported. No schema, API shape, dependency or provider change.

Actual roundtrip also exposed inconsistent omitted-title enrichment: select filled the filename but deselect did not, so the identity hash differed. Both branches now use the same existing enrichment; the regression uses the wired media service.

## Source Verification

- Before the guard, 8 SQLite cases failed: foreign ID/URL/task select or deselect returned200; missing select500 from a foreign key constraint and missing deselect200. After the guard, full source-task and both project-selection records remain unchanged.
- Before shared enrichment, all four same/global × ID/URL roundtrip cases failed to delete. Afterward focused selection/voice/manual-fallback tests pass.
- Actual isolated source31450: six foreign/missing ID/URL select/deselect requests404 with both complete document sets, task collections and selection lists unchanged. Same-project direct adoption persisted exactly across a real backend stop/restart, then unadopt restored the original lists. Final code repeated this full sequence.
- Actual UI click refresh/detail shows one document plus one adopted reference; refresh after unadopt shows only the original document reference. Both screenshots inspected; actual480×640 image loaded. Evidence in `evidence/direct-adopted.png` and `direct-unadopted.png`.
- Actual global PNG upload into the isolated root, then URL adopt/unadopt in both projects passed with complete original media and selection records unchanged. The new global fixture remains imported and unadopted.
- Frontend lint, full705-fileformat (temporary LF normalization/restored), build and4files44 related tests passed. First related command used3 nonexistent paths and ran only1file17tests; corrected actual paths separately ran3files27tests. No frontend source change.
- Standalone `go build ./...` passed. First complete Windows check/race passed (generation82.944s); final complete check after the cancellation fix also passed: tidy, fmt, vet, lint, three builds, Swagger and all-package race. Both logs retained in the task cache. Temporary LF normalization restored original bytes.
- Main expanded check ran all235files1552tests:4 failures/1548 passes. AgentChat had two5000ms import timeouts and a consequent duplicate-DOM failure under default concurrency; targeted2-worker rerun passed all8 without changes. PromptPackEditor repeatedly expected obsolete aria-hidden while the existing sidebar uses inert. Source b8fc186/main a7e5827 updates that assertion to the current contract, adds inactive-layer inert/one-active-layer assertions and retains slide-class assertions. Focused2files52tests, lint and full format passed; no sidebar product implementation changed. Main full suite rerun uses2workers without changing test selection, timeouts or assertions.

## Retained Failures And Limits

- Initial acceptance script used `/workspace` instead of the actual `/workspace/documents` route and returned404 before any mutation; corrected and reran.
- Initial targeted-worker command passed maxWorkers to pnpm rather than Vitest, failed before tests; corrected to pnpm exec vitest. A diff check with core.autocrlf=false interpreted unchanged CRLF lines as trailing whitespace; normal git show --check on the committed test fix passed. No bulk line-ending commit.
- First global roundtrip returned200/deleted:false. The first fixed retry removed that retained row, so comparison against the previously selected baseline failed. The next full run from the unadopted baseline passed; the failure is not represented as zero-write.
- During temporary LF checks the dev tab briefly had an empty body; after the checks and backend restart, real reload rendered the page without Runtime exceptions. No transport redesign.
- Global selected-record downloadPath currently projects the default root rather than the configured isolated workspace. Only the response string was inspected; no default/production path accessed. Record for a separate necessary item. Same-project paths and actual content URLs worked.
- No provider generation, Agent prompt, login/payment, native Jianying reopen or session2 native-window acceptance performed. Overall030/080/150 remain incomplete.

## Main Integration

Pending clean main integration and production acceptance before archive.
