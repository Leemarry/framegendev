# Execution

- [x] Add fixed-route ID parser/test and trusted IPC/preload/action types.
- [x] Make existing workspace windows independent; route menus/dialogs to correct window and broadcast updater state.
- [x] Add native-only card/context action, active-project validation and failure/retry tests.
- [x] Compile Electron, run focused tests and frontend lint/format/build. Build/restart own accepted backend so TASK-181 is active in this fixture.
- [x] Exercise independent windows, source unchanged, reload, same-project conflict guard, close-one-window and 390px themes; record results.
- [x] Merge fd1c71a including accepted TASK-181 prior-window discovery and lifecycle fix (ce27bde).
- [x] Repeat full native restart acceptance with multiple real drafts, preview/download/cancel/stage/read-failure-retry; compare original draft bytes and complete server documents/history.
- [x] Record acceptance and quality gates, commit, then integrate serially. No pending session1 interface.
