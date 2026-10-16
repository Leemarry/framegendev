# Implementation

1. Add the persisted domain/service/API field and metadata validation/update
   path; preserve legacy AutoMigrate behavior.
2. Add repository/service/handler tests for legacy defaults, favorite-only
   updates, explicit clearing, restart persistence, and wrong-scope rejection.
3. Add the asset-library filter and preview star control using existing SWR
   mutation/error patterns; add component and pure-filter tests.
4. Run targeted Go tests, workspace lint, TypeScript build-check, targeted
   frontend tests, and changed-file formatting.
5. Update TASK-030 ledger/result and session journal; keep the parent parity
   task and TASK-100 in progress until their separate acceptance gates pass.
