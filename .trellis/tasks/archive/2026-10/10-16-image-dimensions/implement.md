# Plan

1. Add real-encoded image import/backfill/failure regression tests; observe failure.
2. Read header dimensions and generalize existing metadata backfill dispatch;
   preserve video policy. Add asset-detail row and focused rendering tests.
3. Run focused tests, frontend lint/full canonical format/build, Windows backend
   check (includes race) and explicit build. Verify source real local import,
   failed read handling, page/restart persistence with full records/hash checks.
4. Commit explicit owned paths, cherry-pick into clean main, build embedded app
   and repeat production detail/reload/restart checks. Record/archive only on pass.
