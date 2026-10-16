# History project/session intersection

Initial actual source/main two-video histories returned2 tasks instead of1 on
both combined query routes, and mismatched image returned200 instead of400.
SQLite regression first failed with extra sibling/legacy tasks, wrong page/offset,
unknown/other-project leakage and nil kind validation. Evidence is retained in
.cache/parity/task-080-project-session/before-failed.log and source-before.log.

Implementation keeps project aggregation only when session is absent; explicit
session uses existing resolver and repository ProjectID predicate before paging.
No schema, dependency, generation write or frontend changes. Existing project
aggregation UI intentionally omits session and remains compatible. Both handlers
forward both conditions, preserving safe400/500 mapping and batch behavior.

Initial focused generation/handler race passes8.231s/3.581s; embedded source build
passes. Actual source both routes optional/explicit video, unknown/foreign empty,
wrong-kind400, paging and project-wide2 pass before/after backend stop/start.
Original full two-history/conversation/task/media/document/selection snapshot and
actual video hash are unchanged. Source usage-four-PNG,201records/all201hashes,
global/nested/tag full records also pass.

Review found that cleaning a supplied projectId '..' to empty would drop the new
predicate; actual source combined query still returns1 in that invalid case.
The added SQLite regression also failed with [foreign own-new own-old] instead of
empty, retained in empty-project-before.log. Guard now checks whether a project
was supplied before cleaning its value, preserving an empty-value predicate.
Initial full Windows gate exits0, but is not final evidence for this subsequent
fix. Final focused generation/handler race passes9.082s/6.190s; independent native
Windows build and final embedded binary build exit0. Final actual source HTTP
checks include '..'/'---' on both routes, and pass before/after final binary
stop/start with every protected snapshot/hash unchanged. Final full native Windows
canonical check exits0, including tidy/fmt/vet/lint/build/Swagger/full race
(generation77.238s); independent native build exits0. Temporary canonical bytes
are restored. Main integration/new binary/restart verification is pending.

Source b69d507 is integrated as main d4d1710. Main generation/handler/repository
focused race exits0 (16.057s/4.271s/9.037s); embedded native build exits0. Main
31456 runs mediago-server-project-session.exe with s1-integration/server.yaml.
Actual main both routes combined filters, optional/explicit kind, wrong-kind400,
unknown/foreign/cleaned-empty projects, limit/offset and project aggregate2 pass.
Repeated after actual backend stop/start: same results, full original dual video
history/conversation/task/media/document/selection and actual video hash unchanged.
Usage-four-PNG complete records/hashes,201physical records/all201hashes, original
global/nested/tag and complete local production combination full bodies/versions/
both histories/adoption/episode and uploaded/exported hashes all match. Session2
still617a80d; no edits there. Frontend files/dist were unchanged since usage main
66tests/lint/full708format/build/Electron acceptance, so no repeated UI build claim.

This API correction is accepted; overall080/150 remains incomplete. Browser menu
and usage UI acceptance, native Jianying reopen and external provider/Agent sends
remain unrun. The remaining usage item stays in_progress and unarchived.

Task activation first refused empty context files; inline mode uses documented
--allow-empty-context. Corrected generated base_branch to codex/nle-export before
implementation. No parallel agent or other-session changes. Owned Edge9240 start
is still policy-rejected; this API item adds no screen and makes no new browser
switching/visual acceptance claim. TASK030 usage UI remains in_progress separately.
