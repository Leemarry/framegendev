# Design

Official isolated storyboard created and documentMode=document -> timeline clicked
(doc-1792085688751-sqtaimz1has). Two header modes; timeline hides comment/resource
actions and exposes existing NLE. Existing local WritingWorkspace only renders
WritingEditor; EpisodeTimelineView is reachable from overview instead.

WritingWorkspace owns the new segmented mode toolbar and uses current URL search
directly, preserving route state and other parameters. Keep WritingEditor mounted
while hidden to preserve transient editor state and avoid serialization on every
switch. Only matching loaded storyboard documents allow timeline; dirty/conflicted
documents must remain in body until safely saved/reviewed. Pause timeline on leave.

Reuse EpisodeTimelineView with a read-only entry contract: remove its unnecessary
automatic workbenchDraft document write (resolved backend already derives from
content and does not require this marker). Existing overview conversion remains
at its explicit caller. Add loading/error/retry before presenting timeline/NLE;
guard task reconciliation until a matching resolved response exists. This avoids
showing previous/sample episode while a new document is loading or fails.

Owned: documents/components/WritingWorkspace + tests, episode/components/
EpisodeTimelineView + tests. Optional document header action visibility adjustment
only if actual UI needs it. Do not change session2 workbench-route helpers, App,
navigation or shared models/dependencies. No backend source or new data store.
