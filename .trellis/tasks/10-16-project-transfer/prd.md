# TASK-062 project package transfer

Implement a local, versioned project package for cross-workspace transfer.

The package format is a ZIP containing `mediago-project.json` (schemaVersion 1)
and the project's `project.media.json`, `work/**`, and `library/**` files. The
existing `.mgpack` prompt-pack format is unrelated and must remain unsupported.

Acceptance: read-only preview, safe archive path validation, stable export,
round-trip import preserving manifest/document bytes and relative references,
explicit destination collision handling, cancellation before commit, and
failure rollback with no partial project registration or source mutation.

Out of scope: provider credentials, generation/adoption history owned by the
central workspace database, external services, and arbitrary symlink targets.
