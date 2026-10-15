# TASK-070 storyboard resource summary

## Official And Source Behavior

Actual official0.1.17 has a storyboard-only resource icon. Opening resources closes comments; closing/reopening works and the empty state asks for H2 groups. Real own official editor text and H2-toolbar clicks rendered a heading, but the resource panel still stayed empty after close/reopen. The document retained a blue dirty indicator; official nonempty parsing/save was not established, and must not be claimed. No provider/Agent request sent.

Existing StoryboardTimelinePanel had zero production callers. Reconnected it through document-domain header action and WritingWorkspace, using resourcePanel=open with other query/state preserved and editor continuously mounted. Existing API/key/UI/section helper reused; no backend, dependency, shared primitive, session2 navigation or store schema changes. Desktop side panel and narrow below-editor split inspected. Chinese track labels replace internal type names.

Actual source project project-dba069d845600801 contains a two-H2-group document and a no-H2 document. Real open/close, group reads, navigation, offline refresh/error, automatic reconnect plus explicit refresh and page reload passed without changes to complete documents/version/history/resolved/raw episodes.390px has page scrollWidth390, separately scrolling editor/panel. Source backend actually restarted and complete API baselines still match. Opening comments and resource exclusivity use the existing comments state.

Actual offline editor typing suppressed saved groups and showed the unsafe-draft status. Correct Ctrl+Z events removed the marker; reload restored a paused TASK-181 conflict, and explicit Backup and reload server cleared it without server writes. Complete baseline checks passed throughout. Local backup retained. No accidental dirty draft was saved.

## Failures And Corrections

- Initial regressions failed8/16; after implementation16/16 passed. Timestamp safety and no-H2 fallback coverage increased focused tests to18/18.
- Initial build rejected nullable projectId. Explicit parent guard fixed it; subsequent builds passed.
- Actual no-H2 document incorrectly showed the API's generic12-second fallback as a group. Preserved failing assertion and added failing regression1/10, then existing H2 detection fixed the panel; backend fallback remains unchanged. Do not treat plain-colon narration/caption/duration as parsed fields: this fixture uses default group timing.
- Network reconnect auto-revalidated before the first planned retry click, so the AX retry target disappeared. In a later separate offline round, actual retry while failed kept the error and hid old groups; reconnect and explicit Refresh recovered. The first script failure remains recorded.
- Immediate close assertion raced route rendering; later separate inspection confirmed URL and panel closed. press_key('Ctrl+z') did not undo; actual Ctrl-modified CDP key events did. No failed check is counted as passed.

## Quality And Remaining Acceptance

Source final47files278tests, lint, full707-file format and build passed. After the final scope-only conditional layout adjustment, focused3files18tests, lint, full format and build passed again. Main integration and real smoke pending. No backend source changed; current backend embedded build will be checked on main. Full Windows gates last passed for configured media paths.

Only the safe resource-summary reconnection is in scope. Official rich resource actions/adoption/reference controls, real generation, native Jianying reopening and TASK-150 remain unaccepted. TASK-070 overall is not complete.
