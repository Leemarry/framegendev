# Execution

- [x] Add fixed-route ID parser/test and trusted IPC/preload/action types.
- [x] Make existing workspace windows independent; route menus/dialogs to correct window and broadcast updater state.
- [x] Add native-only card/context action, active-project validation and failure/retry tests.
- [x] Compile Electron, run focused tests and frontend lint/format/build. Build/restart own accepted backend so TASK-181 is active in this fixture.
- [x] Exercise independent windows, source unchanged, reload, same-project conflict guard, close-one-window and 390px themes; record results.
- [ ] Resolve session1-owned orphaned conflict recovery after full app restart, then repeat acceptance. See result.md; implementation is not accepted/archived.
