# TASK-181 design

The gap lives in the document save queue, incoming-document merge, streaming edit handling and legacy workspace mutations. The existing PATCH already rejects stale expectedVersion. Pause rather than rebase on conflict; preserve the local base and attach the latest authoritative server snapshot. SSE must not advance a dirty document's base. Own save echoes are identified against the in-flight snapshot to avoid false conflicts.

Recovery is local to the browser window and project, using a session identifier and localStorage drafts. Hydration restores unsaved drafts as paused conflicts, never sends them automatically. Storage failure is surfaced. Explicit resolution compares the version shown in the dialog; merged saving uses that expectedVersion and can conflict again. Server reload retains a downloadable recovery copy.

Files: document store types/actions/queue and recovery helper; document conflict panel mounted by DocumentStateSync for every document view; colocated tests; if the legacy workspace save bypass is confirmed, its existing request gains an optional expected-version map checked under the service lock and the frontend supplies it. No unrelated routing, packages or NLE rewrite.

Validation: focused queue/store/component tests, real isolated windows and HTTP persistence/history, frontend lint/format/build, Windows backend gates for any backend change. Failed or unrun acceptance remains pending.
