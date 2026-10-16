# Image Dimensions Acceptance

## Source

TASK030 imports now inspect local image headers with the existing standard-library
PNG/JPEG/GIF decoders and persist existing width/height/status fields. Listing
backfills missing local image dimensions using the existing attempt guard. Derived
image backfill preserves updatedAt; video behavior is unchanged. Details display
positive finite dimensions for images/videos. No API/schema/dependency change or
media byte rewrite. WebP/other unregistered formats remain without dimensions.

Encoded import/backfill tests failed first, then passed for PNG/JPEG/GIF, corrupt
content, persisted metadata, unchanged bytes/identity/hash/timestamp and repeated
listing. Frontend3files46tests, lint, full708-file canonical LF format, build and
Electron compile pass. Windows canonical check (tidy/fmt/vet/lint/build/full race)
and separate build pass. First check failed reaching proxy.golang.org; retry using
goproxy.cn passed. Original failed log retained. Canonical helpers restore original
tracked CRLF bytes. Existing large-chunk/jsdom warnings remain.

Dedicated source project-c72aa63ab80e17b6 uses real480x640 uploaded image
asset-68f009bfbc2b8184. Older image asset-b0b867434dbc600a also backfilled480x640
without changing its timestamp. Actual corrupt file upload asset-c56e7ee1e0cd165f
stores failed metadata and no dimensions; upload/listing still work. Blocked list
refresh hides old details; unblocking/retry restores dimensions. Actual390CSS
detail scroll and page/backend restart retain the visible size. Complete project
documents/body/version/history/import tasks, complete media records and both real
file hashes match saved snapshots after restart. Prior history/scope/media-editor
fixtures also pass. Evidence: .cache/parity/task-030-dimensions/ including source
screenshots and windows-check[-retry].log. Existing top breadcrumb overflow and
corrupt-file preview placeholder are not counted as repaired by this item.

## Integration

Source80d63f6 cherry-picked cleanly as main8dc674f. Main3files32tests, lint,
full708-file canonical format, build, Electron compile, media package race,
separate go build ./... and embedded workspace_dist Windows build pass. Source
full backend gates apply to identical integrated backend changes; no semantic
conflict occurred. Main31456 runs mediago-server-dimensions.exe.

Dedicated main project-aa47c8ddc69d1cc1 imported real480x640 image
asset-72ad4791a58936b2; actual UI uploaded corrupt asset-2476ec7895e36361 without
dimensions. Real detail/failure-hidden/retry-restored/page reload/backend restart
and390CSS detail pass. Complete project documents/body/version/history/tasks,
complete media records and both actual file hashes remain identical after restart.
Protected main history/scope/media-editor and confirmed adoption baselines pass.
Evidence: main .cache/parity/task-030-dimensions/. New-tab initial AX inspection
ran before async loading and returned no buttons; subsequent AX lookup waited
for the actual control. No failed business request was treated as successful.

TASK030/080/150 overall remain incomplete; this does not cover external generation,
Agent503 or native Jianying reopen. Session2 remains617a80d.
