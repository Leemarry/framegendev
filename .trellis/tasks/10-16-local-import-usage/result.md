# TASK-080 Local Import Usage

## Contract And Scope

Real local imports were counted as provider calls: source global7/project1,
main global4/project3, tokens0. The internal provider is media-library; there
was no provider generation request. BillingRepository now excludes that provider
before aggregation. Completed import history remains intact. Actual successful
zero-token provider calls still count, including potentially per-call image/video
pricing. No migration, billing service/UI, API, dependency or session2 edit.

## Source Verification

- Real SQLite regression failed before the fix in four cases. Repository and
  billing service packages pass after the fix. Global/project/kind/date cases
  retain actual zero-token provider calls and all three underlying task records.
- All four API groupings/global/project and type/date filters return zero usage,
  empty rows/series/currencies for the existing import-only runtime data.
- Actual settings usage page: four grouping clicks,7-day range,1440x900 and
  390x680 show zero calls/tokens. Actual global generation-history drawer retains
  LOCAL IMPORT ONLY prompt and real imported image. No provider request sent.
- Existing fixture checks confirm full documents, immutable history snapshot,
  every document history and complete local-import session/project tasks are
  unchanged after own backend restart and page reload.
- Blocking summary requests shows the actual read error. Unblocking and reentering
  usage recovers. Existing billing UI still shows zero cards/empty detail alongside
  errors, has no explicit retry, and its mobile header truncates; these are session2
  UI follow-ups, not changed or accepted as fixed by this repository item.

## Failures And Evidence

Initial Windows check failed fmt on505 existing CRLF Go checkouts. A cache-only
helper temporarily normalizes those tracked files, runs the unchanged Windows
quality script, and restores/verifies every original byte in finally. The first
normalized run passed fmt/vet but could not fetch the pinned golangci tool due
to proxy.golang.org connection timeout. Retried with GOPROXY=goproxy.cn,direct,
keeping default sum.golang.org checksum verification enabled. That full run passed
every package except four prompt goldens. Log comparison established all four
got/want strings are identical after newline normalization (6678characters each).
The wrapper now also normalizes the tracked golden and embedded instruction/skill
Markdown inputs for the unchanged checks, restoring their exact original bytes.
This is canonical Git content, not regenerated goldens or relaxed comparisons.
The complete canonical-input Windows check, including unchanged full race tests,
passed (exit0). Exact original-byte restoration also passed. Independent Windows
go build ./... passed. No tidy/module/dependency changes remain.
Do not treat the temporary normalized worktree as product modifications.

One combined task/cache/API command was automatically blocked by policy; decomposed
commands succeeded. A browser assertion after reload failed because settings resets
to the existing default Basic section; actual navigation back to Usage passed.
An immediate combobox lookup after closing history failed during dialog teardown;
the next AX inspection and actual clicks passed without product changes.

Temporary logs, before-summary JSON and actual screenshots are in
`.cache/parity/task-080-usage/`. Frontend code has not changed since accepted
history-scope-acceptance (103files711tests, lint/full708format/build/Electron).
TASK-080 provider generation/media-editor history, native Jianying and TASK-150
overall remain unaccepted. Session2 remains617a80d.

## Integration

Pending clean main cherry-pick, full Windows gate/build and actual production
page/API/backend-restart acceptance. Do not archive until those checks pass.
