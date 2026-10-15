# Shell Design

Reuse Radix Dialog, lucide icons and semantic IDE tokens. `EpisodeNLEWorkbench` owns temporary bin/query/inspector state. `EpisodeTimelineView` supplies the episode, project assets and selection callback, and pauses playback on open. No new dependency, backend, schema or persistence.

Use a header, three-column media/preview/inspector area and lower multi-track timeline. On narrow screens use vertically scrolling bands. Missing media has truthful empty/error states. Escape and close restore focus.

A modal preserves existing document/episode ownership; a replacement timeline would disturb the review flow and a new route would duplicate data loading. Rollback removes the entry and new files.
