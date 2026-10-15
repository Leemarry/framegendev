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
