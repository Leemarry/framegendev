# Design

The existing `StoragePanel` and Electron `desktop:get-cache-statistics` remain
the source for Chromium HTTP-cache bytes. Add a backend `service/storage`
owner for configured workspace roots, project roots and poster-cache
operations; route it through a thin HTTP handler and typed workspace API.

The scanner receives the canonical workspace root and registered project
directories from the workspace repository. It scans only disjoint known roots:
project directories, the global `library`, `.mediago-drama` metadata excluding
registered nested projects and poster-cache roots, and poster caches as their
own category. Walk without following links, count regular files/bytes and
surface unknown, skipped and failed paths without exposing arbitrary paths to
the renderer.

Cleanup candidates are limited to regular `*.poster.jpg` files discovered
under `WorkspacePaths.MediaPosterCacheDir` and
`ProjectMediaPosterCacheDir`. Preview stores an expiring opaque ID mapped to
root-relative path, size and modification time. Confirmation reopens the
canonical cache root, rejects symlink/path escape or changed metadata, and
removes each file independently. A shared per-path cache lease serializes
poster generation/serving with cleanup; cleanup skips a path whose lease is
active. Use root-relative no-follow filesystem operations where supported.

The UI preserves the existing native/browser cache distinction. Native users
can scan, preview and confirm poster-cache cleanup; browser users see the
existing unsupported state. Budget remains explicitly pending because no
current producer enforces it.
