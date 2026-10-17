# Quality Guidelines

For workspace product changes, run from the repository root:

```powershell
pnpm -C apps/workspace lint
pnpm -C apps/workspace format
pnpm -C apps/workspace build
pnpm -C apps/workspace test -- <relevant-test-path>
```

Vitest/Testing Library tests are colocated, e.g.
`domains/settings/components/CodexAccessPanel.test.tsx`. Cover meaningful
save/reload, validation, cancellation and failure behavior; avoid tests that
merely restate constants.

Compare against the official 0.1.17 references (see `docs/parity/GAP.md`):
layout, interaction and function must match; pixel parity is not required.
Commercial services stay visibly pending (`【待接入】`); never fabricate login,
payment, installation, export or generation success.

Persistence checks compare stored body/version before and after reload, not only
visible text — unedited documents must not gain empty paragraphs or versions.

Tiptap packages must share one version. A blank page with a missing named export
from `@tiptap/*` means mixed versions: align `package.json` and reinstall with the
declared pnpm (`packageManager`), never patch with Vite aliases or shims.
