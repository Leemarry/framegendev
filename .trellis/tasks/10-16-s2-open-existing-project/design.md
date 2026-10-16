# Design

document.Service owns project paths and its mutex. Add a separate preview/open
adapter, using the existing manifest shape and markdown scanner. Preview validates
absolute directory, plain manifest/work tree, v1 identity, reads documents and
checks all registered paths. It writes nothing. Return manifest SHA256 fingerprint,
project metadata, existing flag and document count. Open revalidates under the
same service lock and compares the confirmed fingerprint. Insert only one new
project row through WorkspaceRepository; never upsert a conflicting identity,
ensure layout, save document state, copy files or modify source files.

New handler type wired through app/routes keeps the existing ProjectStore API
unchanged. POST /projects/open/preview and /projects/open return existing envelope.
Validation400, identity/source-change409, infrastructure500. Frontend dialog
supports native directory chooser and manual local path, two-stage preview/confirm,
inline failure and cancel. Projects uses existing navigation/cache refresh.

Only a registration row is written, atomically by INSERT. Filesystem changes after
preview are checked again; this does not promise a lock against external editors.
Central DB history/relationships from another workspace are not reconstructed.
