# TASK-036 Implementation Plan

Superpowers writing-plans，inline，DEC-023持续授权与本轮完整功能原则。

**Goal:** 素材文件夹由真实API到页面的可用闭环。
**Architecture:** page目录状态/SWR+可复用目录UI，媒体操作仍归AssetLibraryWorkspace。
**Tech Stack:** React/Router/SWR/Radix/TypeScript与现有semantic tokens。
**Spec:** design.md、TASK-035真实目录协议。

- [x] 完成TASK-035包括目标目录上传的后端验收，再激活页面任务。
- [x] 目录API类型/路径和复用媒体mutation请求；page URL目录状态，树与面包屑。
- [x] 创建/重命名共用表单和窄屏目录菜单；失败/取消/重名回归。
- [x] Workspace按当前目录列文件、子目录及真实计数，详情同scope移动、当前目录上传，复用搜索/预览/元数据。
- [x] 测试/完整lint/format(threads2)/build；浏览器深浅/窄短屏，真实目录操作、上传/移动/刷新/返回/文件hash/原文档不变。
- [x] result/spec/台账/交接/会话并无提交归档；完整文件夹闭环通过后再选择下一独立功能。
