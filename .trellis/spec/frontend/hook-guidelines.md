# Hook Guidelines

Use existing React/SWR/Zustand integrations. Prefix hooks with `use`; put
feature-specific hooks in their domain and pure requests in domain API modules.

Actual pattern from `AgentModelProfilesPanel.tsx`:

```tsx
const { data, mutate, isLoading } = useSWR(agentModelProfilesKey, getAgentModelProfiles);
```

Fetchers in `domains/settings/api/settings.ts` call `@/shared/lib/http`.
Its `get<T>()` returns an `ApiResponse<T>` envelope; domain fetchers return
`response.data`. Follow existing route/cache keys and mutate affected keys
after successful writes. `CodexAccessPanel.tsx` uses `useSWRConfig` for shared invalidation.

Clean up polling, streams, listeners and timers; handle stale responses.
Native NLE media graphs must survive React StrictMode effect reconnection: a media
element can have only one MediaElementSourceNode, even after its context closes.
Reuse the graph for the same element and defer final cleanup across reconnection.
Browser codec support is runtime-specific; decode errors remain visible and test
H.264 playback in a codec-capable runtime rather than relying on a poster.
Login cancellation must stop polling and preserve truthful status.
Do not call hooks conditionally, issue requests in render, or duplicate Axios
authentication/error handling.

## Markdown Load Contract

`MarkdownHybridEditor` must not emit `onChange` for loading, cached reopening,
comment decorations or template lock imprinting. Its shared schema disables
StarterKit `trailingNode`: the schema default is `sectionMediaPreview`, so the
extension otherwise appends an empty media node during initialization.
Lock imprint transactions use `preventUpdate: true`; real body edits still emit.
Do not trim stored Markdown to hide initialization writes. Regression cases in
`MarkdownHybridEditor.test.tsx` cover Chinese, whitespace/entities, headings,
lists, images/tables, external synchronization, locks and actual edits.
