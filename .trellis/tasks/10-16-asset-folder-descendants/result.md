# Include Descendant Folders

## Official Evidence

Fresh official desktop WinSta0/MediaGoParityS1Filters, CDP9242, PID18720 at launch,
profile/workspace under source .cache/parity/task-030-filter-official/. Storage
page actually confirms isolated workspace, official app at127.0.0.1:48273. Actual
filter clicks show browse options: directory/all/favorite/trash; usage options:
all/selected/candidate/reference/unused. Tag control is an input with datalist
(AX combobox), not an enum-only select. Checkbox actual toggle checked succeeds.
Empty official workspace does not prove nonempty nested-file behavior. Screenshots
in evidence/; no login/provider/Agent/payment action. These options are evidence,
not implementation authorization for unrelated features.

## Source

Reuse scoped folders and cycle-safe libraryFolderPath to include current folder
and descendants on explicit checkbox. Direct folder behavior remains default;
foreign scope guard and immediate folder navigation retained. Reset view state
on open/scope change. No backend/API/dependency/new storage changes.

Nested page test failed first on absent checkbox; final3files50tests pass. Root,
child/grandchild/sibling and foreign-scope guards covered. Source lint/full708-file
canonical format/build/Electron compile pass; existing build/helper warnings stay.
Short viewport first exposed popup top=-11px; local max available height, scrolling
and16px collision padding fix places it inside viewport. Actual scroll reaches
the last tag field. No shared component changed.

Project-11136be18e49d11f contains actual parent/child/deep/sibling folders and four
real PNG files. Source actual parent1 -> checkbox3 -> child2 -> root5 (four project
files plus existing global file) -> unchecked root1. Folder read failure hides
cached actions, retry restores3.390x480 checkbox/scroll and actual page/backend
restart pass; local checkbox resets, then correctly shows3. Complete folder/media,
documents/body/version/history/import tasks and four actual image hashes unchanged.
Evidence: source .cache/parity/task-030-descendants/.

During screenshot retry the shared default browser daemon had switched to an
unrelated local OTA test tab; Page.reload hit that tab before AX lookup failed.
No controls/writes there. Do not count that attempt as parity acceptance. Switched
to independent BU_NAME=parity-s1-local with a new owned local target, then repeated
the screenshot/restart checks. No other tab/profile/instance was closed. Official
daemon is separately named parity-s1-filter-official.

## Integration

Pending clean-main production acceptance. Browsing modes, favorite/trash, usage
state, remaining details and overall030/080/150 stay incomplete.
