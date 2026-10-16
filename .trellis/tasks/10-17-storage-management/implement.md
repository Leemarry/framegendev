# Implementation

1. [x] Add storage scan/preview/cleanup service and isolated service tests.
2. [x] Add per-poster leases around generation, serving and cleanup; test active
       exclusion, changed candidates and source-file preservation.
3. [x] Wire handler/routes/types and HTTP contract tests for malformed, stale
       and partial cleanup requests.
4. [x] Extend StoragePanel with categories, explicit on-demand preview, exact
       confirmation, per-file results, retry and browser-safe states; add component
       tests.
5. [ ] Finish quality gates and isolated native/browser acceptance. Code and
       isolated API checks pass; browser/Electron interaction is pending the
       existing Tiptap and electron-updater dependency mismatch and local browser
       remote-debugging authorization.
