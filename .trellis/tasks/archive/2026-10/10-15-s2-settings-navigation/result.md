# TASK-020 session 2 checkpoint

Latest status2026-10-16: settings navigation slice accepted after the narrow-shell
fix below. Initial failed acceptance is preserved for traceability. Feature pages
with missing protocols remain explicitly pending; this does not complete090/100/
110/120/130/140 or whole-product parity.

## Narrow-Shell Completion

Session1 committed App.tsx ownership contract31e4fa1; read its current committed
handoff before editing. App.tsx now passes globalSettings for global settings and
keys drawer state by selected global tab. AppLayout reuses its existing narrow
drawer, with a narrow-only toolbar and absolute sidebar. Desktop260px/persisted
width and project325px behavior remain distinct. No shared CSS edits.

SettingsPanelButton adds data-sidebar-navigation-item to close the drawer even
when selecting the current page; tool menus are excluded. Narrow open content is
inert. Escape/selection restore focus to toggle; normal sidebar tab changes also
close via key. No API/IPC/dependency/route/model changes.

Actual new acceptance:51 tests in AppLayout/ProjectNavigatorPanels/Settings/
BasicSettingsPanel passed, zero lint warnings, production tsc/build passed.
Full691-file format passed on cache-only LF snapshot with current source overlay
and this worktree's dependency junction; checkoutCRLF failure remains historical.

Browser-harness390x700 clicked all20 sidebar entries, verified correct heading,
drawer closed, toggle focused and pageWidth==bodyWidth390 for every selection.
Actual Escape and same-page selection both close correctly.390x480 drawer scrolls
to the last advanced entry; footer remains visible. Reload leaves drawer closed.
Actual Return in drawer reaches root project management. Light/dark basic/account
screens are nonblank and all section/fieldset/dl widths have no horizontal excess.
After resizing to1440, drawer toolbar disappears, sidebar260px/inert=false and
main1179px return; inspected after the200ms transition. Evidence captures below.

TASK-020 settings navigation is ready for session1 integration. Underlying
pending pages and other product-task acceptance are not implied by this result.

## Integration Contract For Session 1

Shared baseline was c5a1738; session 1 ownership commit 3265748 has been
fast-forwarded into this branch. Current owned changes: Settings.tsx and tests,
ProjectNavigatorPanels.tsx and tests, new settings-domain catalogue and pending
panel. No API/IPC contracts, routes, models, dependencies or lockfile changed.

Minimal remaining request: AppLayout owns the existing narrow drawer, currently
enabled only by projectWorkspace. Add a globalSettings prop and pass
routeIsSettings && !projectWorkspace from App.tsx; include the selected global
tab in the navigation key so selecting a page closes the drawer. Session 1
must designate the App.tsx writer; AppLayout is already assigned to session 2.
Do not apply projectWorkspace globally because that also changes sidebar widths,
styles, and unrelated production views.

## Implemented

Official three groups / 16 official entries in reference order, plus existing
advanced local API/Codex/instruction links. Missing capabilities identify their
task and actual pending development/integration state. TASK-010 stays under
review and links to existing working panels. Long sidebar scrolls independently
of footer. Existing project settings remain separate.

## Actual Checks

- Official isolated desktop: PID50812 at launch, CDP9243, virtual desktop
  MediaGoParitySession2. Storage page confirms this worktree's
  .cache/parity/s2-settings-official/official-workspace. Settings and browser
  pages actually clicked. Browser page is built-in search engine settings,
  not OS default browser selection. No login/install/payment/generation/cleanup.
- Development: freshly built server, config/workspace entirely under
  .cache/parity/s2-settings, backend31452/frontend31453, CDP9241. Twenty actual
  sidebar clicks reached the corresponding page, including all existing panels.
- Light preference changed via real selector and survived Page.reload.
- Desktop1440x960 light/dark screenshot inspection: no overlap.
- Narrow390x700 screenshot: FAIL, fixed global sidebar squeezes page. Short
  sidebar scroll is available, but this does not satisfy narrow acceptance.
- Vitest: 2 files / 42 tests pass. Workspace lint and production build pass.
  Build retains existing chunk size warning. Full format initially failed on
  680 CRLF checkout files; LF-only normalization made full format pass. The
  unchanged files were restored to checkout CRLF afterward, with no content
  diff. Changed six files independently pass oxfmt. No bulk format committed.
- Initial bare pnpm8 install failed; corepack pnpm11.9 frozen install succeeded
  without lockfile changes. Background Vite Start-Process was automatically
  rejected (blocked by policy); direct foreground Vite succeeded.

## Evidence

Runtime logs, check-navigation.py/check-layout.py and captures remain under
.cache/parity/s2-settings/. The selected durable PNGs are in this task's evidence
directory. Captures are browser content, not full native windows.

## Next

Resolve the global shell contract and repeat narrow/short/return validation.
Continue independent TASK-090 desktop capabilities meanwhile. Later TASK-060/062
must coordinate backend shared document files; project new windows wait for181.
No production workflow or whole-product acceptance is claimed here.
