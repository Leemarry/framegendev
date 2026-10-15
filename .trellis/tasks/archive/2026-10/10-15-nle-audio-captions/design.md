# Design

Add audioUrl to TimelineClip and Go persistence type. Domain helpers add/remove
captions/audio and recompute duration through existing immutable history.
Caption inspector edits text/start/end; audio uses existing inspector with
timeline start, source-in, duration/speed/volume. Video ripple stays video-only.
Legacy draft placeholders never become playable audio. Reuse existing media API.

Player uses video time as timeline clock, progresses through audio-only/gaps,
renders active captions and synchronizes separate audio elements by target time.
Reuse StrictMode-safe media gain lifecycle for audio/video. Underlying preview
unmounts while NLE is open. Audio waveforms fetch actual bytes, decode with browser
AudioContext, compute multichannel peaks for actual trimmed source range and paint
canvas. Abort stale fetches/close contexts;64MB limit reports an error.

Draft library adds timed captions/audio, reuses normalization/copying/speed refs;
FFProbeReader adds real audio duration probing via same binary resolution. Native
text stores UTF-16 range and plain bottom-center style. Validate required audio
and text instead of silently dropping them. Native desktop reopen/typography
acceptance stays pending when no runtime exists. No new dependencies.

Failures retain local edits, cancel before export writes nothing and conflicts
keep old files. Rollback independent commit, optional fields preserve legacy data.
