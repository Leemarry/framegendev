# Execution

1. Add SQLite and client regression assertions; confirm missing usage behavior.
2. Add read-only repository projection, service document merge and thin optional
   list handler, preserving default List behavior. Add page selector and scoped
   SWR query; inspect every caller and errors.
3. Run focused regression, native Windows canonical check/full race and build;
   frontend tests/lint/canonical format/build/Electron. Preserve failures.
4. Own isolated local imports/adoption/document fixtures; no provider sends.
   Actual page status intersection/clear, read failure/retry, cancel, short/narrow
   popup, page/backend restart. Compare complete records/versions and file hashes.
5. Commit explicit source paths, clean-main cherry-pick, rebuild integrated app,
   run relevant checks and real UI/restart plus protected fixture comparisons.
6. Record source/main evidence, limits and ownership; archive only passing item,
   journal --no-commit and explicit acceptance commit; sync to source then next.

## Session2 acceptance correction

Native nonempty UI exposed refresh dropping includeUsage and populating the usage
SWR key with unprojected media. Change only AssetLibraryButton.tsx's explicit
refresh read and AssetLibrary.test.tsx's project/global regression. The regression
must return usage only when requested, matching the real API. Preserve existing
scan/error guards and default all reads; no backend/schema or filter semantics
change. Verify failure/retry in the same usage state, narrow themes, page/backend
restart and full fixture snapshots/hashes before integration.
