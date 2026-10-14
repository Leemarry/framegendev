# Frontend Guidelines

Scope: `apps/workspace`, React 19 / Vite / TypeScript. Inspect `apps/app`
separately if touched; its scaffolding differs from the workspace's domains.

| Guide                                         | Contents                              |
| --------------------------------------------- | ------------------------------------- |
| [Directory structure](directory-structure.md) | Actual domains/shared organization    |
| [Components](component-guidelines.md)         | Composition, tokens and accessibility |
| [Hooks](hook-guidelines.md)                   | SWR, HTTP and effect lifecycle        |
| [State](state-management.md)                  | Local, server and persisted UI state  |
| [Type safety](type-safety.md)                 | API envelopes and runtime boundaries  |
| [Quality](quality-guidelines.md)              | Checks and parity acceptance          |

Also read [project workflow](../guides/project-workflow.md).

## Pre-Development Checklist

Read directory and type-safety conventions, then components/hooks/state guides
relevant to the changed behavior. Check task artifacts, actual source and reference
states before editing; follow project isolation and pending review constraints.

## Quality Check

Follow [quality guidelines](quality-guidelines.md); record commands actually run
and separate visual, interaction and functional acceptance.
