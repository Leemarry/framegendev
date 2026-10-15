# TASK-041 subtitles audio and real waveforms

## Goal

REQ-014: edit and synchronize subtitles/audio, decode real waveforms and export native tracks

## Requirements

- REQ-014: add/edit/remove caption text/start/end with undo and synchronized preview.
- Insert actual local audio into voice/music; edit timing/source-in/speed/volume, remove and undo.
- Real decoded PCM waveforms, loading and failure states; no fabricated signal.
- Persist/reload/restart, matching native audio/text tracks and copied audio.
- Reuse manual episode storage/history/player/native package; no asset API changes.
- Out of scope: ASR/TTS, AI proposals, advanced subtitle styling, MP4 renderer, image/freeze and paid services.

## Acceptance Criteria

- [x] Browser actual audio with silence/signal: editing/play/seek/caption boundaries and decoded waveform.
- [x] Cancel/error/undo/save retry, refresh/restart; real export agrees within one30fps frame.
- [x] Frontend/backend/package full gates pass; native editor compatibility separately pending if unavailable.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
