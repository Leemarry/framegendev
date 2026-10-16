# Material Usage Filter

## Session2 continuation, 2026-10-16

The old browser blocker is resolved using Session2's own native Electron desktop,
CDP9245, Vite31453/server31452, cache-only workspace. Fresh project
project-2b6170b9c7c39c5b contains four actual PNGs, two local import tasks, one
adoption and a Markdown reference (fenced example excluded). No provider sends.
Actual clicks passed four statuses with exact asset IDs, tag intersection/clear,
all reset and page reload reset. 390x480 light and390x680 dark selectors remain
usable; screenshots are renderer captures, not full native window captures.

Actual UI caught a production bug: explicit refresh omitted includeUsage and
replaced the usage-enabled SWR cache with ordinary assets, leaving all filtered
cards empty. The existing mock always returned usage and concealed this. It now
models the optional API projection; both project/global tests failed before the
fix and pass afterwards. Refresh now preserves includeUsage. Actual same-filter
blocked usage read shows failure/zero cards, then unblocking/retry restores the
correct unused card. Complete fixture documents/versions/history/media/tasks/
conversations/adoption plus four content hashes remain unchanged after checks.

Checks:3 frontend files66tests pass (46+20), lint0 warnings/errors, TypeScript/Vite
build and Electron compile pass. Full LF verification copy passes711files; initial
test-file formatting failure fixed only in that file. Backend code unchanged;
prior accepted Windows gates remain applicable. No new whole-suite run.

Failures retained: first blocked URL pattern revealed the refresh omission;
subsequent cached empty list was the same bug. A helper used the wrong option
label and stale AX state; retry used current AX. System-theme emulation did not
override saved light preference; final dark screenshot uses the real settings
label and confirms dark class. Initial light captures named dark remain cache
diagnostics, not dark evidence. An API test path supplied to Vitest did not exist;
actual executed files were2/46, followed by AssetLibraryButton20 (total3/66).

Following the user's request to prioritize functionality, no further elaborate
restart matrix is added here. Prior backend restart records remain historical;
this latest frontend fix's integrated production smoke check remains pending.
Keep task unarchived until that check; overall TASK030 remains open for other work.

Implementation uses optional includeUsage=true on both existing media list routes,
an additive usage projection, existing indexed relationships and document image
parser. Default responses, schema, persistence and external generation are unchanged.
Page selects all/selected/candidate/reference/unused, intersects existing filters,
loads usage on demand in a scoped SWR key and retains aggregate failure/retry guards.
Unknown projections do not match unused. Multiple actual uses may overlap.

Regression first failed because usage filter was ignored. Final frontend3files/
66tests pass, including independent project/global reads, intersections, missing
usage, failed refresh/retry and all/reset without metadata writes. Lint,
full708-file canonical format, build and Electron compile pass. Existing chunk and
canonical-helper shell warnings retained. Focused native Go SQLite/app tests pass;
embedded native build passes. Final full Windows canonical check, including full
race, exits0 (session27545, windows-check.log); independent native build exits0.
The helper restored its temporary canonicalized source bytes in finally.

Real source fixture project-9a2a8e09c8449e36 in the original task-070 isolated
workspace has four real local PNGs: one adopted task output, one retained local
candidate, one Markdown reference and one unused file whose only sample link is
inside a fenced block. Each classification matches expected flags. Invalid query
returns400 on both routes; global and another project do not expose the four files.
Actual backend stop/start preserves complete documents/body/version/history/media/
tasks/conversations/adoption and four actual content hashes. Protected original
global/nested/tag,201-record/all201-hash and optional-kind full fixtures also pass.
Cache/scripts: .cache/parity/task-030-usage/; correct source fixture subdir source070.

Failures retained: initial selection fixture used unsupported slotIndex400; resumed
verified four owned uploads and two existing local tasks using assetIndex without
duplicating fixture. API exposed internal media-library input IDs being classified
as reference; verified generation_runtime_import.go uses them for lineage, excluded
that provider and added regression. Initial full Windows run began before this fix
and failed that regression; final gate must be recorded separately. A returned
JSON envelope was reused across test unmarshals, so absent usage retained an old
pointer; resetting the test target fixed the assertion. Fixture initially lacked
project directory, then compared pre-SQL timestamp objects; reused project helper
and read persisted baseline before comparison. None of those test mechanics altered
accepted production data.

Source startup initially selected old task-181 config rather than original task-070.
New isolated project-6998313d53d5b7b0 there passed four-state API and hashes, but old
global snapshot mismatched and201 fixture404. Both failures retained; original
snapshots were not reset. Correct config restores all protected fixtures unchanged.
The separate old task-181 project/files remain intact. Multiple failed atomic doc
patches and wrong-module gofmt path invocations changed nothing; final explicit
paths were formatted. No blanket cleanup or other-session changes.

Actual browser acceptance is BLOCKED: own Edge/profile9240 start was repeatedly
rejected by automatic review with only blocked by policy, including after the
user's renewed restore instruction.9240 remains unbound. A diagnostic harness read
landed on an unrelated local firmware page; no controls/navigation/writes there.
Do not use that browser/profile for parity. Source/main actual menu clicks,
failure/retry UI, screenshots, narrow scrolling and page reopen are NOT passed.
Task remains in_progress, unarchived. No external sends, provider/Agent generation,
production workspace, native Jianying or browser-process reopen claims.

Renewed 2026-10-16 restore attempt with the exact owned profile/port was again
rejected as blocked by policy. User authorization is recorded; actual environment
restoration is still required. Implementation may be integrated with this explicit
pending acceptance, but this task must not be completed or archived.

Source implementation d75fb62 is integrated as main652cfc7. Main frontend3files/
66tests, lint/full708canonical format/build/Electron compile pass. Main media/
repository/app race pass (25.988s/38.432s/31.571s); embedded native build passes.
Main31456 runs mediago-server-usage.exe with s1-integration/server.yaml. Independent
main project-58432b529aa98fb6 has four real PNGs/local import tasks/adoption and
Markdown reference. All four statuses, both invalid-query400 routes, global and
other-project isolation pass. Actual stop/start preserves the original full
documents/body/version/history/media/tasks/conversations/adoption and four hashes.
Original global/nested/tag,201records/all201hashes, optional-kind dual video history
and local production combination complete records/export hashes pass before and
after restart. Source070 fixture is rechecked unchanged. Session2 stays617a80d.
No actual source/main browser acceptance is claimed; menu/screenshot/narrow/page
checks remain unchecked. Next independent080 item: project+session history query
ignores session and returns both local tasks even for a nonexistent session;
read-only reproduction retained in current task context, no records changed.
