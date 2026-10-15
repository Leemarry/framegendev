# Minimal design

ProjectSettings calls the existing shared/desktop openNativePath directly. Keep openProjectDirectory unchanged because it also serves the disabled Jianying settings feature, outside this task's scope. Existing per-page error toast, loading flag and path guard remain.

openNativePath explicitly rejects a missing bridge method before invoking it, so older hosts cannot silently succeed. No IPC contract change, backend change or migration. Tests cover the page's actual project path, native failure/retry and missing capability. Real acceptance uses a new nested fixture project in the already isolated s2-settings workspace, never an existing folder.
