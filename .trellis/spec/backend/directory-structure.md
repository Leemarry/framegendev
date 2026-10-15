# Directory Structure

Actual entry: `services/server/cmd/mediago-server`; companion commands include
`cmd/mediago-mcp` and `cmd/mediago-document-mcp`.

`internal/app` wires startup, `internal/http/handlers` binds requests and writes
responses, and `internal/http/routes/routes.go` registers routes.
Services own business behavior, repositories DB access, domain models contracts.

Keep handlers thin and reuse constructors/boundaries; do not create the
template-only `cmd/server` or `http/router.go` paths.
`internal/config/config.go` uses `yaml.v3` with `ServerConfig` and environment
parsing in `env.go`. Extend it and `configs/server.yaml`; no unrelated Viper migration.
Root `go.work` includes seven modules; retain shared package ownership.

## Media Reference Contract (TASK-164)

### Scope / Trigger

Asset reference details merge project selections and Markdown document images.

### Signatures

`shared.MediaAssetIDFromURL(string) string` is shared by generation/document.
`document.Service.ListDocumentMediaAssetReferences(projectID)` implements media's
consumer interface; app wiring calls `SetDocumentAssetReferenceSource` at startup.
Both existing GET media-assets reference routes return `{references: [...]}`.

### Contracts

Each entry has projectId/projectName, source (`selection` or `document`),
resourceTitle/resourceType and optional documentId. Enumerate all project lifecycle
states. Goldmark image nodes include inline/reference images and exclude code;
filter placeholder images and deduplicate per document/asset. Parse EscapedPath
then unescape once. Reads must not save document content or metadata; existing
document load may initialize missing work directories.

### Validation And Errors

Missing asset returns 404; document/repository read failure returns an error,
never a successful empty result. Unwired document source retains selections only.

### Cases

Good: one selection plus two document uses yields three identifiable entries.
Base: no usage returns an empty array. Bad: counting fenced Markdown examples.

### Required Tests

Cover code/placeholder exclusion, inline/reference syntax, encoded IDs decoded
once, archived/trashed projects, source identity, reader errors, both API routes
and unchanged document bodies/versions; verify real UI and restart persistence.

### Wrong And Correct

Wrong: regex the entire Markdown text or query only project_selected_assets and
declare unused. Correct: parse rendered image nodes through document ownership,
merge the two sources, and propagate failures.
