# Native project windows

Dependency baseline d62b69f merges accepted main33eaff9 including TASK-181 and070. Only conflict resolutions were owned s2 index/action tests preserving the newer local folder tests. No manual document-core edits. Existing document recovery uses a window-specific sessionStorage ID; no cloned sessionStorage opener is introduced.

Owned IPC open-project-window accepts only a project ID, not a URL/path; main authorizes sender, validates bounded nonempty ID, encodes URLSearchParams and loads the fixed /projects route using existing loadRendererRoute. Renderer checks existing active-project list at action time. Missing projects fail before opening; a race after validation displays the existing missing-project page, never creates a project.

Refactor existing workspace-window creation to keep a local window reference and a Set of workspace windows. mainWindow remains the fallback; when it closes, another live workspace becomes fallback. Each window has existing sandbox/context isolation/navigation restrictions. New windows remain hidden until renderer loads; failure destroys only that new window. Single-instance app/one sidecar lifecycle remains. Native file dialogs use event.sender's window; menu commands/About use focused workspace (fallback main); update events broadcast to live workspace windows. Prompt-pack editor behavior stays separate.

Projects card and context menus share the same new-window action. A request loading flag blocks duplicates and error toast allows retry. No browser popup fallback because it cannot establish native lifecycle parity. New-window action does not mutate current selected project or navigate source. No new dependencies/shared model/router/styles or document-core changes.

Rollback removes this feature commit; project data has no migration. No actual login, update install, Agent/generation or external sending in validation.
