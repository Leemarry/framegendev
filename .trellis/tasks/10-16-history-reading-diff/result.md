# TASK-070 Readable Historical Differences

## Observed Scope

Actual isolated official0.1.17 reading mode retains plain-text line numbers,
parallel/unified layouts and change navigation, using a normal font and highlighted
changes. Evidence: `.cache/parity/task-070-selector/official-reading.png`. The
paragraph-addition fixture does not establish word-level diff or Markdown reading
transformations; these remain unverified.

Reuse the server diff, existing alignment/change-anchor helpers and shared Select.
Reading/source presentation changes typography and line highlighting only. Exact
text stays React-escaped; full immutable snapshot reading is now labeled 全文阅读.
No backend/API, dependency, shared primitive or session2 source changed. Existing
identity, dirty/revalidation/error and frozen restore-version guards remain.

## Source Acceptance

- Real reading/source switches kept old0300cdd/currentf9a500b and reviewed v2.
  Computed fonts were MILan normal sans and SF Mono. Parallel/unified and next
  change navigation reached2/2; switching presentation kept selection/navigation.
- 390px screenshot inspected; body width390 and sheet width390.4 reflect existing
  sheet border rounding, with no page overflow. Source desktop screenshot inspected.
- Offline Refresh hid stale diff and disabled restore. Online explicit Refresh
  recovered reading and selected hashes. Cancel, page reload and actual own backend
  restart retained complete documents/body/version, history and immutable snapshot;
  existing fixture.ps1 Check passed after restart. No document writes performed.
- Focused4files15tests and affected48files280tests passed. Source lint, full708-file
  format and build passed. Build retained existing chunk-size/plugin timing warnings.

## Failures Retained

Before implementation2tests failed for missing presentation. Subsequent runs had
3failures from whitespace normalization/split sign assertions, then1from matching
the sidebar's old label. Exact normalizer and scoped region assertions corrected
the tests; final checks passed without weakening text/anchor/restore assertions.

Format checking briefly blanked Vite; one readyState evaluation timed out and a
history-control click failed. Explicit cache-bypassing page reload recovered;
complete-record check remained equal. One rg wildcard path command failed on
Windows and was replaced with explicit paths. These are not counted as passes.

Main390x480 screenshot exposed only one visible diff line because the duplicate
version sidebar consumed144px. On narrow viewports below601px height, hide only
that sidebar and let the existing version dropdown retain every selection action.
This is a bounded responsive correction; actual new screenshots/checks follow.

## Integration

Pending serial main cherry-pick, combined checks, embedded build and real smoke.
Only this bounded presentation item can be accepted; TASK-070/150 remain incomplete.
