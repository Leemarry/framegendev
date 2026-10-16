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

Source acceptance complete; main integration/production validation pending.
Reuse accepted dimensions-backend Windows check/race/build on unchanged backend.
No full-suite rerun claim beyond prior main b6aa54e 237 files / 1591 tests.
Native Edge process restart remains unverified; this tests page/backend restart
through owned parity-s1-local browser. Session2 still 617a80d.
