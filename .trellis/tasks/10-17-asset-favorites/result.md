# TASK-030 素材收藏状态结果

## 已实现

- `assets.favorite` 通过现有 Gorm AutoMigrate 持久化，旧行默认为 `false`；不改变素材 ID、文件、URL、hash、引用或项目归属。
- 全局/项目媒体列表和元数据更新响应返回 `favorite`；现有 PUT 链路支持省略、`true` 和显式 `false`。
- 素材库页面和弹窗增加 `全部 / 收藏` 筛选，收藏条件与目录、类型、来源、来源分组、评分、标签、使用状态、文本搜索取交集；选入资源行没有独立收藏状态。
- 预览面板增加收藏/取消收藏按钮，复用素材实际 owner scope 更新并在成功后刷新 SWR；失败仍保留现有错误路径。

## 检查

- [OK] `go test ./internal/service/media ./internal/repository ./internal/app`
- [OK] `go vet ./...`
- [OK] `go build ./...`
- [OK] workspace 收藏/元数据/素材库定向测试：45/45
- [OK] `pnpm -C apps/workspace lint`
- [OK] `pnpm -C apps/workspace exec tsc -b --pretty false`
- [OK] `pnpm -C apps/workspace build`
- [OK] 改动前端文件 `oxfmt --check`，`git diff --check`
- [OK] 仓库旧 SQLite 行迁移、重开、显式收藏持久化/清除测试；服务层 wrong-scope 与无写入测试

## 未完成/限制

- 未进行真实浏览器/Electron 收藏菜单与重启截图验收，TASK-030 总项保持开发中，不归档。
- 一次 `go test ./...` 暴露既有 `internal/service/generation/TestHistoryProjectAndSessionIntersection/project_aggregation` 顺序不稳定（单独 `-run ... -count=1` 通过）；失败与本项无关联，保留记录。
- 未修改或重生成主目录未提交的 `pnpm-lock.yaml`。
