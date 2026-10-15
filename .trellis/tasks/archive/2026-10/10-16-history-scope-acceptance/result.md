# TASK-080 History Read Status

## Scope And Architecture

The task SWR call discarded loading/revalidation/error, leaving the shared
GenerationWorkspace without read-status/retry UI. Expose those existing flags;
the project/global drawer's chat and history-reference entries are hidden while
reads are unavailable. The same bound mutator refreshes the same task key. No
success toast, cache clearing, message rewrite, backend/API/dependency, billing,
navigation or session2 edit. MediaGenerationWorkspace is a separate surface and
has not been changed or accepted here.

## Source Acceptance

- Real local import media-library-1e29a1fe03f6c78b in project-9d7c9e501f0f7284's
  canonical image conversation appeared in project and global drawers. Prompt
  explicitly says LOCAL IMPORT ONLY; provider is media-library and tokens0, with
  actual readable480x640 image. No provider request or fake output was produced.
- Task-read blocking on cold project history displayed failure instead of an empty
  success. Repeated retry while blocked preserved failure; unblock plus refresh
  recovered actual prompt/image. A separate cached-read failure hid prompt/save
  controls. Global session-task blocking/retry/recovery behaved the same.
- Real8-second delayed read disabled refresh and hid cached entries; restoring
  normal network recovered.390px screenshot inspected, page scrollWidth390.
- Global conversation groups contained image6, audio1, video0/text0; other-project
  project-1aaf5417c61eec78 excluded this import, and API image query there/video
  query in the source project returned no tasks. Existing local audio-error fixture
  stays a failure fixture. No additional kind's real generation is claimed.
- Close/reload and actual own backend restart retained complete source documents,
  all document histories, full session/project task records and old immutable
  document snapshot. Both fixture Check scripts passed.
- New status regressions initially failed3/9. Final focused9 and affected
  generation/GlobalToolboxDrawer52files388tests pass; lint/full708-file format/build
  passed with existing chunk/plugin-timing warnings. Production changed only two
  generation files and existing imageSpec tests, plus task/spec records.

## Failures Retained

Task creation first omitted required description and was retried. Initial plan
patch attempted delete/add on the same path and applied nothing; corrected update
applied. Several exploratory reads used absent files or Windows wildcard paths;
replaced with discovered actual paths. Format normalization reloaded Vite and a
history-control lookup failed; cache-bypassing reload recovered without writes.
One broad DOM status/alert inspection selected unrelated Agent503/empty notifier
nodes; scoped dialog inspections/screenshots establish the actual history result.
Original ready-state/font failures from the preceding item remain in its archive.

## Integration

Source bfd9912 -> main b266bc7 cleanly integrated. Main103files711tests,
lint/full708-file format/build, Electron compile and workspace_dist Windows build
passed. Actual main project drawer displayed its existing2local imports and the
new media-library-9e0e7cd0cc8b3028 import. Blocked read hid all cached images/actions;
explicit recovery restored records.390px dark screenshot inspected with body
scrollWidth390. Cancel/reload and own backend restart retained complete project
documents/histories/task records and immutable snapshot; both fixture checks pass.
An attempted narrow-screen reopen missed the hidden navigation control; use the
existing project navigation drawer before reopening, not a product read failure.
Main31456 serves mediago-server-history-ready.exe. Session2 still617a80d.

Read-only billing API inspection found3local imports counted as provider calls
with zero tokens/unpriced media-library row. This requires its own bounded080
repository/statistics follow-up; no statistics change was folded into this item.
TASK-080 overall/local usage,
media-editor history, provider generation, native Jianying and TASK-150 remain
unaccepted. Existing HTTP/1.1 multi-window SSE pressure and GAP-004 are unchanged.
