# TASK030/150 Local Adoption Round Trip

## Source

Real local image import and section selection exposed three defects: adopted
imports were recorded as generated; failed deselection raced legacy document
sync and lost its rollback; reopening an already adopted image wrote the same
selection again and changed updatedAt. Reuse existing imported provenance,
reserved media-library task IDs, selection overrides, and a caller flag for keys
already read from persisted selected-resource records. No backend/API/dependency
change. Explicit legacy document keys retain their sync path.

Actual isolated fixture project-a5cd155de4ec484a / doc-s1-media-history /
section_s1_media_history uses real image asset-61a3ab3f7f00a1a0. Initial selection
failure saved no record; normal recovery selected it. Missing display-details
initially defeated provenance detection; the actual reserved ID fix succeeds.
Blocked deselection now sends exactly one selected=false request and restores
the checked state. Unblocked deselect/reselect succeeds. Close/resources/reopen,
page reload and actual backend restart retain imported provenance and identities.
Resource panel is a text summary, not an image timeline. No provider request.

Complete original documents/body/version/history/import tasks remain identical.
Post-fix selected records/resolved episode and actual media hash remain identical
after reload/reopen/restart. Original failed selected-post baseline retained;
separate fixed snapshot records the corrected run. Protected history snapshots,
scope history and independent media-editor fixtures all remain unchanged.
Evidence in .cache/parity/task-150-local-adoption (screenshots and JSON).

Regression tests failed first for generated provenance and double writes on
failed deselection. A legacy test fixture initially lacked the required media ID;
corrected fixture retains the old-history no-task behavior. Final73files503tests,
lint, full708-file canonical LF format, build and Electron compile pass. Existing
jsdom pause/large chunk warnings retained. HMR dependency-array-size warning
occurred while editing; full reload used for final acceptance. Expected ACP and
bundled account503 remain. Browser hover/early-control lookups sometimes failed;
DOM hover at actual text bounds and subsequent actual click succeeded. Source
backend Windows gates reused unchanged from accepted local-import-usage.

## Integration

Pending main production integration and actual acceptance. TASK030/080/150 overall
remain incomplete; external generation, Agent and native Jianying reopening are
not covered by local import acceptance. Session2 remains617a80d.
