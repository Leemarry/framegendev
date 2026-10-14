# TASK-035 Implementation Plan

Superpowers writing-plans；inline按DEC-023执行，不派发agent、不Git提交。

**Goal:** 素材库逻辑目录与移动API真实可用、引用稳定。
**Architecture:** 独立目录表+assets归属列，现有media service/repository/handler分层。
**Tech Stack:** Go/Gin/Gorm/SQLite，现有Windows质量工具链。
**Spec:** design.md、REQ-012、TASK-034。

## 单一交付：目录与移动API

- [x] 写真实HTTP回归：全局/项目目录、同级重名、中文、嵌套、跨scope、移动根/子目录、混合非法更新零写入，先观察未实现失败。
- [x] 加schema与repo持久化，scope/父级/唯一性；旧schema迁移与关闭重开检查。
- [x] service验证名称/owner/父级，目录API及媒体部分更新；保持物理引用，注册真实路由/Swagger。
- [x] 针对回归与完整check/test/race/build；失败不替换运行服务。
- [x] 隔离DB备份、构建新二进制与保留MCP工具、核实身份后重启31430；真实HTTP目录/移动/重启持久化/文件hash/原文档不变。
- [x] result、台账/交接/spec/会话后无提交归档，自动接TASK-036页面目录操作。
