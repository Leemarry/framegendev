# TASK-031 Implementation Plan

使用 Superpowers writing-plans/executing-plans，主会话inline执行。DEC-023已授权实施，无重复批准或Git提交步骤。

**Goal:** 保存并搜索素材标签、备注、评分。
**Architecture:** 扩展 assets 表与 media-assets PUT，详情表单调用真实API。
**Tech Stack:** React19/SWR/TypeScript，Go/Gin/Gorm/SQLite。
**Spec:** design.md；REQ-012。

## Constraints

仅 E:/AI/framegendev 开发；测试workspace独立；不访问生产workspace-v2；不登录/生成/提交；质量门失败不能标完成。

## 单一交付：元数据保存/恢复/搜索

- [x] service回归：上传字节→Update(tags/note/rating)→关闭重开DB→Get；省略note保持、[]/空串/0清空；跨scope与超限拒绝，文件hash保持。
- [x] 先运行 go test ./internal/service/media，观察缺接口失败。
- [x] 默认列/API投影使用 TagsJSON string；service用 json.Marshal/json.Unmarshal，校验返回 ErrInvalidMediaAssetUpdate；handler用 errors.Is 分400/500。
- [x] API表驱动验证类型/范围/404/filename兼容；旧schema迁移默认与原内容不变。
- [x] 表单/搜索测试：输入“角色, 主角”，保存断言payload；取消不调用；失败输入保留，切换素材清草稿。
- [x] 标签逗号分隔、备注textarea、原生评分select；失败role=alert，成功mutate；key重建表单，以媒体实际projectId调用。
- [x] 前端相关vitest、lint/format/build，sync-workspace-dist；Windows runner完整check/test/race/build，保留exit code日志。
- [x] 构建隔离bin，保留task-003工具；核实进程后替换31430，原文档hash/version前后相同。
- [x] browser-harness真实导入专用PNG、编辑中文元数据、取消、搜索、刷新/重开；API/SQLite重开/文件hash核对；深浅/窄屏截图与错误收集。
- [x] result/台账/交接/会话记录，全部通过才归档，随后单独设计TASK-032。
