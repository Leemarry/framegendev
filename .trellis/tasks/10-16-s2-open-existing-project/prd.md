# TASK-062 open existing local project directory

Open an existing project.media.json v1 directory after a read-only preview and
explicit confirmation. Preserve original documents, frontmatter versions and
local history files; do not call CreateProject or initialize an empty workspace.
Repeated opens return the same registered project. Reject invalid schema,
identity/path conflicts, archived/trashed records and linked filesystem entries.
Cancel before confirmation has zero persistence effects. Errors remain retryable.

Scope: directory opening, not cross-workspace package import/export. A directory
does not contain the central database's generation/adoption/media relationships;
the preview must explain this limitation for a newly registered directory.
Official package interoperability remains pending TASK060/062 format verification.

Acceptance: targeted Go registration/validation/source-byte checks, frontend
preview/cancel/open tests, build/lint/format and one isolated API/UI smoke workflow.
Follow latest user instruction to prioritize functionality over elaborate repeated
regression matrices. Do not claim unrun checks or whole TASK062 completion.
