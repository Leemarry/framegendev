# TASK-080 exclude local imports from provider usage

REQ-019: actual project billing summary counts three successful media-library
imports as provider calls, despite no generation request. Keep imports in history
while excluding their internal source from provider usage and cost aggregation.

- [ ] Global/project/type/range summaries omit media-library imports; real
  successful zero-token provider calls still count (images may bill per call).
- [ ] Existing history/task/document/media records remain byte/content-identical
  across reads, page reload and own backend restart; no migration or deletion.
- [ ] Real isolated source/main APIs and existing usage page show zero provider
  calls for the import-only data; verify retained nonempty import history.
- [ ] Repository regression fails before fix, related checks and full Windows
  check/race/build pass; explicitly commit, integrate and record the bounded item.

Single-item design/plan: filter the existing BillingRepository.ListUsageBuckets
query by internal provider media-library, before grouping/costing. This owner is
already session1's shared repository boundary. Change only billing_repo.go,
billing_repo_test.go and own spec/task/evidence. No billing-service/UI/session2
edit, request/response/schema/dependency change, provider send or price invention.
Use existing real-import fixtures and capture their complete baseline; run both
actual APIs and browser page, including read failure/recovery/cancel where applicable.
