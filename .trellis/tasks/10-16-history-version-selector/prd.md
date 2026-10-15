# TASK-070 synchronized history version selection

## Goal

Match the official historical-version dropdown and sidebar selection, with current comparison fixed and no invented swap action.

## Requirements

- TASK-070/REQ-018/045: add the official historical-version dropdown using the same selectedHash as the existing sidebar. Compare the selected snapshot to current history; selection must update diff/reading/source and the explicit restore target together.
- The official left/right arrow is a plain SVG comparison indicator, not a swap button. Correct prior inferred swap gaps in the active ledger. No arbitrary two-version comparison feature.
- Preserve full document body/version/history, frozen restore base and dirty/error guards. Do not add requests or state outside the existing history API/SWR lifecycle.

## Acceptance Criteria

- [ ] Real official dropdown choice updates the sidebar/diff; decorative arrow evidence retained.
- [ ] Dropdown/sidebar changes stay synchronized across current and older snapshots, failed/retried reads and reload. Selection alone never writes; cancel and actual restart retain full records.
- [ ] Current/empty/loading/failed history states disable unsafe actions; restore uses the selected hash and original reviewedVersion. Related regression tests and full frontend gates pass, main embedded build and real smoke pass.

## Notes

- Files: DocumentHistoryPanel.tsx/test and relevant spec, own task records. Existing Select/ArrowLeftRight imported unchanged; no shared component/backend/session2 edits. Own cache .cache/parity/task-070-selector/.
