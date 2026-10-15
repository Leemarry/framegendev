# Shared Contract Request For Session1

2026-10-16. TASK-060/062 and TASK-100 implementation remains open. This document
is the minimum coordination request, not a new common specification. Session2
has not modified document services, routes, repositories or shared models.

## TASK-060/062

Source evidence: services/server/internal/service/document/project_store.go
owns projects as methods on document.Service. CreateProject validates only an
existing directory in cleanExistingProjectDir, then ensureProjectLayout,
insertProjectUnlocked, saveUnlocked(initial empty documents/log). It is a create
operation, not a safe importer. No project import/export handler was found;
existing .mgpack routes are skill packs and must not be reused as project format.

Minimum service operations needed (names proposed, not an implemented API):

- InspectProjectSource(ctx, source): read-only detect supported package/folder
  schema, project identity, documents/media references, required bytes and
  conflicts; return a preview without writing anything.
- ImportProject(ctx, source, destination, conflictPolicy): validated staging,
  reference-preserving transaction, explicit collision behavior and rollback.
- ExportProject(ctx, projectID, destination): stable service-owned snapshot,
  preserve body/version/assets/relative refs, safe archive paths, explicit
  result path and errors. Never implement this as a renderer JSON dump.
- OpenExistingProject(ctx, folder): validate existing manifest/data before
  registration, deduplicate existing project identity/path; never initialize
  empty documents over that source. Cancellation before confirmation writes zero.

Session1 needs to own the minimal new document service adapter, route wiring
and any repository/model changes. Candidate files: document/project_store.go,
new document/project_transfer.go + tests, a new handlers/project_transfer.go,
routes/routes.go, repository access only if required. Session2 can then own
projects API/UI and Electron pick/save bridge additions with agreed DTOs. Native
new window is still held until TASK-181 integration; no claim it is available.

Verify archive format against official disposable own project first; filename
is not schema evidence. Acceptance must include body/version/reference roundtrip,
unknown schema, traversal/archive links, missing files, collision/cancel/failure
rollback, reload/restart, existing source hashes unchanged.

## TASK-100

No storage statistics/cleanup service or UI was found. Projects and assets can
live outside workspace root; renderer-chosen directory traversal is not an
authoritative classifier. Document/media/updater owners know active files.

Minimum shared contract: a read-only storage snapshot of configured roots with
category, actual bytes, item count, unknown/skipped/error counts; only later a
preview of a bounded allowlist of reproducible cache candidates. Cleanup needs
opaque candidate identities, revalidation of real paths/size/mtime and active
usage at deletion time, symlink containment checks, per-file failure/skip results,
and no-follow deletion. Unknown/project/source files always excluded. A quota
preference cannot claim enforcement until producers consume it.

Session1 assigns service/router/active-use interface ownership before Session2
adds a scanner or destructive action. Session2 can implement the settings view
and real native app-cache statistics after this agreement. No deletion, budget
fake-save or arbitrary workspace scan has been implemented.

## Independent Next Work

Continue TASK-140 account structure/local identity using existing local billing
and projects APIs. Browser search preferences lack an embedded browser consumer;
do not store a configuration and claim that it changes real browsing. TASK-110/
120/130 need separate protocol/state verification; current pending labels remain.
