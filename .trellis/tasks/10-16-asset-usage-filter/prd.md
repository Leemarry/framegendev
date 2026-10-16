# TASK-030 material usage filter

## Goal

Filter real recorded selection, candidate and reference usage within current library scope without modifying production records.

## Requirements

- TASK030 / REQ012: page usage selector exposes all, selected, candidate,
  reference and unused using durable relationships, intersecting current filters.
- Selected means live project selection or selected task output. Candidate means
  unselected retained task output. Reference means project reference entry,
  generation input or parsed document image. A file can match multiple uses;
  unused means none of those recorded relationships. File source is not usage.
- Project view counts current project; global view counts any scope using visible
  global files. Preserve existing global-only/project+global asset visibility.
- Fetch usage only when a non-all usage filter is chosen. Failed/canceled reads
  must not expose cached actions or mark records unused. Filtering never saves.
- Preserve existing response without requested usage, storage/schema, provider
  behavior, file bytes, full document/history/version/task/selection records.

## Acceptance Criteria

- [x] Real SQLite tests cover multi-use, all states, soft-delete, scope isolation,
  document-reader/repository failures and unchanged durable records.
- [x] Frontend regression covers intersection, missing usage, clear/reset and
  failed-read/retry; lint/canonical format/build/Electron and Windows gates pass.
- [ ] Source and integrated production UI actual status selection, failure/retry,
  narrow popup scrolling, reload/backend restart and complete snapshots/hashes.

## Evidence And Limits

Official actual menu screenshot is in asset-folder-descendants evidence and own
.cache/parity/task-030-filter-official/usage-options.png. It confirms choices;
nonempty official classification has not been verified. These are explicit local
relationship semantics, not a claim about hidden official implementation.
No favorites/trash, external generation, native reopen, pagination or automation
TASK042/170-178. Navigation files remain session2-owned.
