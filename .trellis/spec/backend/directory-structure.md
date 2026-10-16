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

## Material Usage Projection (TASK030)

Material list routes support optional includeUsage=true, preserving default
responses and storage. ListWithUsage attaches selected/candidate/reference flags
using a batch repository projection and one existing document scan per relevant
project, never per asset. Global mode counts any usage of global-only files;
project mode counts the current project's usage of project+global visible files.
Selected uses live adoption rows or selected retained task slots; candidate uses
unselected retained slots. Ignore output tombstones and soft-deleted adoptions.
Reference uses project reference entries, actual provider inputs (ID/local URL)
and parsed document images. Internal media-library input IDs describe import
lineage, not generation reference use. Uses may overlap; unused requires every
flag false. An unwired/failed document reader or database failure cannot establish
unused: fail safely. Check cancellation before/after scans. This remains O(N)
loading plus project document scanning, not a pagination contract.

## Local Image Dimensions (TASK030)

`media.enrichImageMetadata` reads local headers with existing PNG/JPEG/GIF
standard-library decoders; it does not decode pixels or change file bytes.
New local imports persist width/height/status. Listing backfills missing dimensions
through the existing guarded metadata path, preserving image updatedAt explicitly
because Gorm otherwise touches it. Keep video metadata policy unchanged. Missing,
corrupt and unsupported files leave dimensions unknown with failed metadata and
do not turn successful asset storage/listing into a decoder error. No external
fetch for linked assets. Verify actual encoded imports, repeated backfill,
identity/hash/timestamp, persisted fields and source/main restart records.
