# Existing History Read Lifecycle

Keep generationTasksQueryKey, filterGenerationTasksForScope and useGenerationMessages
unchanged. Add historyError/isLoadingHistory/isRefreshingHistory from the existing
task SWR call to useGenerationWorkspace's result. GenerationWorkspace renders a
compact refresh icon/status row; suppress its chat and history reference entries
during loading/revalidation/error. Never clear or rewrite the underlying cache or
local messages for a failed read. Bound mutateTasks refreshes the same SWR key and
no successful-read toast is emitted. Its SWR error state remains authoritative.

Ownership: only generation/hooks/useGenerationWorkspace.ts,
generation/components/GenerationWorkspace.tsx and its existing imageSpec test,
plus task/spec/evidence. No GlobalToolboxDrawer or other session2 file is edited.
Use local import API with a unique canonical project-kind conversation and real
existing isolated image asset. Check exact complete records after actual lifecycle.
