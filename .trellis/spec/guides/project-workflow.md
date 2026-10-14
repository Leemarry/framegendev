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
material ambiguity. Default execution is inline with auto-commit disabled:
do not stage/commit/push or spawn parallel agents without explicit instruction.
Skill workflow suggestions cannot override user instructions.

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
or irreversible actions. The next default is TASK-030 metadata/API verification
and its first independent deliverable, before project UI and global scope.

Read current source before relying on GAP history. Comment submission, project/
archive/trash tabs, Ctrl/Cmd+K search and Xiaoyunque catalog already exist.
Reuse and verify. Commercial pages keep official structures and working local
capabilities; external services remain pending integration without fake success.

Record visuals, interactions and functionality separately. Official captures
are 1600 x 1136 full windows. Uncaptured menus/dialogs and unseen business
behavior need further evidence. Confirm isolated workspace paths before running.

Handoff records changed files, actual checks, failures/unrun checks, gaps and
next steps. Archive completed tasks with `--no-commit`; record uncommitted
sessions with `--commit "-" --no-commit`.

Product intent clarified on 2026-10-14 (REQ-032~037, DEC-024): preserve official
visual style while optimizing automated production and local canvas corrections.
Proposal: `docs/superpowers/specs/2026-10-14-automation-workbench-design.md`.
This is not an implemented contract or approval of TASK-010. Inspect and reuse
existing generation batch and ReactFlow canvas before proposing replacements;
node layout in localStorage does not establish project-level persistence.
