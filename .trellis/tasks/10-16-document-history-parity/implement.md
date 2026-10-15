# TASK-070 history slice implementation

1. [x] Inspect official actual history controls and existing service/UI; persist scope and design.
2. [x] Add parallel alignment, mode/change controls, responsive history UI and explicit errors/retry/close.
3. [x] Connect restore expectedVersion, local dirty/conflict guard and stale-review recovery using existing CAS.
4. [x] Meaningful alignment/UI/backend tests; frontend gates and full Windows backend gates.
5. [x] Actual UI cancel/restore/conflict, history/body/version reload/restart and light/dark/narrow/short verification.
6. [ ] Record result, explicit local commit, main serial integration/checks; archive only accepted slice. Whole070 remains open for views/resources.
