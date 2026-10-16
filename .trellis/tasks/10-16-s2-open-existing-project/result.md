# TASK-062 Existing Directory Opening

Implemented a minimal, real existing-directory flow. `project.media.json` v1 and
the `work` directory are validated read-only; symlinks, invalid identity/schema,
missing files, stale fingerprints and registered path/identity conflicts fail
safely. Preview returns the source manifest SHA-256, project metadata and document
count. Confirmation revalidates and inserts one project row without calling the
empty-project initializer. Existing source Markdown remains byte-identical.
Repeated opening returns the registered project without another write.

Routes:

- `POST /api/v1/projects/open/preview`
- `POST /api/v1/projects/open`

Projects page now uses the native directory picker, shows a confirmation preview,
supports cancel and opens the registered project. The old disabled directory button
is functional; the import button currently shares this safe directory path pending
verified archive/package format evidence. Cross-workspace package import/export is
still pending TASK-060/062 and is not claimed.

Checks: targeted Go document/repository/handler/routes/app tests pass; dedicated
project preview/open tests pass; `go build ./...` passes; workspace lint/build and
Projects tests (12) pass. Isolated HTTP smoke on server31452 registered one project,
read one Markdown file and preserved its hash. Full Windows backend gates and a
fresh native UI click run were not repeated after the browser CDP instance exited.

