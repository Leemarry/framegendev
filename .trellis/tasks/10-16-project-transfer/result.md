# TASK-062 project package transfer result

Updated: 2026-10-17

## Scope and format

No verified official cross-workspace project archive format was found in the
available source and task references. This implementation defines MediaGo's
own ZIP format, `mediago-project.json` schema version 1; it does not claim
compatibility with the unrelated `.mgpack` prompt-pack format. The package
contains `project.media.json`, `work/**`, and `library/**`. Central workspace
database history, generation/adoption records, credentials, and external
services remain out of scope.

## Delivered

- Read-only package preview validates schema and project identity, archive paths,
  duplicate entries, symlinks, and file-count/expanded-size limits. Import hashes
  the archive during preview and rejects a changed archive at confirmation.
- Export sorts paths and fixes ZIP timestamps, preserves source bytes, and refuses
  an existing output file. Import stages extraction, refuses identity/destination
  collisions, moves the staged tree, registers one project, and removes the tree
  if registration fails. A database trigger forces that failure in a regression
  test, which verifies the destination tree and project row are both absent.
- Cancellation is checked during preview/extraction and again before the move and
  project registration. Canceled import tests assert no destination or project row.
- Projects has import preview/confirmation, export action, and existing-directory
  open. UI tests cover import preview/confirmation, export destination/API call,
  and opening the imported project. The round-trip test preserves document bytes
  and a Markdown-relative `work/` to `library/` asset reference.

## Verification

- Passed: `go test ./...` in `services/server`; `go build ./...`; `go vet ./...`.
- Passed: `pnpm -C apps/workspace test -- src/pages/Projects.test.tsx` (14 tests),
  full workspace lint, and formatter check on all three changed frontend files.
- TypeScript completed during `pnpm -C apps/workspace build`; Vite then failed
  because installed `@tiptap/extension-list@3.32.0` imports
  `getPreviousBlockSibling`, which installed `@tiptap/core@3.23.4` does not export.
  The same dependency optimization failure stopped Vite before page runtime
  acceptance. No dependencies were installed and `pnpm-lock.yaml` was preserved.
- Full workspace format reports 85 pre-existing files outside this change.
  Go lint could not run because downloading golangci-lint v1.64.8 failed with a
  network connection error. Windows race/check gates were not run because no C
  compiler is available.
- `git diff --check` passed. Temporary API configuration and data were isolated
  under ignored `.cache/parity/task-062/`.

## Remaining acceptance

Keep TASK-062 in progress / awaiting acceptance. Once the installed frontend
dependencies are repaired from the intended lockfile, run the browser/Electron
flow with isolated data: native package selection, preview, confirmation,
import/export, cancellation, collision feedback, reopen and reference integrity.
Do not infer `.mgpack` compatibility or central workspace-history migration.

## Latest isolated runtime recheck (2026-10-17)

- The compatibility Vite configuration mounted the Electron renderer at
  `http://127.0.0.1:31582/` with an isolated user-data directory. The previous
  `31580` renderer instance returned `untrusted renderer` for native IPC because
  its configured development origin did not match the Electron process; the
  application security check was left unchanged.
- Against the isolated API on port `31581`, exporting
  `project-import-20261017` produced a deterministic ZIP, preview returned a
  fingerprint and 2-file/309-byte summary, and importing it into the existing
  destination returned the expected `409 Conflict` without changing the
  registered project. These checks used only `.cache/parity/task-062` and the
  existing task-100 isolated workspace.
- Native OS file-picker confirmation/cancellation and a full UI round trip are
  still pending because the system dialog cannot be driven reliably through the
  page CDP. The task therefore remains in progress.
