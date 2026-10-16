# TASK-070 historical-version selector

## Official evidence and contract

Actual isolated official0.1.17 dropdown selection of Version1 updated the historical sidebar, comparison and restore label. ArrowLeftRight is a plain SVG sibling, not a button. Earlier archive references to a missing swap action were an inference; the active ledger will be corrected on integration. No arbitrary two-version comparison is required by this evidence.

The existing shared Select and sidebar now share selectedHash. Current comparison remains fixed to the latest history hash. Git hash/time labels retain exact identity without inventing version numbers from the capped history list. Existing SWR reads, snapshot identity checks, frozen reviewedVersion and restore guards remain authoritative. No backend, dependency, shared primitive or session2 file changed.

## Source acceptance

- Real dropdown selected current f9a500b; sidebar selected current, restore disabled, source exactly matched current body. Sidebar selected old0300cdd; dropdown and exact old source matched.
- At390px the menu stayed within viewport (left10/right203.96). Escape closed only the menu and returned focus to the selector, preserving selection. Desktop and mobile screenshots inspected.
- Real offline Refresh disabled selector/restore and hid cached source. Network recovery plus explicit Refresh restored the old source. Cancel, page reload and actual own backend restart retained complete documents, versions, Git history and historical snapshot. fixture.ps1 Check passed after restart. Reopened history/source retained exact whitespace and old hash, then cancelled.
- Focused7tests and affected47files267tests passed. lint, full707-file format and build passed. No product changes after these checks.

## Failures retained

- Before implementation synchronization/disabled-selector tests failed2/7. After implementation one test expected a whitespace separator absent from the existing accessible sidebar name; corrected the test regex, then7/7 passed.
- Browser inspection accidentally attempted to serialize a DOM node and returned Object reference chain is too long; boolean inspection succeeded. No document write occurred.
- Existing codex-acp503 and cold cross-project documentId navigation gap remain separate. No Agent/generation request sent.

## Integration

Source f2afc4a cleanly cherry-picked as main49f9a35. Main50files310tests, lint, full707-file format, build, Electron compile and workspace_dist Go build passed. Actual main dropdown current/old switching synchronized sidebar and exact source; current restore disabled, historical image loaded480x640. Cancel/page reload and actual own backend restart retained complete documents/version/history/old snapshot. Mobile dark screenshot inspected. Main31456 now serves mediago-server-history-selector.exe with the existing independent integration config/workspace.

The first redirected main test invocation did not run because its own cache directory was missing; PowerShell returned0 despite the redirection error. Created the cache directory and reran the actual tests, retaining this failure. No backend source changed; full Windows backend quality gates were last passed for the preceding configured-path change, and the current embedded binary build passed.

Only this bounded selector item is accepted. TASK-070 overall still requires highlighted-diff reading and resource/reference review; no native desktop or provider-generation success is claimed. Session2 branch remains617a80d without new submitted results.
