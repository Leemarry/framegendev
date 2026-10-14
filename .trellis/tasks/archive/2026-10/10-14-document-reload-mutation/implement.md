# TASK-004 Implementation Plan

**Goal:** 修复无编辑加载导致持久化内容和版本变化。
**Architecture:** 在编辑器产生异常更新的位置修复；保存层沿用原接口。
**Tech Stack:** React 19、Tiptap 3、Vitest、Testing Library。
**Spec:** [design.md](design.md)、[prd.md](prd.md)。

单会话 inline 实施，不暂存或提交。仅使用 framegendev 的隔离缓存。

## 执行步骤

- [x] 在 MarkdownHybridEditor.test.tsx 用实际组件挂载中文/空段落/标题/列表内容，等待初始化及160ms更新窗口，断言 onChange 无调用；先运行确认失败。
- [x] 依据失败交易/节点确认根因；更新 design.md 后修改产生交易的配置或生命周期，不过滤真实编辑。
- [x] 加入真实编辑、外部内容同步、缓存重开回归；验证 onChange 返回编辑后的内容。
- [x] 运行相关文档、hook、缓存测试及 `pnpm -C apps/workspace lint`、`format`、`build`。
- [x] Browser Harness 检查隔离文档连续刷新、切换重开、真实编辑及服务重启；每次比较完整文件hash/version，记录截图及错误。
- [x] 更新 result.md、TASKS/README/需求和必要规范；验收完成后执行会话日志和归档，实际结果见 result.md。
