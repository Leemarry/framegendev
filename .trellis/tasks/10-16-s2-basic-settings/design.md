# Design

The existing AppearancePanel in pages/Settings.tsx renders a theme Select and
directory row. Extract that exact responsibility into settings/components/
BasicSettingsPanel.tsx and consume the existing theme store and projects SWR API.
Settings.tsx only swaps the component and removes now-private imports/helpers.
No new API, store, dependency, shared style or route contract is necessary.

The existing project helper reveals a path in its parent. A workspace directory
Open command instead calls the existing openNativePath bridge, which reports
native shell errors. The panel catches them, shows the error, and allows retry.
SWR read errors get an inline retry action. No copy of workspace data is stored.

Theme previews use existing palette CSS variables, including light/dark primitive
tokens, inside inert miniature layouts. Native radios supply keyboard behavior.
The page width is constrained to48rem; choices use auto-fit grid tracks so even
a standalone narrow panel works. The unresolved global narrow shell belongs to
TASK-020 and must not be claimed fixed by this panel.

Language/analytics/diagnostic capabilities lack implementations. Disabled controls
with pending text preserve official structure without writing fake preferences.
No network analytics, language changes, debug service configuration, editor or
document behavior is introduced. Keep existing advanced settings entries visible.
