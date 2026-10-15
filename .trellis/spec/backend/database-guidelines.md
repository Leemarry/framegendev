# Database Guidelines

Use Gorm/SQLite setup in `services/server/internal/repository/db.go`:
WAL, NORMAL synchronous mode, cached handles, `AutoMigrate` and explicit
compatibility migrations. Examples: `workspace_repo.go`, `project_asset_repo.go`,
their tests and `db_test.go`.

Keep SQL/Gorm in repositories and return domain data. Preserve transactions,
migration compatibility, handle caching and workspace isolation. Do not add a
second database/migration system. Existing repository tests use isolated real
SQLite; follow their helpers rather than require an unrelated Docker DB.

New persistence needs save/reopen coverage and legacy migration checks where
applicable. Never inspect, migrate or clean production `workspace-v2`.

## Library display metadata (TASK-031)

### Scope / Trigger

Material library media metadata belongs to the existing physical `assets` model.
Project directory `project_reference_assets.folderId` is a different concern.

### Signatures

`MediaAssets.Update(id, projectID string, payload MediaAssetUpdateRequest)` returns
`(MediaAsset, bool, error)`. PUT global/project `media-assets/{id}` accepts optional
filename, tags:string[], note:string, rating:integer. `AssetModel` stores
tags_json TEXT default '[]', note TEXT default '', rating INTEGER default 0.

### Contracts

Omitted/null fields remain unchanged; [], empty note, and 0 explicitly clear.
At least one non-null field is required. Tags are trimmed/deduplicated, empty
tags removed, maximum 20 input entries and 40 Unicode characters each. Note keeps
whitespace, maximum 4000 Unicode characters. Rating is 0–5. Upload/read/update
projections use empty tag arrays rather than null. Central AutoMigrate adds
columns without modifying asset IDs, physical paths, URLs, hashes or references.
The generation-internal UpdateFilename method remains compatible.

### Validation And Error Matrix

| Condition                              | Result                        |
| -------------------------------------- | ----------------------------- |
| Invalid type/range/length/empty patch  | 400, no write                 |
| Missing asset or owner scope differs   | 404, no write                 |
| Database failure                       | 500 with safe response        |
| Matching owner and valid partial patch | 200 with refreshed projection |

### Good / Base / Bad Cases

Good: project metadata survives restart and note-only changes preserve tags.
Base: legacy rows have []/empty/0. Bad: global PUT targeting project media returns404.
Project lists currently include global assets for compatibility; writes must use
the media's actual projectId, never its current viewing project's ID.

### Required Tests

library_metadata tests in service, repository and app cover normalization,
clear/partial updates, wrong-scope non-writes, malformed JSON, legacy migration,
closed DB reopen and unchanged file identity. Browser acceptance must verify real
uploads and save/cancel/search/reload, plus original document hash/version checks.

### Wrong / Correct

Wrong: use derived resource-category tags as user-editable labels or store only in
localStorage. Correct: save on the physical media API and search persisted tags/note.

## Logical Library Folders (TASK-035)

Use asset_library_folders, separate from document/project_reference_assets folders.
Empty project_id means global scope; empty parent_id/library_folder_id means root.
Sibling (project_id,parent_id,name) is unique. Names are trimmed, 1-80 Unicode
characters, excluding dots-only navigation names, separators and controls.
GET/POST/PUT global/project asset-library-folders list/create/rename; parentId is
creation-only. Missing/cross-scope folder or project returns404; invalid/conflict400.
Media PUT folderId omitted/null preserves, empty returns root. Validate the entire
patch before writing. Multipart folderId validates ownership before saving the
upload in one operation. Classification preserves file ID/path/URL/hash/references.
Project permanent deletion cleans folders in its existing transaction. Existing
assets migrate to root; test legacy schema/reopen, rejected writes, HTTP/SQLite
consistency and service restart. Folder deletion/reparenting/scanning are pending.

Global/project media DELETE calls MediaAssets.DeleteInScope(id, projectID): owner
mismatch and missing asset return404 without writes. Internal Delete remains for
existing trusted callers. Client sends the asset's owner scope, then revalidates
the currently viewed library; a global DELETE response must not replace a project
library cache. Test cross-owner rejection in temporary DB only; preserve runtime
acceptance fixtures. Global GET contains global assets; project GET retains global
visibility for compatibility, which is not permission to classify into project folders.
### Logical Library Folder Deletion (TASK-162)

`DeleteLibraryFolder` is the repository transaction boundary for logical folder removal. It scopes lookup and delete by both folder ID and owner scope, counts media references and child folders in the same transaction, and returns `ErrLibraryFolderNotEmpty` without writing when either count is non-zero. The service maps missing scope/folder to not-found and the HTTP handler maps non-empty folders to `409 Conflict`; cross-scope and missing requests must not reveal data. Deletion removes only the logical row and never changes physical media identity or references. Recursive deletion, reparenting, and disk scanning remain separate tasks.
