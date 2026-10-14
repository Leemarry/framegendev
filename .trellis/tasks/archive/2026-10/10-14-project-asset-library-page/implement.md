# TASK-032 Implementation Plan

Superpowers writing-plans/executing-plans，inline，按DEC-023持续授权执行。

**Goal:** 项目素材库根目录整页可用并对齐官方30。
**Architecture:** 复用既有workspace逻辑，同一数据与操作支持dialog/page，独立page壳与路由。
**Tech Stack:** React19/Router/SWR/TypeScript/CSS tokens。
**Spec:** design.md，REQ-012。

## Constraints

隔离数据；保留其他任务未提交改动；不改TASK-010/170；文件夹/扫描明确待开发；全局页面另项；不登录/生成/Git提交。

## 单一交付：项目素材根目录整页

- [x] 回归旧弹窗3文件23测试，提取AssetLibraryWorkspace时保证操作不变。
- [x] page路由及项目Link/返回测试：保存原documentId/search/state，直达fallback当前项目。
- [x] 页面空态测试，真实SWR列表驱动排序/查询/计数，按钮文件导入复用现有uploadMediaAsset。
- [x] page控制代码复用 `filterAssetLibraryItems(items,{query,kind,sort})`；range决定CSS grid min width；详情按钮切换既有预览；刷新await现有mutate。
- [x] 前端相关vitest(maxWorkers2)、lint、format(threads2)、build，git diff --check。
- [x] browser-harness独立项目空态对照30、真实导入/搜索/元数据、重开/返回、深浅/窄短屏；原文档hash/version一致。
- [x] 更新result/台账/交接/会话，全部通过再归档，下一项TASK-034文件夹数据/API先核实设计。
