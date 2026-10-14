# TASK-061 设计

差距位于 Projects.tsx 列表、App.tsx/AppLayout.tsx 重复头部、ProjectsSidebarPanel 根侧栏。复用生命周期服务、SWR、callable创建/重命名/确认框、Radix菜单和主题tokens。

根管理页独立shell类，固定325px侧栏；其他页面可调宽度及保存偏好保持。<=700px时根侧栏为64px图标栏，标题页签换行。卡片230×307px，间隔20px；打开button和kebab为兄弟，避免嵌套/误导航。右键与kebab共用动作列表，非活动卡保留恢复/删除。

颜色只新增到tokens.css；CSS引用变量。空态插图仅从用户参考截图提取插图区域、背景透明，源图只读；记录来源。无真实封面项目保留空白卡，不加入样例媒体。

侧栏素材和历史组件增navigation变体；本地用户菜单连接真实设置。Drami、导入和已有目录标待接入；不伪造外部身份。
