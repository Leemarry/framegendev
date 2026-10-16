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
  exact candidate count/bytes, and only exposes preview/delete controls in
  desktop runtime.

## Verification

- Go `go test ./...`, `go vet ./...` and `go build ./...` pass. The full test
  run used the local ignored Swagger cache updated for the new routes because
  downloading `swag` was unavailable.
- Workspace lint passes; TypeScript build-check passes; StoragePanel tests pass
  (4/4), including no automatic preview on mount; changed frontend files pass
  targeted formatting.
- Isolated API runtime on port 31581 used only
  `.cache/parity/task-100/workspace` and an external fixture project under
  `.cache/parity/task-100`. Statistics reported all four categories; preview
  returned two poster candidates totaling 7 bytes; cleanup removed both and
  left the project source file intact.
- The read-only project-root method test verifies that scanning does not
  recreate a missing project work directory. Service tests cover nested roots,
  project-in-library de-duplication, symlink traversal where supported,
  active-use protection, stale IDs and changed candidate metadata.

## Remaining acceptance and environment limits

- Real browser interaction is pending. `browser-harness` reached Chrome's
  explicit “Allow remote debugging?” prompt; the required user action is still
  pending.
- `pnpm run build` passes TypeScript but Vite fails because installed
  `@tiptap/extension-list@3.32.0` imports `getPreviousBlockSibling` missing from
  installed `@tiptap/core@3.23.4`. The default Vite dev server hits the same
  dependency optimization failure.
- `pnpm run electron:compile` is blocked by installed `electron-updater`
  declaring `UpdateInfo` locally but not exporting it.
- Full workspace format reports 83 pre-existing unmodified files. Go race and
  golangci-lint are unavailable here (`CGO_ENABLED=0`, no Windows GCC and no
  local golangci-lint); Swagger tool download also failed due network access.
- `oxfmt --check` passes the TASK-100 task artifacts and changed TypeScript
  files. It still flags the shared `TASKS.md` and `CURRENT-HANDOFF.md`; they
  were left intact rather than reformatting unrelated project records.
- After dependencies are aligned and browser access is available, verify the
  Storage settings page in browser and Electron, including exact confirmation,
  cancellation, partial result feedback and browser-hidden cleanup controls.
