# Implementation

- [x] Add SQLite reproduction, run it against unchanged production code and retain failure (8 cases: foreign200; missing select500/deselect200).
- [x] Add shared pre-write validation and404 mapping; run selection/voice/manual fallback regressions (focused command passed).
- [x] Build isolated source server; actual HTTP failure/no-write, same/global adopt/unadopt, UI references and backend restart. Preserve document/history content and versions.
- [x] Full Windows quality checks/race, standalone build; frontend lint/format/build and relevant tests. Final full check passed after cancellation fix; main expanded235files1552tests passed.
- [x] Reconcile the pre-existing PromptPackEditor integration assertion with the committed inert contract; keep transition assertions and assert inactive layers are inert. Full235-file suite exposed this blocker; no sidebar product change or session2-tree edit. Focused52tests pass; b8fc186→a7e5827.
- [x] Review explicit paths, update result/spec and commit; integrate clean main, run production smoke and record actual state before archiving. 1e0099e→087932e; actual adopted-reference/removal, backend restart and390px passed.
