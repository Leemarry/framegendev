# TASK-050 Comment Context And Failed Save Safety

REQ-016/018/045. Preserve submitted comments and subsequent edits when a local
comment/document operation cannot be saved. A comment-triggered Agent request
must use the reviewed project/document/comments; completion may not resolve a
different document's comment after navigation. Failed/canceled/no-edit runs leave
comments open. Retain existing anchors, editing/resolution and history APIs.

Accept local create/edit/delete/resolve persistence and reopen with nonempty
comments; actual offline failure retains text/comment and exposes recovery;
focused regressions cover delayed rejection after later typing/project switch,
explicit context mismatch, failed/no-op Agent completion and switched document.
Verify frontend lint/format/build and related tests, actual light/dark/narrow UI.
Do not send production Agent/generation or access real projects. If a real remote
successful run cannot be executed, record that boundary and leave whole050 open.

No new Agent service, model integration, task automation, dependency or route.
