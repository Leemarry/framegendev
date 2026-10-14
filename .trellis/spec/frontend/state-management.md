# State Management

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
