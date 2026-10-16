# Global Source Filter

The visible source Select was ignored globally by a projectMode conditional.
Apply the existing filter in both scopes. Global mode retains physical-media-only
queries and does not request project adoptions; selected-only truthfully has no
matches. This does not implement official upload/generated provenance groups.
No backend, schema/API, dependency or write-path changes.

The first regression run failed on missing jsdom scrollIntoView because the new
test was outside the existing Select polyfill group. Moving it into that group
produced the meaningful pre-fix failure: global.png remained after selecting
selected-only. After the one-line fix, source 3 files / 52 tests pass, including
no adoption request or metadata write. Lint, full 708-file canonical format,
build and Electron compile pass. Existing chunk-size/helper shell warnings stay.

Actual source global library: physical 1 -> selected 0 -> media 1; blocked read
hides cached actions/assets, retry restores 1; clearing to all restores 1. At
390x480 controls work and reload restores default/all with one asset. Initial
AX empty-heading lookup ran during Select dismissal and failed; DOM evidence
and screenshot confirmed the correct empty state. Added transition wait; full
flow passes. Both page and backend reopen checks pass. Complete global media
records and actual hash plus protected nested folders/media/documents/full body/
versions/history/import tasks/four hashes and saved tag fixture records/hash
remain identical. Screenshots/cache: .cache/parity/task-030-global-source/.

Source9cc101c integrated as mainb514f6b. Main 3 files / 52 tests, lint, full708
canonical format/build/Electron compile and embedded Windows build pass. Actual
main production controls repeat 1 -> selected0 -> media1, blocked0/retry1,
clear1, 390x480 and page/backend restart. First restart probe's fixed0.7s wait
was premature; waiting for the actual card passes, with original failure kept.
Complete global media/hash and protected nested/tag fixtures pass after restart;
the independent confirmed adoption fixture also retains full documents/history/
tasks/selection/resolved episode/media hash. Main31456 runs
mediago-server-global-source.exe; cache/screenshots use the same task path in main.

Reuse accepted dimensions-backend Windows check/race/build on unchanged backend.
No full-suite rerun claim beyond prior main b6aa54e 237 files / 1591 tests.
Native Edge process restart remains unverified; this tests page/backend restart
through owned parity-s1-local browser. Session2 still 617a80d.
Next independent item is TASK150 local production combination acceptance through
existing document/import/adoption/NLE/export functionality. External generation,
Agent and native Jianying remain pending; favorite/trash/usage/details and the
media-list200 pagination ceiling remain open.
