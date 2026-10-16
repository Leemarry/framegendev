# Complete Visible Media List

The service passed a fixed200 cap to its only repository caller, but the existing
assets[] response has no cursor, total or partial marker. All client-side folder,
scope, type, source and search filters consequently missed older records. Remove
that cap and unused limit argument while preserving the same visibility query
and descending update order. No schema/API/frontend/dependency or write change.
Studio still sees global-only; projects retain global+own compatibility visibility.
Complete loading/backfill/rendering remains O(N); scalable pagination/virtualization
is not claimed and remains a potential large-library follow-up.

Pre-fix real SQLite regression failed: studio200 vs201, project200 vs402. The
regression seeds201global+201alpha+201foreign rows, verifies scope/order/oldest
search/repeat reads and byte-equivalent stored records. Source media/repository
tests pass. Existing frontend provenance tests63 cover unchanged frontend; source
lint/full708-file canonical format/build/Electron compile pass. Full native Windows
canonical check exits0 (tidy/fmt/vet/lint/build/test, including full go test -race
./...), and independent native go build ./... exits0. The helper restores original
CRLF bytes, including embedded instruction templates, after testing canonical LF;
no unrelated formatting or dependency changes are committed. Source67643ed is
integrated as maindff25bd. Main media/repository race tests pass (31.828s/44.505s),
lint/full708canonical format/build/Electron/embedded Windows build pass. Frontend
unchanged in this backend correction: retain63focused tests from preceding
provenance change, without claiming another full frontend-suite run.

Actual source independent project project-2612b0b0d6f329bd contains201real local
text files. Library refresh scans them; old binary listed200 and bulk-000.txt search
falsely returned0. Updated binary shows202including one global, text/local201,
oldest search1 and actual text preview, cancel-delete retains1, tag0/clear201,
failed read0/retry1,390x480 title/delete reachable, reload oldest1. Repeat after
backend restart passes. Complete201records/all201content hashes and protected
prior global/nested/tag documents/full bodies/versions/history/tasks/hash fixtures
remain identical. Main project project-ce1fd0479a9b27d2 also reproduced201scan/
200list/oldest0 on its previous binary. Corrected main repeats202total, text/local
201, actual oldest content preview, cancel-delete, tag intersection, failed0/retry1,
390x480 scrolling and page reload. After actual backend restart202/oldest1 remains;
complete201records/all201content hashes and protected global/nested/tag fixtures
pass. Combined production fixture retains both full documents/versions/both
histories/tasks/adoption/resolved chapters/uploaded and exported hashes. HTTP
kind=text&q=bulk-000.txt yields project1/studio0 in both environments. Source and
main durable UI screenshots are in evidence/. Main31456 runs
mediago-server-complete-list.exe; session2 still617a80d, no new verified commit.

Failures retained: initial task create lacked required description; corrected before
activation. One PRD patch used unsupported delete+add same path and another had a
template-text mismatch; both atomic failures changed nothing. First log path was
relative to the module rather than root and Tee-Object failed before testing;
correct absolute path produced the meaningful regression. UI search initially
used placeholder instead of actual aria-label; corrected. Repeated UI run exposed
Select dismissal timing with synthetic click. Actual AX coordinate option click
and waiting for listbox dismissal fixed the test mechanic; one DOM serialization
probe tried to return the element and failed object-reference depth, corrected to
boolean. Neither failure was a product save/list mutation; preserved fixtures pass.

Evidence/cache/scripts: .cache/parity/task-030-complete-list/. No external send,
provider generation or production workspace access. Browser process restart and
native Jianying remain unverified, and overall030/080/150 remains incomplete.
