# Parameter Editing And Persistence

`EpisodeNLEWorkbench` keeps an immutable local episode history until explicit save. Parent data is untouched on failed saves/discard. A domain `nle-editing.ts` owns frame rounding (30fps), range validation, ripple video timing and default edit values. `EpisodeNLEInspector` owns labeled numeric forms; submit creates one undo transaction.

Add optional `editVersion: 1` on Episode and `edit` on clips: sourceIn, speed, volume, position in normalized canvas coordinates, scale, rotation and opacity. Existing payloads omit these fields and retain original behavior. Manual saves preserve the entire edited episode in the existing JSON timeline table (no migration). Resolved reads prefer the persisted episode when editVersion=1, avoiding silent reconstruction from Markdown. Generation reconciliation skips manual edits. No asset API/schema changes.

Validate edited timelines at the existing document service save boundary: finite/ranged values, positive frame-aligned durations, unique IDs and no video overlap. UI validates against real known asset duration; export will probe sources in M3. Defaults are explicit; volume/opacity zero remain valid. Keep unchanged legacy tests.

Scope files: episode lib/components + existing view; additive service model fields and document episode read/write service/tests. Rollback remove UI entry; legacy records unaffected. M3 must honor all exposed edit parameters before TASK-040 completion.
