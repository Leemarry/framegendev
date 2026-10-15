# TASK-041 Implementation Plan

Goal: edit and synchronize subtitles/actual audio, inspect real PCM waveforms,
save/reopen and export matching native tracks. Spec: design.md. React19,
TypeScript, native browser media/WebAudio, existing Go jianyingdraft package.
Inline execution and reviewed local commit per DEC-029; isolated fixtures only.

- [x] Add optional audioUrl in sample.ts/model/workspace.go; nle-editing helpers
  append/remove clips and recompute duration, tests cover immutable history shape.
- [x] Caption inspector text/start/end and delete; audio insertion in bin into
  voice/music with per-track start/source/duration/volume/speed editing.
- [x] Share media gain lifecycle; synchronized audio/caption rendering; disable
  underlying player while modal open; actual fetch/decode/peak canvas waveform.
- [x] Native Draft.AddAudioContext/AddCaptionsContext, FFProbeReader.ProbeAudio,
  copied media plus text/audio native tracks; service resolves same local assets.
- [x] Unit regressions for text Unicode/timing, audio bounds/zero volume/multi-track,
  real peaks vs silence, error handling; package race and episode tests.
- [x] Actual browser insert/edit/delete/undo/save/error/play/seek/reload/restart,
  exported JSON/copied audio/ranges checks, desktop light/dark390px screenshots.
- [x] Frontend lint/format/build; Windows backend full check/build and package
  tidy/format/vet/race; record limits, journal and explicit local commit.
