# TASK-070 storyboard resource panel reopen

## Requirements

REQ-018/045: restore the storyboard document resource-panel entry and real parsed-group content. Actual official0.1.17 has an open/close resource icon only for storyboard documents; opening closes comments and shows parsed H2 groups or the no-group empty state. Existing StoryboardTimelinePanel has no production caller. Reuse it and the resolved-episode API.

- The resource toggle must preserve the document, selected identity, other query parameters and route state; close/reopen and page reload must work without document writes.
- Loading/revalidation/error/wrong project or document must not display cached foreign/stale groups. Explicit retry must recover. Dirty/conflicted documents must not present a saved-server snapshot as the current draft.
- Desktop panel and narrow layout must remain readable; closing returns to the same editor with no loss of transient selection/draft. No provider/Agent sending, new persistence or backend implementation.

## Acceptance

- [x] Official open/close/empty/nonempty behavior captured or uncovered limits recorded.
- [x] Actual source and main resource open/close/reload/restart preserve complete documents/version/history and existing episode records; current group content is derived from the real API.
- [x] Failure/retry, identity, dirty state and relevant navigation regression tests; frontend gates and integrated embedded build pass.

TASK-070 overall and reference authoring remain separate; this item only reconnects the existing read-only group summary safely.
