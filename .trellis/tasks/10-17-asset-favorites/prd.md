# TASK-030 素材收藏状态

## Goal

为项目与全局素材库增加持久化收藏状态、收藏筛选和取消收藏，复用现有素材元数据更新链路。

## Requirements

- Add a persisted `favorite` state to physical media assets without changing
  asset IDs, files, URLs, hashes, references, or project ownership.
- Return the state from global and project media asset list/update projections.
- Allow a partial metadata update to set or clear favorite independently of
  tags, note, rating, and folder placement.
- Add a local library filter with `全部` and `收藏` values; it must intersect
  existing folder, scope, kind, source, provenance, rating, tag, usage, and
  text filters without writing data.
- Preserve legacy databases by adding the column through the existing
  workspace AutoMigrate path with a false default.
- Keep browser and Electron behavior identical for this feature; no external
  provider or account service is required.

## Acceptance Criteria

- [ ] Legacy and new SQLite rows read `favorite=false` by default and retain
      all existing asset identity and metadata.
- [ ] Global/project list responses include `favorite` and update responses
      return the refreshed value.
- [ ] Valid favorite-only updates persist across service restart; omitted
      favorite leaves the current value unchanged and explicit false clears it.
- [ ] Invalid update payloads and wrong-scope writes return the existing safe
      errors without changing the row.
- [ ] The asset library exposes `全部` and `收藏` filters and the favorite
      filter intersects every existing filter.
- [ ] Service, handler, API, and component tests cover persistence, scope,
      filtering, retry/error behavior, and no accidental writes from filtering.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
