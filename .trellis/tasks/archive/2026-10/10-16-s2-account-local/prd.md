# TASK-140 account structure and local capabilities

## Goal

Official guest account and membership sections with honest pending commercial states and working local usage navigation.

## Requirements

- REQ-025/TASK-140 independent local guest-account page, matching official
  screenshot81 and isolated guest state (no real login).
- Preserve identity and membership/credit sections; explain local project limits
  independently from unconnected commercial entitlements. Disable commercial
  login, refresh, recharge and membership actions with visible pending reasons.
- Provide a working entry to existing local usage statistics without fetching
  credentials or simulating commercial account data.

## Acceptance Criteria

- [x] Guest/local page structure, light/dark and700px layouts checked.
- [x] Local usage command opens existing BillingPanel; refresh returns truthful
      local state and no commercial requests.
- [x] Relevant settings/navigation tests and lint/format/build checked.
- [x]390px accepted after TASK-020 shell fix; no whole140 completion.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
