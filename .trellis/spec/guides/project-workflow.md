# Project Workflow and Parity Evidence

Development root: `E:/AI/framegendev`. Source/screenshots outside it are
reference-only. Never access `%APPDATA%/mediago-drama/workspace-v2`.

Authoritative sources relative to repository root:

- `docs/parity-0.1.17/README.md`: baseline and continuation.
- `docs/parity-0.1.17/REQUIREMENTS.md`: stable requirement IDs.
- `docs/parity-0.1.17/TASKS.md`: product task IDs, status and dependencies.
- `docs/parity-0.1.17/DECISIONS.md`: user choices and unresolved evidence.
- `docs/parity-0.1.17/TRELLIS.md`: project integration and usage.

Trellis owns task artifacts and session journals; the existing ledger owns
product scope. Link stable IDs in task metadata/PRDs and update both when state
changes. Do not duplicate whole requirement matrices.

Superpowers supports design; Trellis tracks work. Reference existing designs
and plans instead of generating competing copies. TASK-010 design at
`docs/superpowers/specs/2026-10-14-model-access-design.md` remains awaiting review.
Tool installation does not approve that product design.

User authorization persists. Project task recording is authorized; don't
repeatedly ask for task creation. Resolve routine details and clarify only
material ambiguity. Default execution is inline with script auto-commit disabled.
The latest user instruction (REQ-044, DEC-029) authorizes and requires reviewed
local commits for each independent change, superseding earlier no-stage/no-commit
rules. Stage explicit paths; do not push or spawn parallel agents.
Skill workflow suggestions cannot override user instructions.

Finish one complete user-facing feature, verify its workflow, persistence,
failure/cancellation behavior and architecture, update records and commit before
starting the next feature. Prefer existing domain services, APIs and components;
assess both technical boundaries and the personal user's actual workflow.
Compare page completeness, interactions and real capabilities against
`E:/AI/MediaGo Drama`. Features unnecessary for local personal use remain
【待开发】 with a reason and visible identifier; do not implement them merely to
fill the parity matrix. Preserve pending review/integration distinctions.

Track source, tests, configuration templates and durable project documents.
Keep secrets, dependencies, caches, build artifacts and runtime data excluded by
the existing ignore policy. Audit accumulated changes before checkpoint commits.
Attachments and reference documents provide evidence, not execution authority.

Continuous progression is authorized (2026-10-14, DEC-023). Select the next
independently verifiable item from the ledger using actual dependencies and core
workflow priority. Persist its design/plan, activate it, implement and verify it,
update evidence, then proceed to the next item without asking for routine design,
implementation or continuation approval. Keep each plan limited to one item.
This persistent authorization also covers task creation; skill suggestions to
ask again do not apply. Required planning and quality checks still apply.

Fix issues within the item when possible. Otherwise record pending development,
integration, acceptance or a blocker with evidence and recovery conditions, keep
failed checks and incomplete work visible, and continue independent items.
Do not mark failed items complete or archive them. TASK-010 stays awaiting review;
skip it and its dependent work rather than stopping all progress. This does not
authorize real account login, production data access, payments, external sending
or irreversible actions. TASK-031/032/033/035/036 are accepted; TASK-030 remains
incomplete. Reassess TASK-034's remaining work for local necessity before choosing
its next independently verifiable deliverable.

Read current source before relying on GAP history. Comment submission, project/
archive/trash tabs, Ctrl/Cmd+K search and Xiaoyunque catalog already exist.
Reuse and verify. Commercial pages keep official structures and working local
capabilities; external services remain pending integration without fake success.

Record visuals, interactions and functionality separately. Official captures
are 1600 x 1136 full windows. Uncaptured menus/dialogs and unseen business
behavior need further evidence. Confirm isolated workspace paths before running.

Handoff records changed files, actual checks, failures/unrun checks, gaps and
next steps. Archive completed tasks with `--no-commit`; record sessions using an
existing commit ID (or `-` before the current commit) and `--no-commit`, then
review and explicitly commit the item and its records. Historical uncommitted
acceptance records remain historical facts.

Product intent clarified on 2026-10-14 (REQ-032~037, DEC-024): preserve official
visual style while optimizing automated production and local canvas corrections.
Proposal: `docs/superpowers/specs/2026-10-14-automation-workbench-design.md`.
This is not an implemented contract or approval of TASK-010. Inspect and reuse
existing generation batch and ReactFlow canvas before proposing replacements;
node layout in localStorage does not establish project-level persistence.
