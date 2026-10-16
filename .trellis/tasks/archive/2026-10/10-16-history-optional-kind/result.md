# Named History Optional Kind

GET task history documents kind as optional. The named-conversation resolver
defaulted absent kind to image and raised a kind mismatch for video/audio/text;
the list handler then mapped all errors to500. In the named-conversation list
branch only, absent kind now uses recorded kind. Explicit mismatched/unsupported
kind wraps ErrInvalidGenerationTaskQuery and both existing list handlers return400.
Real repository errors retain safe500. No response shape, interface, schema,
dependency, generation or save-path change; legacy unnamed scope/default behavior
and project/batch precedence remain. Those combined-filter semantics stay open.

Pre-fix SQLite regression failed for video/audio/text; four-kind named reads now
pass, including whitespace omission, explicit kind, sibling isolation, rejected
kind/scope filters and complete task/conversation preservation. Handler tests cover
wrapped400 versus safe500 on both routes, including no database-detail exposure.
Source focused backend tests pass; full native Windows canonical check exits0
(tidy/fmt/vet/lint/build/Swagger/full race, generation140.325s), independent native
build exits0. Source frontend3files/78tests, lint/full708canonical format/build/
Electron compile pass. Original bytes restored by existing canonical helper;
dependency/other-session files remain unchanged. Build chunk/plugin-time and
helper shell warnings remain.

Actual independent source project project-7b10b804b5676037 contains one real local
uploaded video and two named video histories, each with one media-library task;
no provider request. Source and main old binaries both reproduce missing-kind500,
explicit-image500, explicit-video200. Updated source: both GET route variants
without kind equal explicit-video200 and retain exactly one respective task;
mismatched/unsupported kinds400. Browser actual two-session switching, loaded local
video, failed-read hides video0/retry1, refresh1 and backend restart pass. Complete
conversations/tasks/media/documents/selection and actual video hash stay identical;
protected global/nested/tag/201-file fixture records/full bodies/versions/histories/
hashes also pass. Cache/scripts: .cache/parity/task-080-optional-kind/.

390x480 refresh remains reachable and page has no outer overflow, but screenshot
shows the toolbox navigation sidebar consuming most width and squeezing video/
provider notice. This is an observed layout gap owned with navigation, NOT mobile
layout acceptance. Source Vite also reported four ResizeObserver undelivered-loop
notifications during viewport transitions; retained, not dismissed as console-clean.
No product layout fix is claimed by this backend item.

Fixture setup concurrently uploading the same input hit Windows exclusive sharing
in main after creating its project. That existing empty owned project was verified
and resumed through a recorded checkpoint with per-cache input copy; no project
was deleted, duplicated or baseline replaced. Main project is
project-d2618eb3cd1ac197. Corrected source c6e58f5 is integrated in main9eec53e.
Main focused race passes (generation25.886s, handlers11.889s); frontend3files/
78tests, lint/full708canonical format/build/Electron and embedded native build
pass. Main31456 now runs mediago-server-optional-kind.exe against its isolated
configuration. Actual main browser two-session switching, optional200/equal
explicit-video, mismatched400, failed-read video0/retry1, narrow refresh reachability
and page reload pass. Repeated after actual backend stop/start: all pass again.
Complete conversations/tasks/media/documents/selection and actual video hash are
identical to the original snapshot. Protected global/nested/tag records/hashes,
201physical records/all201content hashes and the complete production fixture's
two full documents/versions/both histories/tasks/adoption/resolved chapters and
uploaded/exported hashes also pass before and after restart. Durable main desktop
and narrow screenshots are in evidence/; the narrow screenshot records the layout
failure described above, not a mobile acceptance pass. Session2 remains617a80d.
Native browser process/剪映 reopen, real provider generation and overall080/150
remain incomplete. Independent Edge9240 launch was policy-rejected previously;
page/backend reopen is a separate check. Session2 remains617a80d.
