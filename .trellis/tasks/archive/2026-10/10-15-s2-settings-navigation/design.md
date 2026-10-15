# Design

The current settings sidebar has two groups and silently falls back to basic
settings for unknown pages. Put the three official groups and known pending
page descriptions into a settings-domain catalogue consumed by both sidebar
and page resolution. Keep existing tab IDs/API panels and backend gating.
Keep API/Codex/instruction advanced local entries after the official entries.
The model entry explains TASK-010 review state and links to existing panels;
it does not implement the pending model consolidation design.

Pending pages display task IDs and concrete missing contracts, without fake
toggles or actions. Functional panels are added in subsequent independent items.
The sidebar navigation receives min-height/overflow rules while its footer stays
visible. No domain API or IPC interface changes. Rollback is reverting this
item's explicit files; no persisted data migration exists.

2026-10-16 narrow-shell continuation: session1 public contract31e4fa1 and its
CURRENT-HANDOFF assign App.tsx narrowly to session2. Pass globalSettings when
routeIsSettings && !projectWorkspace and include active global tab in navigation
key. AppLayout reuses existing drawer behavior for this flag. Use its existing
sidebarClassName prop for narrow absolute positioning, without shared CSS edits
or applying projectWorkspace styling/325px width to all settings. Desktop widths
and project-workspace behavior remain unchanged. Global settings show a compact
navigation toolbar only when their normal outer header is suppressed.
SettingsPanelButton marks data-sidebar-navigation-item so the existing drawer
can also close when the already selected page is clicked (no key change), without
closing on sidebar menu/dialog tool buttons. This is a local workspace-component
DOM contract, not a new shared store/event bus.
