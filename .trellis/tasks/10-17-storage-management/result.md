# TASK-100 implementation result

2026-10-17. Storage classification and poster-cache cleanup implementation is
complete. TASK-100 remains in progress until a real UI/native acceptance pass is
available; it is not archived.

## Behavior

- The backend measures regular-file bytes/counts for registered project roots,
  global `library`, global `.mediago-drama` metadata and generated poster
  caches. Nested roots are assigned to one category, symlink entries are
  skipped, and missing/unknown/error counts remain visible without returning
  arbitrary paths to the renderer.
- Project roots come from a read-only repository projection. It does not repair
  incomplete project layouts during a scan; trashed projects use their current
  trash directory.
- Poster preview only lists regular `*.poster.jpg` files in canonical workspace
  or registered project poster-cache roots. IDs expire after ten minutes and
  each new preview invalidates older IDs.
- Cleanup revalidates the cache root, root-relative containment, regular-file
  type, size, modification time and per-path active-use lease immediately
  before `os.Root.Remove`. Outcomes are reported independently per candidate.
- Poster generation, HTTP serving and cleanup share per-path leases. The UI
  keeps Chromium HTTP-cache readings, shows category/scan/preview/cleanup
  states, starts poster scanning only after an explicit preview click, confirms
  exact candidate count/bytes. Active candidates are called out in the
  confirmation and result UI and remain protected by the server-side lease
  recheck. Preview/delete controls are only exposed in desktop runtime.

## Verification

- Go `go test ./...`, `go vet ./...` and `go build ./...` pass. The full test
  run used the local ignored Swagger cache updated for the new routes because
  downloading `swag` was unavailable.
- Workspace lint passes; TypeScript build-check passes; StoragePanel tests pass
  (6/6), including no automatic preview on mount, empty-preview handling,
  partial results, and the active-file retention warning; changed frontend
  files pass targeted formatting.
- Isolated API runtime on port 31581 used only
  `.cache/parity/task-100/workspace` and an external fixture project under
  `.cache/parity/task-100`. Statistics reported all four categories; preview
  returned two poster candidates totaling 7 bytes; cleanup removed both and
  left the project source file intact.
- The read-only project-root method test verifies that scanning does not
  recreate a missing project work directory. Service tests cover nested roots,
  project-in-library de-duplication, symlink traversal where supported,
  active-use protection, stale IDs and changed candidate metadata.

- Real browser acceptance now passes in an isolated Edge profile connected by
  browser-harness to Vite `31580` and API `31581`: the app mounts without a
  blank page, the Storage settings page renders all four categories, and the
  initial page load requests statistics only. No poster-cache preview request
  is sent until the explicit preview action. Browser runtime correctly hides
  the desktop-only cleanup controls.
- The blank page was caused by installed `@tiptap/extension-list@3.32.0`
  importing `getPreviousBlockSibling` from installed
  `@tiptap/core@3.23.4`, followed by the same version skew on the core JSX
  runtime subpath. Vite now uses a local compatibility export and explicit JSX
  runtime aliases; this keeps the uncommitted lockfile untouched.
- Electron native acceptance now passes in an isolated app profile using Vite
  `31582`, API `31581`, CDP `9245`, and user data under
  `.cache/parity/task-062/electron-user-data`: the Storage page renders, the
  native confirmation dialog can be cancelled without deleting candidates,
  and confirmed cleanup removes only poster cache files while preserving the
  project source file. `electron:compile` also passes after replacing the
  unavailable `electron-updater` `UpdateInfo` export with a local minimal type.

## Remaining acceptance and environment limits

- Direct isolated HTTP checks remain healthy: Vite returns 200, and
  `/api/v1/storage/statistics` plus poster-cache preview return successful
  envelopes with the expected category/candidate shape. Browser and the
  available Electron confirmation/cancellation/deletion path are verified;
  TASK-100 remains in progress for broader native partial-result and
  active-file protection acceptance.
- `pnpm run build` passes TypeScript and Vite with the compatibility aliases.
- `pnpm run electron:compile` passes after the updater type compatibility fix.
- Full workspace format reports 83 pre-existing unmodified files. Go race and
  golangci-lint are unavailable here (`CGO_ENABLED=0`, no Windows GCC and no
  local golangci-lint); Swagger tool download also failed due network access.
- `oxfmt --check` passes the TASK-100 task artifacts and changed TypeScript
  files. It still flags the shared `TASKS.md` and `CURRENT-HANDOFF.md`; they
  were left intact rather than reformatting unrelated project records.
- Continue native acceptance for partial-result feedback and active-file
  protection. Keep TASK-100 in progress until those broader checks are done.
