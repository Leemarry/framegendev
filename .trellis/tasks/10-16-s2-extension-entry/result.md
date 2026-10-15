# TASK-110 Existing Entry Slice

2026-10-16. Accepted only the reuse entry slice. Whole110 remains incomplete.

Changes: settings-navigation.ts adds existingExtensionSettingsLinks and
PendingSettingsPanel consumes the same link rendering already used by model
settings. Three links use actual settings store destinations: codex-skills,
prompt-packs and instructions. No new API/state/schema/dependency. New tests are
not needed for a static link list; related51 existing tests passed. Lint zero
warnings, tsc/build passed, full691-file cache-only LF format check passed.

Actual browser-harness390px clicks reached Codex Global Skills, Skill Packs and
Agent Instructions. Each page had pageWidth390 and real existing service data.
Desktop screenshot retained. These clicks only open existing pages; no install,
prompt save, Agent invocation, authorization or external send was performed.
No new state needs persistence. Navigation/reload behavior is accepted in020.

## TASK-110/120/130 Audit

Screenshot92 pixels show Skills/MCP/Tools tabs, skills counts, rescan and filters.
Existing CodexSkillsPanel and /codex-skills API cover actual skill discovery;
/packs routes cover real local skill-pack CRUD/import/export. Existing /mcp is
the product's MCP server, not proof of an external MCP extension registry.
Generic extension installation/MCP/tool diagnostics remain pending interfaces.
Feishu screenshot93 has connection/app credentials/QR flow; no corresponding
settings route/desktop bridge found. Remain pending integration; no credentials
form that pretends to validate, no external sending.

TASK-120: reviewed screenshot90's actual engine installation directory, mirror
fallback and Runtime/ComfyUI/HyperFrames/PlaywrightMCP/transcription sources.
No matching installation/runtime management route or Electron IPC found in the
inspected routes/settings API/desktop host. Existing generation providers do not
establish local engine install/launch/stop or cloud instance ownership. Do not
claim an engine is uninstalled merely because the host protocol is absent. Need
an agreed runtime root, detector, lifecycle/progress and cancellation interface;
actual upgrade/install remains prohibited by this session's authorization.

TASK-130: screenshot95 is a six-pose animated preview with manual stepping,
autoplay and24/40/64px samples. This local preview is independent of global
Agent protocol; it must not be described as entirely blocked by TASK-010.
No existing Drami renderer/assets found in src/public; global sidebar remains
explicitly pending. A faithful3D preview needs the project's shared dependency/
asset decision before adding a rendering runtime (session1 owns dependencies).
Global context/session persistence still needs a separate real Agent contract.
No new avatar, animation demo or global Agent capability is claimed here.

An attempted batch official-page capture was rejected by automatic approval
review, reason only 'blocked by policy'. It did not run; no new official captures
for110/120/130 are claimed. The evidence used above is the actual provided PNGs
plus source inspection, separate from our actual development-page clicks.

Next independent local scope: Electron session cache getCacheSize is a real,
bounded read-only source for TASK-100 and does not need project document services.
Workspace classification, budget enforcement and deletion still require the
shared contracts recorded in s2-project-storage-contracts/result.md.
