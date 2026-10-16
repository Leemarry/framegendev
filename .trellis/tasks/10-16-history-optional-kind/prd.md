# TASK-080 named history optional kind and error status

## Goal

Read existing named conversation history using its recorded kind when omitted, and return client errors for invalid explicit history queries without hiding backend faults.

## Requirements

- TASK080 / REQ019: optional kind on a named existing conversation uses its stored
  kind. Explicit mismatched or unsupported kind is a400 client error, while real
  repository faults retain safe500. Both task-list routes follow this contract.
- Existing unnamed scope/default-image fallback, project/batch precedence,
  pagination, data/envelope shapes and generation behavior remain compatible.
- Reads and rejected queries never save conversation/tasks/documents or send
  provider/Agent requests. No inference from names, new schema or dependencies.
- Ownership: generation_runtime_tasks.go/test, generation_tasks.go/test handlers;
  existing runtime service and error-envelope patterns, no handler business logic.

## Acceptance Criteria

- [ ] SQLite regression first reproduces omitted-kind failure for non-image
  named conversations, then covers all four kinds/isolation/record preservation.
- [ ] Handler tests distinguish wrapped query errors400 from safe backend500.
- [ ] Source full Windows check/race/build and frontend gates; main focused/native
  and embedded checks, actual local history/error/retry/reopen and unchanged full
  records/hashes in protected fixtures. No external sends or native reopen claims.

## Plan

Lightweight error/read correction using existing service and handlers. In the
named-conversation branch only, resolve stored kind if absent; keep existing
resolver validation. Wrap client validation in one sentinel error, map it to400
in thin HTTP handler and document400 on both existing routes. Preserve backend
errors. Tests first, actual HTTP and browser history restoration with local
fixtures; source commit, clean main integration, actual main production checks,
record/archive. This does not resolve separate project+conversation query
precedence semantics or legacy HTTP/1.1 SSE connection pressure.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
