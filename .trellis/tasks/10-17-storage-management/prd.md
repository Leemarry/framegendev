# TASK-100 storage classification and safe cache cleanup

Implement the remaining workspace-storage slice of REQ-021. The existing
Electron HTTP-cache reading stays intact. The user needs truthful disk usage
by known local storage category and a way to reclaim only disposable preview
cache after reviewing the exact candidate list.

Acceptance:

- Report actual bytes, regular-file count, skipped/unknown/error counts and a
  measurement time for registered project directories, the global media
  library, application metadata and known generated-media poster caches.
- Avoid double counting nested roots. Do not follow symlinks. Missing,
  unreadable and unclassified roots remain visible as skipped/error results.
- Preview only generated poster files below canonical workspace/project poster
  cache roots. Preview has no filesystem side effects and returns short-lived,
  opaque candidate IDs with useful size/name information and active-use state.
- Cleanup accepts only IDs from a current preview. Revalidate containment,
  regular-file status, size and modification time, and active use immediately
  before removal. Return per-file removed/skipped/failed outcomes and totals;
  stale or active files are retained.
- UI shows scan/preview/cleanup failures and partial outcomes, supports retry,
  and confirms the exact candidate count/bytes before cleanup. Browser mode does
  not expose filesystem cleanup.
- Tests use isolated temporary roots and verify source/project files, symlinks,
  active files and stale candidates remain untouched.

Out of scope: browser profile and full Electron profile cleanup, update
packages, generic temp/trash directories, unknown roots, project/media source
files, and claiming an enforced quota without producers that consume it.
