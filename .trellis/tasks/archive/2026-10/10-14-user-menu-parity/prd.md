# TASK-021 screenshot user menu

## Goal

REQ-010/025: align screenshot06 user menu with real theme persistence, existing skills/settings routes and explicit pending services.

## Requirements

- 对照只读截图 `E:/AI/mediago-gap-shots/exe-flow/06-user-menu.png` 实现320px弹层、35px行高及身份/积分/技能/主题/语言/设置/公告/反馈/帮助分组。关联REQ-010/025。
- 本地身份真实展示，积分和公告待接入，无假余额或会员。
- 主题立即切换、持久化且保持菜单打开；系统主题变化同步开关。
- 技能/设置打开现有页面，帮助/反馈打开现有项目仓库相关页面。
- 当前中文可用，其他语言禁用待接入；窄屏/短屏可访问所有行。
- 不登录/生成，仅隔离测试；导入留TASK-062、商业服务TASK-140、完整国际化TASK-020，TASK-010仍待评审。

## Acceptance Criteria

- [x] 深浅主题、320px尺寸/分组及窄屏/短屏视觉通过。
- [x] 真实主题保存/刷新、键盘切换/Escape、技能/设置导航通过。
- [x] 外链调用/异常反馈单测、pending禁用、现有导航回归通过。
- [x] Vitest/lint/format/build真实结果记录，台账与日志更新。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
