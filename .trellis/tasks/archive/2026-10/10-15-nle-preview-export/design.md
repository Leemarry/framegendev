# Preview And Jianying Export

Use the browser's native media engine for the full edited timeline: a domain player owns playback/scrub time, selects source by absolute clip range, maps target time to sourceIn+(time-start)*speed, and applies the same normalized transform/opacity/volume. Paused seeks retain frame precision. Missing media remains visible and playback errors are explicit. Reuse this player for manual episodes in the existing preview; legacy server concatenation remains for unedited episodes.

Extend the existing Jianying Shot with optional speed, target start/duration, volume and transform. Existing video-only callers keep original defaults. Export service supplies explicit frame-aligned source/target ranges for edited episodes, validates real source bounds, fails if any required video is missing and retains legacy skip semantics only for old episodes. Existing package owns native JSON, media copying and atomic directory export.

NLE export dialog explicitly names destination root and draft, defaults to configured settings, copy media on, replace off. Disable export for dirty/failed-unsaved drafts. Cancellation before submit writes nothing; actual export response exposes only real artifact result. No native MP4 export or AI proposal invented. The old server preview endpoint must reject edited episodes rather than return incorrect concatenation.

Files: episode player/workbench/view/media helper and tests, Jianying package and service/handler error mapping. No asset API changes or new dependencies. TASK-041 later extends the same player/package to captions and audio tracks.

Acceptance: synthetic 30fps sources with audio/no audio; real browser play/seek across clips and nonblank screenshot, API export parsed back from actual files, exact source/target timeranges and parameters; source-bound failure, conflict and cancel; full frontend/backend/package checks. Native Jianying reopening is verified only if its desktop runtime is available, otherwise explicitly pending acceptance.
