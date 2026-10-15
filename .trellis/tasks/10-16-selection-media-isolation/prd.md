# TASK-030 direct media source project isolation

REQ-012/044/045: adopting a media-library item must respect the destination project, whether supplied by mediaAssetId, a local content URL, or an existing history task. Reject missing/foreign media before changing selected rows, replacing resources or mirroring history. Same-project and projectless global media remain reusable, including missing-task direct fallback and built-in voice previews.

Acceptance: reproduce the current foreign direct-media behavior with SQLite; table regression covers select/deselect, ID/URL, missing/foreign/same/global assets and task-derived media, with complete selection/task non-write assertions. Exercise actual isolated HTTP and material reference UI, cancel/unadopt and backend restart; compare original documents/history. Run Windows full check/race/build and existing frontend lint/format/build. Keep failures and unrun checks visible.

No schema, route, dependency, provider or production-data changes. Overall TASK-030/080/150 and native Jianying acceptance remain open. Files belong to session1; session2 files and instances stay under its ownership.
