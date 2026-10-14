# TASK-021 User Menu Implementation Plan

> For agentic workers: use Superpowers executing-plans inline; project authorization excludes commits and subagents.

**Goal:** 对照截图06实现可用的根用户菜单。

**Architecture:** 同域菜单复用Radix、theme/settings stores与桌面URL helper。

**Tech Stack:** React19、TypeScript、Zustand、Radix、CSS tokens、Vitest。

**Spec:** [design.md](design.md)、[prd.md](prd.md)。

## Constraints

只改framegendev；隔离workspace；不登录/生成/提交；TASK-010待评审；无新增依赖/API。

## Execution

- [x] 根侧栏测试菜单名称改为软件设置，先确认失败。
      文件ProjectNavigatorProjectPanels.test.tsx；命令 `pnpm -C apps/workspace exec vitest run src/domains/workspace/components/ProjectNavigatorProjectPanels.test.tsx`。
      断言 `fireEvent.click(screen.getByRole("menuitem", { name: "软件设置" })); expect(onOpenSettings).toHaveBeenCalledOnce()`。
- [x] 创建WorkspaceUserMenu.tsx/测试、user-menu.css；接线ProjectNavigatorProjectPanels/ProjectNavigator，增加token和import。
      接口 `{onOpenSettings: () => void; onOpenSkills: () => void}`；技能 `setActiveSettingsTab("prompt-packs"); navigate("/settings")`。
      主题 `setMode(checked ? "dark" : "light")`；`onSelect={event => event.preventDefault()}`保持打开。
      测试覆盖store/DOM/持久化、系统变化、导航关闭、pending禁用、外链/失败。
- [x] 菜单/根侧栏Vitest；`pnpm -C apps/workspace lint`、`format`、`build`；只格式化本项文件。
- [x] browser-harness隔离Chrome profile检查1600×1066、390×844及低高度；刷新主题/键盘Escape/真实设置和技能入口；截图.cache/parity/task-021。
- [x] result.md、README/需求/台账完成；收尾执行Trellis日志及归档 `--no-commit`，保留服务并关闭专用测试Chrome。
