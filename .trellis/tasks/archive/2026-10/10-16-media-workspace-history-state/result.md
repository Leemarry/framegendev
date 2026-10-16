# TASK-080 Independent Media History Read State

## Implementation And Boundary

MediaGenerationWorkspace now consumes the existing task SWR loading, revalidation,
error and bound mutator. Unavailable reads unmount history lists and their action
targets/reference history, without clearing cached tasks or the prompt editor.
Do not emit a zero count or reconcile adopted assets while the read is unavailable.
Refresh does not claim successful synchronization merely because mutate resolves.
Only this generation component/test and task/spec records change. No backend,
API, shared model, dependency, navigation, billing or session2 change.

## Source Verification

- Focused53 tests pass, including initial loading, revalidation and error recovery
  with a real editable input, unchanged draft, same mutator and no false zero count.
- Generation domain and DocumentSectionGenerator/EpisodeVideoGenerationDialog:
  53 files400 tests pass. Lint, full708-file format with canonical Git LF, build
  and Electron compile pass. Existing large-chunk warning retained.
- Dedicated project-ad04d5ec80879c9d/doc-s1-media-history contains a real local
  image import, media-library provider, actual480px-wide readable media. This
  fixture is separate from prior protected document/history/import fixtures.
  No provider generation or Agent request was sent.
- Actual block menu -> generate image opens the independent section workspace.
  Cached image/action targets disappear on blocked task reads. Repeated retry
  remains failed; editing the prompt while failed works. Unblock/refresh restores
  the image and preserves the exact unsaved prompt. A real3-second delayed read
  disables refresh and removes cached entries. Screenshots under the task cache.
- Close/reload/reopen restores the real imported image and the document-derived
  prompt; canceled unsaved prompt is not written to the document. A355CSS-pixel
  narrow screenshot has no page overflow; existing modal header title truncation
  remains visible. A separate390CSS short-screen run was not completed.
- Actual own backend stop/start plus API checks preserve complete new fixture
  documents/history/tasks and old history/immutable snapshot/import baselines.
  Browser reopening after this restart had intermittent block-menu targeting;
  main production acceptance remains pending below.

## Failures And Limits

- Initial test expansion rendered every real prompt editor in a mock input panel,
  causing2 existing presentation assertions to fail. Restricted the mock to the
  explicit input regression fixture; final53 pass.
- Direct full format failed665 existing CRLF files. Existing cache-only canonical
  LF checker passed708 files and restored original bytes; no broad formatting.
- Vite reloaded during temporary LF checking. Reload and browser foregrounding
  recovered the page. Early mouse/screenshot commands timed out; one screenshot
  failed before its cache directory existed. Chinese pipeline code encoding was
  corrected with escaped Python strings. Block-handle scrolling/hover targeting
  remained intermittent; retain these failed attempts.
- Hidden background service launch was rejected by automatic approval review:
  blocked by policy. Conventional foreground dev services run31450/31451.
  The dedicated Edge9240 profile restart remains unverified; browser-harness used
  a new local test tab only and did not operate existing unrelated tabs.
- Existing Agent/runtime and bundled account503 errors remain outside this item.
  Native Jianying reopen, external generation/adoption, TASK080/150 overall and
  session2 native window acceptance remain incomplete.

## Main Integration

Source28cbee2 -> main346f4f7. Main lint, canonical full708-file format, build,
Electron compile,53files400tests and workspace_dist Windows binary build pass.
No backend source changed; the full Windows check/race/build accepted for the
preceding local-import-usage item remains applicable to unchanged backend code.

Main31456 runs mediago-server-media-history.exe in the existing isolated
s1-integration workspace. Dedicated main project0812814f7443622f has a real local
image import bound to doc-s1-media-history/section_s1_media_history. Actual
cached-read blocking, repeated retry, recovery, exact prompt preservation,
close/cancel and390CSS-pixel short-screen checks pass. Existing title truncation
is visible; no page overflow. Actual main backend stop/start followed by page
reload and reopening restores the real image and original document-derived
prompt. Complete new fixture and prior documents/versions/history/immutable
snapshot/task records remain unchanged.

CDP mousemove/screenshot timeouts and hover disappearance also occurred on main.
The final reopening used normal DOM hover/click on the existing block-menu
button, then an AX-coordinate click on generate-image; no React/store internals
or artificial generation data. Main screenshots are in its own task cache.
Independent history read state is accepted; TASK080/150 overall remain open.
