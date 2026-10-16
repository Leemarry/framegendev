# TASK-080 project and session history intersection

## Problem

REQ-019 / TASK-080: GET history with projectId and explicit sessionId returns
every project task because the project branch ignores the session. Actual owned
source fixture project-9a2a8e09c8449e36 returns its two local tasks even for
sessionId=nonexistent-s1-usage-session. A session URL must retain its identity.

## Requirements

- An explicit named or legacy session and project form an intersection, applied
  before limit/offset. Foreign-project tasks in the same session are excluded.
- Omitted kind continues to use a named session's actual kind. Wrong explicit
  kind remains400; backend faults remain safe500. Unknown session is empty.
- A supplied project ID that normalizes to empty must never broaden the query;
  retain the existing project filter's empty match rather than omit it.
- Existing project-wide aggregation with no session and existing batch behavior
  stay compatible. Frontend deliberately omits session for project aggregation;
  retain this verified improvement. No new UI or provider operation.
- Reads/rejected filters preserve complete tasks/conversations/documents/history,
  adoption/media identity and bytes. No migration or schema change.

## Acceptance

- [x] SQLite regression first fails, then proves named/legacy intersection,
  project-only aggregation, pagination, invalid kind and complete record equality.
- [x] Both HTTP routes pass combined filters to service; actual owned local
  video histories reproduce before and pass after, with backend restart snapshots.
- [x] Full native Windows check/race and build, integrated focused race/build,
  original production combination and media fixtures pass.

Usage UI acceptance remains blocked independently by Edge9240 policy. This API
item has no new screen; browser switching is not claimed. Real Agent/provider,
native Jianying, TASK010/042/170-178 remain outside this item.
