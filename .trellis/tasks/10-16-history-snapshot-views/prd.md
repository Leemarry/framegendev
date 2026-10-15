# TASK-070 historical snapshot reading and source views

## Goal

Read selected historical Markdown as rendered content or exact source without modifying current documents or history.

## Requirements

- TASK-070/REQ-018/045: inspect a selected historical snapshot as complete rendered Markdown or exact source, alongside the existing line diff. Retain current explicit restore confirmation/CAS safety.
- Viewing, switching, canceling, loading failures and retries must not change current body/metadata/version/history, dirty drafts, selections or resources. No save callback or live editor registration from the preview.
- Reuse the document Markdown schema and existing diff payload snapshots. No new backend endpoint, dependency, route or persistent UI store. Official diff-highlighted reading and comparison-version/swap remain separate gaps.

## Acceptance Criteria

- [ ] Real official reading/source controls clicked and captured; bounded differences recorded.
- [ ] Render headings/lists/tables/images using existing document schema, with contenteditable=false; exact source preserves whitespace and literal markup. Selecting another snapshot cannot show stale content from the previous document/version.
- [ ] Existing source diff and restore safety remain covered; loading/failure hides preview and disables mutation. Actual source/main reading/source/diff switches, cancellation, reload and backend restart preserve full body/version/history.
- [ ] Related frontend regressions, lint/full format/build and main embedded build pass. Record unrun or failed checks and remaining070 gaps.

## Notes

- Own DocumentHistoryPanel.tsx/test plus a focused DocumentHistorySnapshot.tsx/test; existing MarkdownHybridEditor parsing exports read-only reuse. Shared app/routing/models/downloads and session2 files remain outside this item. Task cache .cache/parity/task-070-views/.
