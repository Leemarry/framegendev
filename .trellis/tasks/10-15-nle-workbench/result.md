# NLE Integration Status

TASK-040 M1/M2/M3 implemented and committed separately: `45fafa2`, `48ba31f`,
`cdc01a6`. TASK-041 implementation, actual audio/subtitle browser workflow and
file export are verified; see its archived result under
`../archive/2026-10/10-15-nle-audio-captions/result.md` after archive.

Combined acceptance: actual1.7+2.5s videos with source-in/speed/volume/transform,
two audio sources and two captions; synchronized playback/seek within one30fps
frame, real PCM waveforms, undo/redo/save failure retry/cancel, full episode and
document body/version equality across restart, matching actual export files.
Final frontend21 files/100 tests and full frontend/backend/draft package gates
pass. Child results record commands, evidence and failed attempts.

Aggregate remains **待验收**: native Jianying reopening/audio/text rendering and
subtitle typography need the intended desktop client, unavailable in inspected
installation roots. Do not archive/mark the parent complete based on browser and
JSON checks. Next NLE action: reopen isolated `m41-after-restart` draft in that
client and compare playback/text/audio; preserve failures and fix this item before
declaring compatibility. TASK-042/178 are not implemented by this work.

2026-10-16 session1 environment recheck: no Jianying/CapCut uninstall entry under
HKCU/HKLM (including WOW6432Node), matching Start Menu shortcut, PATH executable,
AppX package or running process. Common Program Files/LocalAppData roots and
D:/JianyingPro / E:/JianyingPro do not exist. No client was installed/launched;
native reopen remains unrun. Restore by providing the intended installed client,
then open only the existing isolated m41-after-restart draft. This read-only
environment audit does not replace native playback/text/audio acceptance.
