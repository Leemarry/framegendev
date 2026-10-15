# TASK-070 readable historical differences

REQ-018/045: actual official reading mode is a normal-text line diff with line numbers, parallel/unified layout, change navigation and highlighted additions/removals. Add that presentation to the existing diff, while retaining the previously accepted exact-source and immutable full-snapshot reading inspection.

- [ ] Reading/source presentation switches without changing selected/current hashes, restore base, line alignment, navigation anchors or immutable content.
- [ ] Changed lines and literal markup remain escaped and readable in both layouts; no rich-editor/parser or write lifecycle is introduced.
- [ ] Actual source/main switching, failed reads/recovery/cancel/reload/restart preserve full document/version/history; relevant tests/frontend gates/main embedded build pass.

This bounded item covers observed typography and line-level highlighting. Official word-level highlighting and Markdown reading transformations are not sufficiently established by the current paragraph-only fixture; keep them explicitly unverified.
