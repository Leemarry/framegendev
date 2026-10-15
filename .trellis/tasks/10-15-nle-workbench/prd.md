# TASK-040 剪辑工作台

## Goal

REQ-013: full-screen NLE, editing, persistence, preview and draft export

## Requirements

- Source: user request 2026-10-15, REQ-013/014/036; attachments provide reference evidence.
- M1 official-style full-screen bins, selection, inspector and truthful media states.
- M2 frame-aligned parameters, undo/redo, explicit save, failure recovery and reopen persistence.
- M3 actual preview and Jianying draft agree within one 30fps frame; real local artifacts.
- Then TASK-041 synchronized editable captions/audio and decoded real waveforms.
- Isolated `.cache/parity/s2-nle` on 31438/31439. No production data, external generation or TASK-010/042 implementation.

## Acceptance Criteria

- [ ] Each milestone independently passes functional, interaction and visual acceptance and is committed before the next.
- [ ] Integration verifies saved edits survive restart and export matches preview.

## Notes

- TASK-030 aggregate is incomplete; its accepted list/upload/metadata APIs suffice for NLE.
