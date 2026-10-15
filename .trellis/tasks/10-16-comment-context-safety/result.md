# TASK-050 Local Comment Safety Acceptance

2026-10-16. Accepted bounded local lifecycle/context/failed-write slice. Whole050
remains open for real successful Agent execution and explicit resolution events.

## Implementation And Architecture

Reuse document operations, complete-workspace CAS, existing recovery storage and
conflict UI. Non409 apply/undo failures now pause and retain latest local state
instead of restoring an old whole-workspace snapshot. Keep the original base
version and fetch the current server copy. Late rejection after a project switch
does not touch the new project. Other generic mutation rollback is out of scope.

CommentsGutter passes explicit projectId/documentId/open comments. Controller
validates active/loaded project and document existence before dispatch. A remote
run ending successfully, failing or being canceled cannot prove a comment was
addressed, so frontend-inferred resolution was removed. Explicit backend/manual
resolution remains authoritative. Local test runtime resolves applied operations
only against captured project/document/comment identity and unchanged body.

The existing comment pane now works on narrow screens as a right overlay with
scrolling anchored cards. Manual resolution is retained as a useful local
improvement; icon actions have accessible names/tooltips. No dependency, route,
backend service or new persistence authority was introduced.

## Actual Workflow

Own backend31450/Vite31451/CDP9240, isolated task-070 workspace/profile reused.
Project project-9d7c9e501f0f7284; document doc-1792082854660-cfu5xc55cl.

- Actual selection bubble -> comment created v7, edited v8, manually resolved v9.
  Comment comment-1792084476636-edgg8lkz7ii anchored to Scene one: the station.
  Full body stayed exactly equal to history v6 throughout create/edit/resolve.
- Cancel edit CANCELLED_COMMENT_EDIT left server v9 unchanged. Actual offline
  edit OFFLINE_COMMENT_RETAINED showed paused recovery, retained local comment,
  and left server v9 unchanged. Reload restored paused draft. Actual conflict
  merge saved v10 with retained comment; delete saved v11/comments0.
- Two attempted selection scripts lost the transient comment button and failed
  StopIteration. A later type call had no focused input. Read-only API confirmed
  v11/body/comments0 unchanged; no accidental body/comment claim was accepted.
- Verified fresh selection and real textarea input created OPEN_COMMENT_FOR_REOPEN,
  comment-1792085050795-uwu1uk73ps, unresolved, v12. Actual backend stop/restart
  and full page reload retained v12, exact full body and complete comments/anchor.
  Reopened pane displays the saved comment; pane open/closed UI is not persisted.
- Desktop and390x844 light/dark,390x480 short pane inspected. Narrow document
  width390, pane256; close/actions/footer remain visible and cards scroll.
- Official own isolated app CDP9242: real body selection and nonempty comment
  captured, editor/delete and unresolved count observed. No Agent submitted.
  Official project/profile were disposable own fixtures, reference files untouched.

## Checks And Limits

- Documents/controller suite42 files254 tests passed; added undo regression then
  focused store31 tests passed (combined total255). Tests cover delayed failure
  preserving later typing/other document/selection, navigation to another project,
  undo failure, stale context rejection and completed/failed/canceled remote no-op.
  These runtime simulations do not constitute real Agent success acceptance.
- Frontend lint0, full701-file format, tsc/Vite build pass. Existing large-chunk
  advisory retained. Latest test required formatter fix; initial undo fixture
  incorrectly used an unset save mock, fixed by hydrating a real saved operation.
- No Go sources/contracts changed; Windows backend gate not applicable to this
  frontend-only slice. Integrated combined verification is recorded afterward.
- codex-acp missing: actual runtime-config probe503 req-59581bed823512bb. No
  production Agent/generation, login/payment, external send or real workspace use.
  To finish050, provide an authorized isolated runtime and verify successful
  document operation/resolution, navigation and cancellation end to end.
- Existing complete-workspace optimistic operation concurrency and legacy callers
  without CAS remain boundaries; this slice fixes failed-write retention only.
  GAP-004 provenance and native Jianying reopening remain open independently.
- Temporary original CRLF normalization for fullformat is restored before staging;
  no unrelated source/newline changes belong to this commit.

Durable evidence in evidence/: actual offline/reload recovery, reopened short
pane, light/dark resolved panes and official nonempty comment. Additional local
captures and before-restart JSON remain under .cache/parity/task-050/.
