# TASK-021 用户菜单设计

现有根用户菜单只含设置和账户待接入，与截图06分组、密度和主题开关不符。行为位于ProjectsSidebarPanel；设置页由已有settings store activeTab控制。

新增同域WorkspaceUserMenu.tsx，接收 `onOpenSettings/onOpenSkills: () => void`，根侧栏调用；ProjectNavigator设置prompt-packs后打开/settings。项目内旧侧栏不变。

复用Radix DropdownMenu键盘/焦点与CheckboxItem。主题读取现有persist store，用useSyncExternalStore订阅系统深浅变化；setMode切换，preventDefault保持菜单打开，不新增偏好存储。语言子菜单显示已选中文和禁用待接入选项。

user-menu.css定义320px宽度、35px行高、8px圆角；tokens.css增加背景变量，弹层自身覆盖popover变量，避免portal丢失根侧栏颜色。最大高度由Radix available-height限制，可滚动。头像复用icon.png，身份本地用户/本地工作区，积分/公告待接入。

帮助/反馈调用openExternalUrl到现有仓库及issues，异常调用toast。不提交外部内容，不新增API/模型。回退只移除本项组件/样式及接线，保留TASK-061和文档修复。

窄屏验收发现Radix侧开子菜单在390px宽时无法容纳（right561）。700px以内改为同一弹层里的语言列表与返回行，避免横向溢出；桌面保留子菜单。官方语言展开态未截，不宣称该状态已完整对齐。
