# Design

Operation actions already use workspace CAS and retain409 via the existing
conflict recovery UI. Reuse the same paused local recovery for uncertain/non409
writes, keeping latest local state instead of applying a stale full rollback.
Scope to operation-actions (apply/undo), not generic folder/document rollback.
Preserve a known server base rather than an optimistic increment. Add delayed
failure regression at the actual store boundary; project change is a no-op.

Comment submission passes explicit projectId/documentId/comments into the
existing controller. Validate loaded and active project before dispatch; freeze
target comments and document in execution context. Remote run termination alone
does not prove a comment was addressed: remove frontend's inferred auto-resolution;
explicit backend resolution operations/manual user resolution remain authoritative.
The existing local test runtime may resolve only after applying operations and
against the captured project/document/comment body, not active selection later.
Keep runtime failure/cancellation at existing controller/session boundaries.
Use a narrow overlay for the existing comment pane and scroll its anchored cards;
the previous hidden-on-mobile pane made its existing header toggle ineffective.

Owned files: documents operation-actions/tests, CommentsGutter/tests and agent
controller/tests (plus local context type if necessary). No session2-owned files.
Runtime uses own cache/profile, no real remote invocation; component/controller
tests simulate boundary responses and are not labeled real Agent acceptance.
