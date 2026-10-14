# TASK-061 项目管理首屏对齐

## Goal

REQ-010/017: restore project management cards, single header, root sidebar and empty states; preserve real local lifecycle APIs.

## Requirements

- 来源：用户指出当前页面与截图不一致并要求继续开发。关联 REQ-002、010、017，父模块 TASK-060；需求原文以 docs/parity-0.1.17 为准。
- 单层标题、项目/归档/垃圾箱页签、创建卡片、真实项目卡片、kebab/右键菜单、最近项目、底部导航和本地用户设置入口。
- 参考36-project-list、40-list-archived、41-list-trash；官方创建弹窗和kebab未截到，复用本地语义，不宣称未知细节一致。

## Acceptance Criteria

- [x] 深色桌面内容布局匹配，窄屏无溢出，深浅色均可用。
- [x] 创建取消零请求，创建/打开/重命名/归档/恢复/垃圾箱使用真实API；错误可重试；素材/历史/搜索入口可打开。
- [x] lint/format/build、相关测试、浏览器验证如实记录，详见result.md。

## Notes

- 不实现新后端接口、项目导入/目录绑定、Drami、商业账户、正文/NLE/设置全量；分别保留TASK-062/130/140/070/040/010。
- 不读写官方数据、用户素材目录；不生成、不登录、不提交。
