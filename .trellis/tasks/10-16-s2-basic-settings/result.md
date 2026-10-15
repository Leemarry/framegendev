# TASK-090 Basic Settings Checkpoint

2026-10-16. Working theme and workspace-directory slice implemented. Whole090
and this task's390px acceptance remain open; do not archive this task yet.

## Changes And Contracts

- Extract BasicSettingsPanel from Settings.tsx, retaining existing projects SWR
  API, shared theme persistence and native open bridge. No new public contract,
  backend, dependency, shared style/store/model/router changes.
- Official appearance/language, workspace and preference groups; three keyboard
  accessible theme radios with previews. Workspace path wraps instead of hiding.
- Workspace Open now opens the directory itself through openNativePath rather
  than selecting it in its parent. Read failure has retry; open failure is visible
  and retryable. Browser builds disable native Open. No success notification is
  inferred from a click.
- Language, anonymous statistics and diagnostics remain disabled with explicit
  reasons. They have no matching runtime implementation. Existing advanced
  settings remain accessible. No new telemetry service or fake language setting.
  Follow-up inspection found shared/analytics/talking-data.ts already supports
  optional browser analytics by build env and disables script injection in
  Electron. Its preference/consent hook is absent; the pending row now says the
  preference is not connected, rather than claiming analytics does not exist.
  No shared analytics behavior was changed (session1 owns that module).

## Actual Verification

- Official screenshot80 inspected; browser-harness clicked Basic Settings in
  own official PID50812/CDP9243. Displayed workspace was under this worktree's
  .cache/parity/s2-settings-official/official-workspace, not user data.
- Tests: new4 behavior tests pass, covering theme remount, native failure/retry,
  workspace read retry and browser/pending states. Settings suite combined35
  tests passed on rerun. First combined run failed an existing LibTV polling
  timer assertion; isolated test passed and complete rerun passed. No product
  login or authorization was performed.
- Lint: zero warnings/errors. Production build including tsc passed; existing
  >500KB chunk advisory remains. Changed3 source files format passes.
- Full format on checkout failed673 files due existing CRLF vs editorconfig LF.
  git archive also exported checkout endings. A cache-only copy of HEAD plus
  current3 files was normalized to LF, linked to this worktree's node_modules,
  then all690 files passed when run from that copy's package directory. Earlier
  invocation from a different cwd failed1 package.json; missing dependency in
  copy initially prevented config load. No bulk source normalization committed.
- Browser-harness actual clicks of light/dark/system radios updated the real
  theme store and all persisted through Page.reload. Desktop screenshots retained.
- Native PID44868/CDP9245 Open launched an Explorer window titled workspace on
  own MediaGoParityS2Development desktop (window6883856/PID52296). Complete
  native1600x1136 and browser-content captures are separate evidence files.
  No alert appeared; displayed path was own .cache/parity/s2-settings/workspace.
- Closed own Electron via Browser.close (expected WebSocket closed), verified
  PID44868 and9245 gone, restarted same own profile as PID45300/CDP9245. Dark
  theme and checked radio remained. Restart used existing backend31452 and
  Vite31453, both proxy and desktop server env configured to31452.
- Width700: content389px, fieldset/sections scrollWidth==clientWidth. Width390:
  global260px sidebar leaves129px content/79px inner width. Existing TASK-020
  shell defect remains; workspace section has1px excess and controls are too
  constrained. Keep failed390px screenshot, no narrow-complete claim.

## Remaining

- Coordinate App.tsx global-settings narrow-shell flag with session1; the
  requested minimum contract is in s2-settings-navigation/result.md.
- Language resources, diagnostics/runtime configuration and anonymous analytics
  remain pending development/integration. Whole TASK-090 also includes browser
  preferences and runtime update acceptance. No installs or updates were run.
- No new general spec is needed; follow existing SWR/theme/native bridge rules.
  The useful integration distinction: workspace Open uses openNativePath;
  project Reveal may use revealNativePath. Session1 owns common specs.
