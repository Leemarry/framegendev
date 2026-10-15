# M3 Result

Implemented native browser timeline playback/seek with source-in, speed, volume,
transform and opacity; explicit export root/name, copy media and no replacement.
Manual episodes reject the legacy server concatenation preview. Native draft
writer preserves precise source/target ranges and all edit parameters. Legacy
exports retain their previous defaults.

Validation (2026-10-15): episode 18 files/95 tests; frontend lint/format/build;
backend full Windows check (including full race suite) and explicit build;
jianyingdraft tidy/format/vet/full race all exit 0. Logs under
`.cache/parity/s2-nle/m3-*`. Regression coverage includes StrictMode media graph
reconnection, fractional edits, zero volume/opacity, invalid/non-finite edits,
source bounds, stale metadata rejection, conflict and cancelled export.

Actual browser-harness/Edge 155 on dedicated CDP9237: real H.264 synthetic
fixtures, 1.7 + 2.5 seconds, source-in .5 / speed1.5 / volume.35 / transform /
opacity.8, continuous playback across sources, paused 30-frame seek maps to
source2.0 within one frame; exported JSON exact timeranges and copied files;
cancel before submit, conflict failure preserves existing artifact. Desktop dark,
light and390px screenshots m3-playback/light/narrow/conflict inspected.

Initial browser failures retained: StrictMode duplicate MediaElementSource fixed
with graph reuse and regression; bundled Chromium lacks H.264 decoder, correctly
reports decode failure. Dedicated Edge initial CDP9226 collided with another
IPv4 instance: one read/reload reached that settings page, no submission;
switched to verified free9237 and isolated profile. No other processes stopped.

Native Jianying desktop not found in inspected installation roots; JSON/file
reopening is verified, native editor reopening remains pending acceptance.
Do not describe that compatibility as passed. TASK-040 code/browser milestone
complete, aggregate native compatibility pending. TASK-041 proceeds against the
implemented playback/export contract. TASK-042/178 excluded, GAP-004 unchanged.

Backend31438 PID32992 uses mediago-server-m3.exe with dedicated server.yaml /
workspace; web31439 remains; no production data/generation/payment operation.
