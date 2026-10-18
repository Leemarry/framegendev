# Toonflow 画布交互设计

参考 `http://localhost:3001/#/workspace`，2026-10-18 已有浏览器截图与录制。实现采用 React + ReactFlow，参考行为与布局，不复制 Vue 源码。模块完成状态只维护在 [GAP.md](GAP.md)。

## 参考界面

![右键操作菜单](../../.cache/parity/workflow-stage1/reference-actions.png)

右键空白处：上传 → 添加节点 → 撤销 / 重做 → 粘贴。菜单在鼠标位置打开并限制在画布边界内。左下角固定工具栏；节点标题位于卡片上方，侧边圆形端口连接。

![节点类型与连线](../../.cache/parity/workflow-stage1/toonflow-node-menu.png)

节点类型依次为文本、图片、视频、音频、音频生成、3D 导演台、图片生成、视频生成。截图中的文本卡约 220px 宽，生成卡约 360px 宽。使用细边框、圆角、浅色网格和图标；React 版本用现有主题 tokens 与 Lucide 图标表达，支持亮暗主题。

已有录制目录：`C:/Users/Amireux/.config/browser-harness/agent-workspace/recordings/toonflow-reference-20261018`。执行状态、生成候选未取得完整实测证据，不由截图推断成功行为。

## 交互流程

分镜 → 视频生成 → 工作流开关 → 新建空白工作流 / 选择模板 → 画布编辑 → 自动保存。切换分镜时按 project/document/block 隔离，切换工作流时保留原画布数据。

空白处双击 → 类型菜单 → 在点击位置创建节点。右键 → 添加节点进入相同菜单。节点拖拽改变坐标；框选后复制包含内部连线，粘贴生成独立 ID。文本粘贴创建文本节点，媒体拖入或粘贴通过项目素材上传 API 入库后创建节点。

输出端口拖向输入端口 → 校验数据类型和占用 → 建立连线。点击已有连线 → 显示“断开连线” → 确认操作才移除。删除节点同时移除相邻连线，撤销同时恢复两者。

选中节点 → 节点下方出现设置卡。文本内容可直接编辑；媒体节点选择或更换素材；生成节点使用当前模型目录的参数定义。修改后 500ms 防抖保存，失败保留本地修改并显示重试。

全屏按钮展开生成弹窗至窗口大小。Esc 优先关闭上层素材对话框或画布菜单，然后退出全屏；全屏退出不清空画布。

执行与候选的目标流程：保存图 → 校验模型和必要输入 → 按依赖执行 → 展示节点状态 → 预览多个候选 → 人工选用并归属当前分镜。此流程需要后端执行与候选确认契约，当前配置界面明确标识执行待接入。

## React 组件

| 组件 | 职责 |
| --- | --- |
| `VideoGenerationDialog` | 分镜上下文、工作流开关 |
| `GenerationModalShell` | 弹窗、全屏、共享素材栏、Esc 层级 |
| `WorkflowManager` / `WorkflowTabs` / `WorkflowCreateDialog` | 工作流创建、模板、切换、重命名、删除 |
| `WorkflowCanvasEditor` | ReactFlow 画布、菜单、工具栏、自动保存、会话撤销重做 |
| `WorkflowNodeView` | 节点卡、类型端口、文本与媒体预览 |
| `WorkflowNodeSettings` | 模型目录及其参数编辑 |
| `MaterialLibraryImportDialog` | 复用项目素材选择与上传 |

撤销重做当前保存操作名称和前后图数据，仅当前画布会话有效，最多 100 条；它不等同于跨会话持久化操作日志。3D 导演台仅保留入口并标识待接入。
