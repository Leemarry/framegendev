# Local Production Combination

Acceptance-only item on integrated mainb514f6b/cbd0595. Reused the existing
documents, local media/import history, section adoption, resource summary,
timeline, NLE, real native media/WebAudio and Jianying export. No product source,
dependency, API or backend change. TASK150 overall is still incomplete.

## Actual Main Workflow

Through the UI, created project2a3cf8e9a72b9217, screenplay
doc-1792123566077-8q9z6lyww9a and storyboarddoc-1792123605919-6b94rogu3yo.
Authored local studio scene/dialogue and H2 Local production shot with stable
section_181ddec920da7557. Final screenplayv3/storyboardv6 and both complete
histories were captured before NLE edits. Initial heading toolbar action did not
produce H2; inspected DOM then used actual focused toolbar click before capture.

Imported local-fixture.mp4 and local-voice.wav through the project library file
input. These are read-only copies of the prior synthetic NLE fixtures, not
provider-generated output. Videoasset-c0ad071055411592 is4s/640x360;
audioasset-14cd00d39e6fae42 has real WAV bytes. In the section video modal chose
the video from the library, joined history and adopted it. Persisted task
media-library-cf989134aa73e354 and selected-a2b9e33a5f04e3effbde5ca8 retain
correct project/document/section/media identity and sourceType=imported.
Resource summary and timeline navigation preserve document content.

NLE reads that adopted video. Edited video to1.7s, source-in.5s and speed1.5;
added real local WAV voice0-1.7s, source-in1s, volume.4 and caption
Local production acceptance0-1.7s. Blocked episode write exposes an error and
retains the unsaved draft. Normal retry saves. Complete documents/body/versions,
both histories, tasks, media and adoption records remain identical to pre-NLE.

Actual native playback passes after waiting for actual timeline advancement:
at.3666667s video1.060021s (expected1.05), audio1.368689s(expected1.366667),
both within1/30s. Caption visible,3627 colored video sample channels and decoded
real waveform are nonblank. Foreground testing used only the owned target's
DevTools focus emulation and real media clocks; reset that setting afterward.

Export cancellation creates no combined-canceled directory. Actual export at
E:/AI/framegendev/.cache/parity/task-150-combination/exports/combined-accepted
has duration1700000us, video/audio/text tracks, video source500000us/2550000us,
speed1.5, audio source1000000us/1700000us and volume.4, correct caption text.
Copied MP4/WAV hashes equal uploaded originals. Duplicate export reports the
existing draft conflict and preserves every original file. Native Jianying
reopening is not tested; its client is still absent.

Screenplay/storyboard round trip, page reload,390x480 NLE/export controls and
actual backend restart pass. Reopened NLE is saved/1.7s; local video history
remains checked. Complete documents and both histories, media/folders/tasks/
adoption/resolved episode, two uploaded media hashes and every exported file
hash remain identical to post-NLE snapshot. Source cache contains immutable
pre-nle.json/post-nle.json, check.ps1, browser helpers/play-export.py and screenshots.

## Checks And Limits

Current integrated full frontend suite passes237files/1595tests in331.35s.
Existing jsdom pause/scrollBy diagnostics retained. Latest source/main fix gates were52tests,
lint/full708-file canonical format/build/Electron compile and embedded Windows
build. Backend unchanged: reuse accepted dimensions-backend full Windows
check/race/build and prior NLE/draft package gates, not a fresh backend gate claim.

Failures retained: task start initially needed the inline --allow-empty-context
flag; fixed-delay playback probes sampled zero during startup/background
throttling; switched to waiting for actual requestAnimationFrame progression.
Independent Edge9240 restart was again rejected by automatic approval with
blocked by policy despite user authorization; no alternate launch attempted.
Browser process restart remains unverified. Page/backend restart is verified.
One title text probe ignored the editor's leading whitespace; trimmed DOM read
passes with stored body unchanged. One checked-history probe used the unchecked
label; actual checked label is cancel-selection and checked=true.

Diagnostic session-task read without kind returned500 (logged conversation-kind
mismatch); correct ?kind=video returns200 with the same local task. Error-status
classification is a remaining API limitation, not repaired in this acceptance.
Initial library return landed at project root without a captured route-state
baseline; later explicit storyboard/library/back test preserves the complete
documentId/documentMode route and state. Do not claim a navigation fix.

Agent runtime-config remains503 because codex-acp is absent. Account service503
and missing video provider are truthful. No Agent message, provider generation,
login/payment or external send occurred. Planned music/assets stay visibly
pending. Storyboard prose duration is not parsed into1.7s: NLE explicitly edits
it. Resource panel remains summary-only. Browser/native/client/service boundaries
and overall030/050/070/080/150 gaps remain open;042/170-178 not implemented.

Durable UI evidence is in this task's evidence directory: actual playback,
successful export,390x480 export and selected local history after backend restart.
Both source/main tasks are acceptance records for the same integrated build;
no claim of a second source-fixture run. Main31456 remains runnable. Session2
still617a80d; no new verified commit to integrate. Next independent item is
official source provenance grouping, now confirmed by actual isolated dropdown.
