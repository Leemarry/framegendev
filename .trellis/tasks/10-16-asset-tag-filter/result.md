# Dedicated Tag Filter

## Source

Official screenshot59 exposes a dedicated tag input. Existing full-text search
also matched filename/note, so it could not replace that control. Add the page
popover input through the existing shared filter function/mediaAsset.tags. Trim
query boundaries, compare case-insensitive substrings of tags only, and intersect
existing filters. Empty query means all; no-tag/selected-only records do not match
nonempty queries. Local filter text resets on scope/open/reload; saved metadata
persists. No backend/API/dependency or dialog layout changes.

Initial two targeted tests failed on missing input and unfiltered results. First
post-implementation page test used the wrong existing empty-state wording; fixed
the assertion to the unchanged actual text. Final3files48tests, lint/full708-file
canonical format/build/Electron compile pass. Existing large-chunk/helper shell
deprecation warnings retained. First task create missed required description and
first planning patch failed atomically; retried before any product edit/start.

Source project-3e2328ebc45125d5 / asset-85c41f8d6ccf0d9f: actual metadata editor
saved Night scene and tag-only plus note. Dedicated uppercase/space query selects
only this asset; missing query yields zero, clearing restores two, Escape returns
focus and reopening retains current text. Blocked list refresh hides all old
cards; retry restores filtered result.390x480 input/popover fit; page and actual
backend restart reset filter text while saved tags still filter correctly.
Complete media/documents/body/version/history/import tasks and actual file hash
match post-save snapshots. No provider request. Evidence under source
.cache/parity/task-030-tag-filter/. One piped script failed Unicode encoding before
execution, and its premature saved-tag check failed; no baseline was captured.
ASCII-escaped script completed actual save, then captured a fresh snapshot.

## Integration

Pending clean-main production workflow and restart acceptance. Browsing scope,
usage state and remaining detail parity stay open;030/080/150 overall incomplete.
