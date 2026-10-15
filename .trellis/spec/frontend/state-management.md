# State Management

## Document Conflict Contract (TASK-181)

Document PATCH uses the last server-confirmed version. A409 pauses autosave;
dirty SSE/refetch/Agent streaming cannot replace local text or advance its base.
Recognize the exact in-flight save echo, scoped to project/document. An explicit
merge uses the version displayed to the user and may receive another409.
Per-window/project recovery restores dirty drafts as paused conflicts, including
documents deleted remotely. Reload-server first archives local JSON. Local
recovery depends on the retained browser profile/storage; expose storage errors.
Fresh window IDs discover other-window dirty drafts read-only within the project.
Keep each source key/document separate, exclude backups and malformed records,
and never delete or overwrite the source when previewing, downloading or staging.
Explicit staging re-reads the server and checks project/dirty state again after
the await, then persists a current-window dirty paused conflict (server may be
null for a deleted document). Staging itself must not send a save. A retained
profile restart, actual JSON download, cancellation, failure/retry and complete
body/version/history comparisons are required beyond component tests.
Never count unchanged visible text as persistence proof: compare complete body,
version and retained history after reload and backend restart. Legacy complete
workspace mutations supply expectedVersions for all loaded document IDs; service
checks the full ID/version map under its existing lock before replacement.

## Comment Operations (TASK-050)

Failed apply/undo writes retain the latest local body/comments and operation log,
restore the known base version and pause through existing conflict recovery.
Never replace later typing/another document with a stale workspace rollback.
Captured project guards make late failures after navigation a no-op.
Comment-triggered Agent dispatch carries explicit project/document/open comments;
validate loaded context. Remote termination alone never resolves a comment.
Use explicit document resolution operations or manual resolution. Any local test
runtime inference must use captured identity and unchanged submitted comment body.

## Document History Restore (TASK-070)

Freeze the reviewed document version when opening history. Compare the selected
Git snapshot against the explicit current history hash; omitting `from` compares
the selected commit to its parent instead. Restore sends `expectedVersion` as a
positive query integer through the existing atomic document PATCH contract.
Dirty/conflicted documents cannot restore; check again inside confirmation.
Refresh/revalidation must finish before enabling restore. A409 preserves the
document/history and requires a page refresh plus explicit review, without
advancing the original base automatically. Close confirmation after a failed
request so the panel error is visible. A successful restore creates a new version,
keeps previous history, and restores empty tags as well as body/title/category.
Legacy callers omitting the optional version remain compatible and unprotected.

Historical full reading/source previews use the existing diff response's immutable
snapshots, not the live document store. Reading uses the existing document schema
with editable=false and no onUpdate/save/editor-registry integration; source shows
the exact escaped Markdown, preserving whitespace. Key preview instances by
project/document/hash and verify response identity. Hide cached content during
revalidation/failure and disable restore/navigation until reads recover. Switching
views never changes the selected restore target or frozen reviewed version.
Full snapshot reading is distinct from official diff-highlighted reading.
The history dropdown and sidebar share selectedHash; current comparison stays
fixed to the latest history hash. Disable selection on history load/revalidation
failure. Display exact Git hash identity instead of inferring document version
numbers from the capped history list. Official ArrowLeftRight is a decorative
comparison indicator, not a version-swap command (actual0.1.17 DOM inspection).

NLE manual edits live in local immutable history until explicit episode PUT succeeds.
Failed writes retain the draft; discard requires confirmation. Saved episodes use
optional `editVersion: 1`; backend resolved reads preserve the complete manual
timeline, while legacy episodes still rebuild from Markdown and merge adopted media.
Generation reconciliation must not overwrite a manual edit or an open NLE draft.
Use 30fps frame-aligned seconds; clip edit volume/opacity zero are valid values.

## NLE Audio And Caption Contract

Storyboard resource summaries use URL resourcePanel=open in the documents domain;
preserve all other query parameters and route state. Keep WritingEditor mounted
across open/close; resources and comments are mutually exclusive. Reuse the
resolved-episode read, checking project/document and available documentUpdatedAt.
Hide cached groups during revalidation/failure or dirty/conflicted drafts, expose
retry, and revalidate after saved document updatedAt changes. Use existing H2
section detection before showing groups: the episode API's generic Markdown
fallback is useful for timeline previews but is not an authored storyboard group.
Panel visibility and reads must never save documents or episodes.

Storyboard document view uses URL `documentMode=document|timeline`, preserving
project/document/query and route state. Keep the writing editor mounted while
hidden; disable timeline for dirty/conflicted drafts. Merely opening a timeline
must not PATCH a workbenchDraft marker: resolved episode reads derive from the
document. Match response project/document before displaying controls; loading,
revalidation and failure hide stale/sample controls and expose retry. Revalidate
after document updatedAt changes and pause playback on timeline unmount.

### Scope

TASK-041 extends the existing manual episode PUT/resolved-read contract; no new
asset API or parallel persistence store. Browser/file acceptance does not prove
native Jianying desktop reopening or subtitle typography compatibility.

### Signatures

`TimelineClip.audioUrl?: string` matches Go `TimelineClipRecord.AudioURL`.
`addNLEClip(episode, type, clip)` and `removeNLEClip(episode, id)` return immutable
episodes. Native `Draft.AddAudioContext(ctx, []Audio)` and
`AddCaptionsContext(ctx, []Caption)` validate before appending.

### Contracts

Caption content/start/end and voice/music source/timing/sourceIn/speed/volume
travel UI history -> episode PUT -> resolved read -> export. Timeline seconds
align to 30fps; native timeranges use microseconds. Source duration equals target
duration times speed. Audio sources resolve through existing local media IDs and
project ownership; native export probes actual audio and optionally copies it.
Overlapping audio is allocated separate native lanes. Text ranges use UTF-16.
Only actual media and video/caption clips extend timeline duration; planned music
placeholders do not. Default new caption timing must fit the edited duration even
when selection is a legacy planned asset beyond its end.

### Validation And Errors

| Condition | Behavior |
| --- | --- |
| Empty caption / over 2000 characters / invalid timing | Reject edit or save |
| Ready audio without a source | Reject save/export |
| Source missing, wrong media kind, another project's media or range overflow | Reject export; no success artifact |
| Save failure or cancel close | Retain draft until explicit discard |
| Waveform fetch/decode fails or file exceeds 64MB | Visible error; no fabricated waveform |

### Cases

Good: source1s, speed1.5, target2.5s exports a3.75s audio source range.
Base: silent PCM has zero peaks. Bad: treating a planned voice/music clip as audio
because it has a label, or using illustrative waveform bars as real signal.

### Required Checks

Episode tests cover immutable edits/history and failed save recovery. Draft tests
cover audio range/zero volume/copied media, Unicode text, cancellation and overlap
lanes. Browser acceptance uses actual audio/video, decoded canvas pixels,
caption boundaries, paused source mapping within one frame, error/retry, complete
episode and document body/version equality across reload/restart. Verify
StrictMode media source reuse and context cleanup; do not double-connect an
HTMLMediaElement. Underlying preview unmounts while the NLE dialog is open.

### Wrong And Correct

Wrong: infer audio duration from the timeline or fake sample values when the
asset API omits it. Correct: read native audio metadata before insertion and
probe the actual source again at export; decode PCM for the waveform.

Use React local state for temporary forms/dialogs, SWR for server-owned data,
existing Zustand stores for shared UI preferences, and backend persistence for
durable project/document state. Compute derived values rather than storing copies.

`shared/stores/theme.ts` combines Zustand `create`, `persist`,
`createJSONStorage` and `immer`, validates restored values and persists only
the versioned mode. Consume selectors:

```tsx
const mode = useThemeStore((state) => state.mode);
const setMode = useThemeStore((state) => state.setMode);
```

Preserve versioning/fallback behavior when changing persisted UI state. Mutate
SWR caches after successful writes; do not create another authoritative account
or provider store. Never put credentials into a new UI store or infer configured
status from mocks, button clicks or stale optimistic state.

Project settings tabs are URL-owned: `resolveProjectSettingsTab(search)` accepts
project-skills/project-feishu/project-files/project-general, defaulting to skills
for missing/unknown values. Selecting a tab replaces the URL and preserves route
state. The shared settings store remains the source for global settings tabs.

Settings entry saves `{ settingsReturn: { path, state } }` in route state.
`resolveSettingsReturn(state, projectId, lastDocumentId)` returns that internal
path and view state; invalid/missing records fall back to the project's last
document, overview sentinel, or root for global settings. Do not use history.length
to guess return targets. Tests cover internal-path validation, unknown state,
document/overview/root fallback; browser checks cover refresh and nested returns.

The project generation-history navigation variant filters existing global
conversation data by `projectGenerationConversation(projectId, kind).conversationId`
and passes projectId/historyScopeId/projectHistory to the existing workspace.
Global history variants keep their original behavior. Project skill packs reflect
the real global API; without a project-scoped contract, do not show working project
toggles. Read-only global status and explicit pending integration are required.

AssetLibrary owns folderId in URL and folders in scope-keyed SWR. Folder navigation
preserves projectId and route state; settings returns preserve the exact folder URL.
After create/rename, update the same cache from the saved response before entering
the new folder. Missing folders show an error and disable uploads until root/retry.
Current-directory upload sends multipart folderId in one request. Physical media
patches share updateMediaAssetFields; moves use the actual owner and preserve file
identity. Project-visible global/selected-only items remain root-compatible; global
media cannot move into project folders. Dialog presentation keeps existing behavior.

Global navigation uses /assets?scope=all, with optional projectId for the selected
project. Scope changes remove folderId and retain route return state; no projectId
means global, not an error. Global folders always have a live scope-keyed SWR key.
Root navigation uses a Link and icon entries preserve the old dialog. Return from
scope navigation falls back to root project management. Scope UI uses real active
projects, a desktop list and a narrow Select; caches remain keyed by actual scope.
