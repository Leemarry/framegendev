# TASK-070 Historical Full Snapshot Views

## Scope

Added complete selected-snapshot reading and exact Markdown source alongside the existing diff. Existing document schema/mentions/media resolution are reused in a read-only editor with no update/save/registry callback. Source uses escaped preformatted text; no HTML injection or Markdown serialization. Panel validates response identity and hides cached content while refreshing or failed. Restore still targets selectedHash and the frozen reviewedVersion. No backend, route, dependency, model or session2 change.

Official own isolated CDP9242 history reading/source menu actually clicked, captured and inspected. Official reading shows diff highlights; this item intentionally supplies full historical-content inspection as a useful additional capability. Official highlighted reading and comparison-version/swap remain gaps, not accepted by this item. Native official files/reference directories unchanged.

## Source Acceptance

Own31450/31451/9240; project-9d7c9e501f0f7284, doc-s1-history-views. Explicit local fixture created formatted v1 (heading/list/table/global image/trailing spaces), then distinct current v2. Complete project documents/history/snapshot baselines captured after fixture setup. No real generation or Agent prompt sent.

- Actual history reading rendered heading/list/table and the real480x640 image, contenteditable=false. Current document retains a different v2 body.
- Browser source text matched the complete historical snapshot exactly, including trailing spaces/newline. Selecting current version showed its distinct exact source and read-only content; restore disabled for current. Reselecting the old version restored only the preview.
- Offline real Refresh hid cached preview, showed both history/diff errors and disabled restore; actual network restore/Refresh recovered. Cancel, page reload and real backend stop/restart left full project documents, version2, both Git entries and exact old snapshot unchanged.
- Existing unified diff and next-change controls actually clicked after restart; reading/source switch does not alter restore safety. Desktop reading and390x844 source screenshots inspected; dialog390x844 equals its scroll dimensions. Short390x480 reading screenshot inspected: separate list/body scroll, header/footer visible and no dialog overflow.
- Regressions failed before implementation (missing reading/source controls), then3files12tests passed. Full affected document/sync/performance suite47files266tests passed; final2files10tests passed after padding adjustment. Frontend lint, full707-fileformat and build passed. No backend source changed: full Windows check/race from the immediately preceding configured-path integration remains valid for unchanged backend; do not claim it rerun here.

## Retained Failures

- First new source-switch test used Testing Library's normalized text matcher on exact multiline content; failed1/10 while real source was correct. Changed to exact textContent equality, rerun passed.
- First build failed TS18048 because optional equality could compare two undefined values. Explicit response existence guard fixed it; build passed twice afterward.
- Initial direct URL was canonicalized before document loading and did not expose the history control; real sidebar document click and subsequent reload opened the correct document. During temporary LF formatting, Vite briefly had an empty page; original bytes restored and real reload recovered. Full records remained unchanged.
- Some source-search commands used PowerShell wildcard paths unsupported by rg or guessed .ts instead of .tsx, then corrected to actual paths; no product mutation. Existing codex-acp runtime probe503 remains; no request sent to an Agent.

## Main Integration

Source d730d2a integrated as main3b88dab. Main50files309tests (documents/performance plus AppLayout/Settings/ProjectSettings), lint/full707-fileformat/build, Electron compile and embedded Go build passed. Main31456 now runs .cache/parity/s1-integration/mediago-server-history-views.exe with the existing isolated config/workspace.

Actual main doc-s1-main-history-views: locally created formatted v1 and distinct current v2; full-document/history/snapshot baseline captured after setup. Actual reading rendered real480x640 image and rich content read-only, source text matched full historical snapshot exactly. Cancel, page reload and real backend stop/restart preserved all full records. Reopened history afterward; desktop dark reading screenshot inspected. Source light and main dark use existing theme state. Main direct cold navigation also canonicalized away documentId before loading; real sidebar click opens it and subsequent same-document reload preserves it. This separate navigation gap remains recorded, not fixed here.

TASK-070 remains incomplete for official highlighted reading, version comparison/swap and resource/reference reopening. TASK-150 and native Jianying reopening remain unaccepted. Session2 remains617a80d with no new accepted commits.
