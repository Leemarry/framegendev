# Quality Guidelines

For workspace product changes, run from the repository root:

```powershell
pnpm -C apps/workspace lint
pnpm -C apps/workspace format
pnpm -C apps/workspace build
pnpm -C apps/workspace test -- <relevant-test-path>
```

Inspect package scripts. Vitest/Testing Library tests are colocated, e.g.
`domains/settings/components/CodexAccessPanel.test.tsx`. Cover meaningful
save/reload, validation, cancellation and failure behavior; avoid tests that
merely restate constants. Tooling/docs changes require relevant script/path/
format checks, not unexecuted claims about product build or runtime.

Record visual, interaction and functional acceptance separately. Official
references are 1600 x 1136 full-window captures; account for the title bar
when comparing browser vs Electron. Match theme, scale and data state.
Verify actual persistence and desktop behavior where applicable.

Use isolated test data and never access production `workspace-v2`.
Commercial services remain explicitly pending; no fabricated login, payment,
installation, export or generation success. Do not suppress check failures.
Record remaining gaps and failed/unrun checks in the task and ledger.

TASK-001 found that text can survive reload while the persisted Markdown gains
empty paragraphs and its version increments without edits (TASK-004). Persistence
acceptance must compare stored body/version before and after reload/reopen/restart,
not only visible text. Record console errors separately from JS exceptions and
distinguish expected canceled streams during restart from failed business requests.

Browser fixtures should have a dedicated data directory and origin/port when
other editor tabs are open. GAP-004 found a shared fixture's `workspace_save`
while testing library controls: a history commit identifies the save operation
but does not establish which caller initiated it. Keep original snapshots and
changed files, record the mismatch and investigate provenance; never restore or
silently replace a failed baseline. A fresh isolated acceptance run proves only
its own unchanged documents/hashes and does not close the original anomaly.
