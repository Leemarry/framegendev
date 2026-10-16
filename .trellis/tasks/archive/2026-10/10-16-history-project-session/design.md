# History intersection

The incorrect behavior lives in GenerationService.ListGenerationTasks: project
short-circuits conversation resolution. Keep that aggregate branch only when
conversationID is absent. Explicit sessions use the existing named/legacy
resolver and error mapping. Add optional ProjectID to existing repository list
options and apply its predicate before Limit/Offset in the shared repository
options function. No in-memory filtering of an already truncated history.
Decide whether a project was supplied before cleaning it: even an ID cleaning to
empty retains an empty project predicate, matching existing project-list behavior.

Ownership: generation_runtime_tasks.go and a focused sibling test; repository
generation_task_repo.go; generation_tasks handler annotations and binding tests;
backend error contract; this task and public records. All are session1-owned.
No dependency, model, route, schema or frontend changes. Existing project-only
and batch branches remain compatible. Optional repository field is internal.

Verification uses isolated real SQLite and local media-library imports only.
Backend failures continue through existing handler safe500. Test unknown legacy
scope, explicit kind mismatch, foreign project within one session and offset
after filtering. Review all options callers for keyed literals. Rollback one
independent source commit; there is no persisted state to migrate or revert.
