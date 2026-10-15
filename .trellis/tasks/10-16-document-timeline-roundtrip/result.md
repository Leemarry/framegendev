# TASK-070 Storyboard Document Timeline Roundtrip

2026-10-16. Accepted direct document/timeline entry slice. Whole070 resources,
history reading/source/version swap and whole040/041 native reopening remain open.

## Implementation

WritingWorkspace exposes storyboard-only modes using official documentMode query,
preserving all other query/route state. Body editor remains mounted while hidden;
dirty/conflicted documents stay in body. Timeline hides irrelevant comment/history
actions; body restores them. Separate content toolbar preserves narrow header
space, a layout difference retained for390px usability.

Reuse EpisodeTimelineView, player, strip and NLE without new domain logic. Removed
its implicit document workbenchDraft write: backend resolved read derives from
content without this marker. Explicit overview caller remains unchanged. Match
resolved project/document, hide old/sample controls during loading/revalidation or
error, expose retry, refresh after document timestamp changes and pause on unmount.
Explicit missing document IDs no longer fall back to another loaded document.
No backend/models/dependencies/navigation helper changes or new storage.

## Actual Acceptance

Own task-070 workspace/backend31450/Vite31451/CDP9240. Official own CDP9242 actual
new storyboard doc-1792085688751-sqtaimz1has: clicked Body/Timeline and observed
documentMode=timeline, hidden comments/resources and existing NLE entry. New official
capture supplements screenshot100; neither is proof of real video generation.

Local UI created storyboard doc-1792086051450-5pzefek2fvv in project
project-9d7c9e501f0f7284, typed Shot A/train and Shot B/suitcase. Saved v3 with two
stable section IDs. Actual mode switch showed both shots and correct document,
opened NLE. Changed title to CANCELLED_NLE_TITLE, applied parameters, closed;
Continue Editing retained draft, second close/Discard Changes returned. No save.
Body/timeline repeatedly switched without altering v3/content/workbenchDraft(null).

Actual request blocking of only resolved episode URL then full reload displayed
read failure and no stale controls. Unblocked and clicked Retry recovered. This
is a browser-induced request failure, not a server-generated500. Actual backend
stop/restart and page reload reopened timeline URL; body exact, version3, three
history entries/head6e316fd1af41d854c556c19c88b600af52a96123 retained. No marker write.

Actual offline body edit appended LOCAL_UNSAVED_SHOT; Timeline became disabled.
After network restored, existing queue saved v4 and enabled it. Resolved episode
contained the new marker; repeated final timeline URL reload showed the NLE entry
and retained v4. Editing normally reserialized Markdown; unchanged-switch v3
acceptance is separate from this deliberate v4 edit.

Desktop,390x680 dark/light and390x480 light inspected. Document width390 and
height480; all mode/NLE controls visible. Clip strip scrolls horizontally inside
its viewport; no page overflow. Short screenshot does not prove native NLE mobile
editing. Backend restart stream errors and existing missing codex-acp503 remain
visible; no Agent, generation, real video export, login or external send executed.

## Checks And Limits

- Documents/episode63 files346 tests passed. Added cached-revalidation/missing-ID
  boundary afterward; final focused2 files14 tests passed (combined total347).
  Existing jsdom HTMLMediaElement.pause advisory retained. WritingWorkspace tests
  verify editor identity, unchanged document, route state/query and dirty/conflict.
- lint0, full702-file format and tsc/Vite build pass. Fullformat temporary686
  original CRLF paths restored; no bulk newline commit. Existing chunk advisory.
- Initial hidden-class assertion failed because jsdom lacks Tailwind CSS; explicit
  hidden attribute now supplies correct semantics. Inline-start needed explicit
  allow-empty-context because subagents are disabled. HMR during temporary full
  formatting briefly emptied page/AX; reloaded and repeated actual final check.
- No backend source change, Windows Go gate not applicable; prior full check/race
  acceptance remains recorded separately. Main integration checks follow.
- Resources binding/adoption and real generated playback remain separate work.
  NLE existing browser/file acceptance reused; native Jianying reopening remains
  unverified. No reinterpretation of TASK-010/042/170~178 authorization.

Durable evidence in evidence/: official empty timeline, local desktop/short/light/
dark, NLE entry/cancel, request failure and dirty entry guard. Other temporary
screenshots and exact before JSON in .cache/parity/task-070/.
