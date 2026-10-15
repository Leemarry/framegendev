# TASK-090 native-menu result

2026-10-16. Independent native-menu slice accepted on Windows. **Whole TASK-090
remains incomplete**: official basic settings, built-in browser preferences and
runtime update capabilities still need their own implementation/acceptance.

## Change And Interface

- Electron: application-menu.ts/test plus main.ts builds six native menus.
  Existing Electron roles implement close/quit, native editing, reload/zoom/
  fullscreen and window management. Existing close guards remain in control.
- IPC: adds one-way desktop:menu-command carrying settings|shortcuts|updates;
  ipc-contract validates values at preload. MediagoDesktopAPI adds onMenuCommand
  returning an unsubscribe function; actions provides optional bridge fallback.
- ProjectNavigator subscribes through its existing lifecycle and opens the real
  settings tabs. Native menu switching inside settings preserves the original
  return target instead of nesting a return-to-settings loop.
- About uses Electron's actual app.getVersion and process.versions. In this
  unpackaged test that is the Electron development host42.4.1, not official
  MediaGo0.1.17 and not an invented release version.
- No backend, shared route/model/component, dependency or lock changes.

## Actual Acceptance

- Fresh Electron compilation and frontend production build passed; lint passed.
- Related tests initially3files/17tests; expanded security/runtime/return suite
  6files/39tests passed. No test replaces the native workflow below.
- Full format passed after temporary checkout CRLF->LF normalization. Original
  checkout endings were restored from the exact saved path list afterward;
  no unrelated source content changes or bulk formatting are in the diff.
- Native development instance used MediaGoParityS2Development desktop, separate
  .cache/parity/s2-desktop-dev/official-profile and APPDATA/LOCALAPPDATA. Initial
  PID53668/CDP9245; real restart PID44868 with the same own profile. Backend31452
  used .cache/parity/s2-settings/server.yaml/workspace; frontend31453 had both
  VITE_API_PROXY_TARGET and VITE_MEDIAGO_SERVER_PORT pointing at31452.
- Native mouse messages opened Tools, clicked Software settings, then reopened
  Tools and clicked Shortcuts. Browser-harness verified the real page headings;
  browser click Return went to project management. Help -> Updates reached the
  existing update capability page without checking/downloading/installing.
- Help -> About opened a true native dialog. Complete dialog screenshot shows
  versions; Windows IDOK confirmed dismissal, then window enumeration verified
  its absence. No project files were changed by these operations.
- Complete1600x1136 native window and popup/dialog captures are in evidence/.
  Browser content capture is separately named native-settings-page.png.
  Restart capture verified nonblank content and all six top-level menus.

## Failed Attempts And Limits

- Native startup initially failed because the new worktree lacked Electron's
  development binary; dependency install.js supplied42.4.1 in this worktree.
  This did not perform product/runtime upgrade or installation in user data.
- Initial native renderer lacked VITE_MEDIAGO_SERVER_PORT and showed API load
  failure. Restarting our Vite with31452 fixed it. No fallback endpoint is used
  by the accepted run.
- CDP key dispatch did not activate native accelerators; UIAutomation from a
  different desktop failed. Native check helpers were launched inside our own
  desktop; mouse messages and PrintWindow then worked. Failed helper output is
  retained under .cache/parity/s2-settings/. No current-desktop takeover occurred.
- Screenshots07-14 incompletely expose official submenus; only top-level order
  and observed File behavior are confirmed. Useful native editing/zoom commands
  are retained improvements, not a claim of pixel-exact unknown submenu parity.
- macOS and packaged updater installation were not run. No updates, login,
  generation, external send, project new-window or storage deletion occurred.

## Next

Return to TASK-020 narrow-shell contract once App.tsx ownership is coordinated;
continue TASK-090 basic settings independently. TASK-060/062 import/export must
preserve documents/media references and coordinate shared backend state files.
