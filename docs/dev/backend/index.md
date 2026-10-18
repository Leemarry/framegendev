# Backend Guidelines

Scope: `services/server` and related Go workspace modules.
Actual stack: Go 1.25, Gin, Gorm/SQLite, YAML config and slog logging.
Generic template Viper/Zap examples and paths differ; reuse verified code.

| Guide                                         | Contents                    |
| --------------------------------------------- | --------------------------- |
| [Directory structure](directory-structure.md) | Entry points and boundaries |
| [Database](database-guidelines.md)            | Repositories and migrations |
| [Errors](error-handling.md)                   | Envelopes and safe failures |
| [Logging](logging-guidelines.md)              | Existing slog platform      |
| [Codex runtime](codex-runtime.md)             | Codex agent backend setup   |
| [Quality](quality-guidelines.md)              | Gates and isolation         |


## Pre-Development Checklist

Read directory and error conventions; add database/logging guides when touching
those boundaries. Inspect actual config, routes, services and task dependencies.
Confirm isolated data paths before running anything that persists data.

## Quality Check

Follow [quality guidelines](quality-guidelines.md); record actual checks and
failures/unrun gates, keeping API contracts and persistence evidence aligned.
