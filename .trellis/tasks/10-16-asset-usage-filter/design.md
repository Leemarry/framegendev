# Material Usage Projection

Existing physical media API has no usage metadata; adopted resources alone cannot
prove a file unused. Existing normalized tables retain task outputs/input refs,
project selections/reference entries. Document service already parses images via
Goldmark and implements media's DocumentAssetReferenceSource. Reuse these sources.

Add optional includeUsage boolean to both existing media list routes. Default
List and its responses remain unchanged. With usage, service calls List then one
repository aggregate query for visible media and scans document references once
per relevant project, never once per file. Repository uses EXISTS per indexed
relation, explicit project predicates and live-selection deletion guard; domain
struct contains asset ID and three flags. No schema/model migration.
Local media-library import input IDs are lineage, excluded from reference usage;
their real retained output rows still participate in candidate/selected status.
Service merges parsed document usages and attaches an optional usage object to each physical
asset. Missing document reader or reader/DB error fails the request, never unused.
Context cancellation checked across query/scanning. Empty list skips expensive work.

Frontend includes usage-enabled flag in the existing SWR media key only while a
usage filter is active; refresh and mutation use the same bound key. Keep original
key and request when all. Existing aggregate loading/error state hides old actions.
Pure client filter matches selected/candidate/reference flags, or all-false unused;
missing projection cannot match any specific status. Unmatched adoption-only items
remain selected from actual adoption rows. Page popup adds selector; local state
resets on open/scope changes. No persisted filter preferences or additional store.

Ownership: media service/store and new usage.go/tests, media handler, domain
media_usage.go, repository media_usage.go/tests; frontend api/media.ts,
lib/asset-library.ts/test, components/AssetLibraryButton.tsx and page test.
Public files are session1-owned. Rollback independent commit; optional field and
query require no migration, old clients and default responses retain behavior.
List remains O(N), scanning once per relevant project; no large-library claim.
