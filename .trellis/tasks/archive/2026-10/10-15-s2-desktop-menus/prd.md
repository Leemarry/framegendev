# TASK-090: Native desktop menu

REQ-020/045, independently accepted desktop shell slice. Build File/Edit/View/
Tools/Window/Help menus in the Electron host, keep OS-native close/quit/edit/
zoom/fullscreen behavior and connect settings/shortcuts/update entries to the
existing renderer panels. About shows actual application/Electron/Chrome versions.
Do not install updates or add project windows (TASK-181 dependency).

Acceptance: compile, relevant unit tests, frontend lint/format/build; isolated
desktop startup and actual settings navigation, dialog cancellation and restart.
No update, production login or external send is authorized. Whole TASK-090 is
not complete: appearance/browser preferences remain separate items.

Owned files: electron/src/main.ts, new application-menu.ts/test, ipc-contract,
preload, shared/desktop/types/actions/test, ProjectNavigator.tsx/test. No shared
router/model/backend/dependency changes. Existing settings return contract is reused.
