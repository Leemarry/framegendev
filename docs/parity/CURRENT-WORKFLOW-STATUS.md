# MediaGo 工作流系统现状分析

**分析时间**: 2026-10-18  
**状态**: ✅ 后端完善，前端待完善

---

## 🎯 核心发现

**现有的后端架构已经非常完善！** 包括完整的数据模型、API 和服务层。

主要**缺失的部分在前端**：
- 画布交互体验（多画布管理、拖拽、缩放）
- 节点配置面板（可视化配置表单）
- 节点工具条（提取音轨、截取片段等）
- 撤销/重做（操作历史）
- 候选视频预览和管理

---

## 📦 后端现状（已有）

### 1. 数据模型 ✅

#### 工作流模板 (`workflow_templates`)
```go
type WorkflowTemplateModel struct {
    ID            string    `gorm:"primaryKey"`
    Name          string    `gorm:"not null"`
    Description   string
    Category      string    `gorm:"default:'custom';index"`
    ThumbnailURL  *string
    GraphDataJSON string    `gorm:"type:text"`  // WorkflowGraph v4
    UsageCount    int       `gorm:"default:0"`
    CreatedBy     *string
    CreatedAt     time.Time
    UpdatedAt     time.Time
}
```

**特性**:
- ✅ 分类（内置/自定义）
- ✅ 使用次数统计
- ✅ 缩略图 URL
- ✅ 完整的 GraphData（v4 schema）

---

#### 工作流实例 (`workflows`)
```go
type WorkflowModel struct {
    ID            string    `gorm:"primaryKey"`
    ProjectID     string    `gorm:"not null;index"`
    DocumentID    string    `gorm:"not null;index"`
    ShotName      string    `gorm:"not null;index"`
    Name          string
    Description   string
    SchemaVersion int       `gorm:"default:4"`
    GraphDataJSON string    `gorm:"type:text"`
    TemplateRef   *string   `gorm:"index"`
    CreatedAt     time.Time
    UpdatedAt     time.Time
}
```

**特性**:
- ✅ 绑定到 `ProjectID + DocumentID + ShotName`
- ✅ 支持从模板创建（`TemplateRef`）
- ✅ SchemaVersion 4（与 Toonflow 兼容）
- ✅ 级联删除（删除项目时自动删除工作流）

**关系**:
- 一个分镜可以有多个工作流实例（通过 `ListWorkflows(shotName)` 查询）
- 一个工作流实例属于一个分镜（`ShotName` 字段）

---

#### 工作流素材 (`workflow_assets`)
```go
type WorkflowAssetModel struct {
    ID         string    `gorm:"primaryKey"`
    WorkflowID string    `gorm:"not null;index"`
    NodeID     string    `gorm:"not null;index"`
    AssetPath  string    `gorm:"not null"`
    AssetType  string    `gorm:"not null"`  // image, video, audio
    SizeBytes  int64
    CreatedAt  time.Time
}
```

**特性**:
- ✅ 跟踪工作流生成的中间素材
- ✅ 支持清理（删除节点/工作流时自动删除素材）
- ✅ 记录文件大小（便于磁盘管理）

---

#### 节点任务状态 (`workflow_node_tasks`)
```go
type WorkflowNodeTaskModel struct {
    ID         string
    WorkflowID string
    NodeID     string
    Status     string    // pending/running/completed/failed/cancelled
    Progress   float64   // 0-100
    ErrorMsg   string
    StartedAt  *time.Time
    FinishedAt *time.Time
    CreatedAt  time.Time
    UpdatedAt  time.Time
}
```

**特性**:
- ✅ 跟踪节点执行状态
- ✅ 进度百分比
- ✅ 错误信息
- ✅ 唯一约束（一个节点只能有一个任务）

---

#### 输出绑定 (`workflow_output_bindings`)
```go
type WorkflowOutputBindingModel struct {
    ID          string
    WorkflowID  string
    NodeID      string
    SegmentName string    // 分段名称（如"镜头1-方案A"）
    DisplayName string
    SortOrder   int
    IsMain      bool      // 是否为主输出
    CreatedAt   time.Time
    UpdatedAt   time.Time
}
```

**特性**:
- ✅ 标记节点输出为分镜候选
- ✅ 支持多个候选（通过 `SortOrder` 排序）
- ✅ 标记主输出（`IsMain`）

---

### 2. API 接口 ✅

#### 工作流实例

```
GET    /api/v1/workflows
       query: projectId, shotName, documentId
       → 列出工作流摘要
       
POST   /api/v1/workflows
       body: { projectId, documentId, shotName, name, description, templateRef }
       → 创建工作流（空白或从模板）
       
GET    /api/v1/workflows/:id
       → 获取工作流详情（包含完整 graphData）
       
PUT    /api/v1/workflows/:id
       body: { name?, description?, graphData? }
       → 更新工作流（修改 graphData 会断开模板引用）
       
DELETE /api/v1/workflows/:id
       → 删除工作流（级联删除素材和任务）
```

#### 工作流模板

```
GET    /api/v1/workflow-templates
       query: category (builtin/custom)
       → 列出模板库
```

#### 工作流执行

```
POST   /api/v1/workflows/:workflowId/execute
       body: { targetNodeIds?: string[] }
       → 执行整个工作流或指定节点
       
GET    /api/v1/workflows/:workflowId/node-tasks
       → 获取所有节点任务状态
       
POST   /api/v1/workflows/:workflowId/cancel
       → 取消执行中的任务
```

#### 输出绑定

```
POST   /api/v1/workflow-output-bindings
       body: { workflowId, nodeId, segmentName, displayName }
       → 创建输出绑定
       
GET    /api/v1/workflow-output-bindings
       query: workflowId
       → 列出工作流的所有输出绑定
       
DELETE /api/v1/workflow-output-bindings/:id
       → 删除输出绑定
```

---

## 🎨 前端现状（待完善）

### 1. 已有的前端组件 ✅

```
apps/workspace/src/domains/generation/
├── api/
│   └── workflow.ts                   # ✅ API 封装
├── lib/
│   ├── workflow-schema-v4.ts         # ✅ TypeScript 类型定义（WorkflowGraph）
│   ├── workflow-migration.ts         # ✅ 旧版本迁移逻辑
│   └── dag-analyzer.ts               # ✅ DAG 拓扑排序（执行顺序）
└── components/
    ├── canvas/
    │   ├── WorkflowGenerationSurface.tsx   # ✅ 基础画布（ReactFlow）
    │   ├── CanvasMenu.tsx                  # ✅ 顶部菜单
    │   ├── NodeToolbar.tsx                 # ✅ 节点工具条（空框架）
    │   ├── NodeConfigPanel.tsx             # ✅ 节点配置面板（空框架）
    │   └── WorkflowExecutionPanel.tsx      # ✅ 执行控制面板
    └── config-editors/
        ├── ImageParamsForm.tsx       # ✅ 图像生成参数表单
        ├── VideoParamsForm.tsx       # ✅ 视频生成参数表单
        └── PromptEditor.tsx          # ✅ 提示词编辑器
```

---

### 2. 缺失的前端功能 ⚠️

#### A. 多画布管理
**现状**: 只有单个画布，没有标签页切换  
**需要**:
- 工作流标签页（Tab Bar）
- 新建工作流按钮
- 标签页右键菜单（重命名/删除/复制）
- 标签页拖拽排序

**参考**: Toonflow 的 `canvasMenu.vue`

---

#### B. 画布交互
**现状**: ReactFlow 基础能力（拖拽、连线）  
**需要**:
- 无限画布（pan/zoom）✅ 已有
- 文件拖放（从素材库拖入）⚠️ 缺失
- 节点多选 ✅ 已有
- 对齐辅助线 ⚠️ 缺失
- 网格吸附 ✅ 已有

---

#### C. 节点配置面板
**现状**: 有框架，但配置表单不完整  
**需要**:
- 视频生成节点配置（提示词、模型、首尾帧、参数）⚠️ 部分完成
- 图像生成节点配置 ⚠️ 部分完成
- 节点输入/输出管理（Handle 连接）✅ 已有
- 参数验证（必填项、范围检查）⚠️ 缺失

---

#### D. 节点工具条
**现状**: 有框架，但工具未实现  
**需要**:
- 提取音轨工具 ⚠️ 缺失
- 截取视频片段工具 ⚠️ 缺失
- 截取视频帧工具 ⚠️ 缺失
- 替换素材工具 ⚠️ 缺失

**参考**: Toonflow 的 `selectionToolbar.vue`

---

#### E. 撤销/重做
**现状**: 完全缺失  
**需要**:
- 操作历史栈（Event Sourcing）
- Undo/Redo 按钮
- 快捷键（Ctrl+Z / Ctrl+Y）
- 快照优化（定期创建快照）

**参考**: Toonflow 的 `useCanvasHistory.ts`

---

#### F. 候选视频管理
**现状**: 后端有输出绑定，前端无 UI  
**需要**:
- 候选列表（节点下方展开）⚠️ 缺失
- 候选预览（视频播放器）⚠️ 缺失
- "✓ 采用"按钮（采用到分镜）⚠️ 缺失
- 候选对比（并排预览）⚠️ 缺失

---

#### G. 自动保存
**现状**: 手动保存（点击"保存"按钮）  
**需要**:
- 防抖保存（500ms 延迟）⚠️ 缺失
- 脏数据标记（`isDirty` 状态）⚠️ 缺失
- 保存状态提示（"保存中..." / "已保存"）⚠️ 缺失

---

## 🚀 实施优先级

基于现状，我建议的实施顺序：

### 阶段 1：多画布管理（1-2天）⭐ 高优先级
**目标**: 让用户能在一个分镜里切换多个工作流

**任务**:
1. 工作流标签页（Tab Bar）
2. 新建工作流对话框（空白/从模板）
3. 标签页右键菜单（重命名/删除）
4. 自动保存（防抖 500ms）

**验收标准**:
- ✅ 用户能在分镜详情页看到"工作流"标签
- ✅ 点击"+ 新建工作流"，弹出对话框
- ✅ 选择模板后，创建工作流实例并打开画布
- ✅ 能在多个工作流之间切换
- ✅ 编辑画布后，500ms 自动保存

---

### 阶段 2：节点配置完善（2-3天）⭐ 高优先级
**目标**: 让节点配置面板完整可用

**任务**:
1. 完善视频生成节点配置表单
2. 完善图像生成节点配置表单
3. 添加参数验证
4. 实时预览（提示词 token 计数、模型信息）

**验收标准**:
- ✅ 点击节点，右侧打开配置面板
- ✅ 所有参数可编辑（提示词、模型、首尾帧、尺寸、种子等）
- ✅ 必填项验证（红色提示）
- ✅ 参数修改后立即保存（防抖）

---

### 阶段 3：撤销/重做（2-3天）⭐ 中优先级
**目标**: 实现完整的操作历史

**任务**:
1. 定义操作类型（ADD_NODE, REMOVE_NODE, UPDATE_NODE, ADD_EDGE, REMOVE_EDGE）
2. 实现历史栈（操作记录 + 快照）
3. Undo/Redo 逻辑
4. UI 按钮和快捷键

**验收标准**:
- ✅ 添加节点后，点击 Undo 撤销
- ✅ Ctrl+Z / Ctrl+Y 快捷键生效
- ✅ 撤销/重做按钮的禁用状态正确

---

### 阶段 4：节点工具条（3-4天）⭐ 中优先级
**目标**: 实现节点工具（提取音轨、截取片段等）

**任务**:
1. 提取音轨工具（视频节点 → 音频节点）
2. 截取视频片段工具（选择时间范围）
3. 截取视频帧工具（选择帧位置）
4. 替换素材工具（从素材库选择）

**验收标准**:
- ✅ 选中视频节点，工具条显示"提取音轨"按钮
- ✅ 点击"提取音轨"，生成音频节点并自动连线
- ✅ 其他工具类似

---

### 阶段 5：候选管理（2-3天）⭐ 高优先级
**目标**: 让用户能查看、对比、采用候选视频

**任务**:
1. 候选列表 UI（节点下方展开）
2. 候选预览（视频播放器）
3. "✓ 采用"按钮（调用 API）
4. 采用后更新分镜素材

**验收标准**:
- ✅ 节点执行完成后，显示候选列表
- ✅ 点击候选，预览视频
- ✅ 点击"✓ 采用"，视频进入分镜素材库
- ✅ 分镜时间轴显示采用的视频

---

### 阶段 6：体验优化（2-3天）⭐ 低优先级
**目标**: 提升整体交互体验

**任务**:
1. 文件拖放（从素材库拖入画布）
2. 对齐辅助线
3. 节点搜索（双击画布 → 搜索框）
4. 键盘快捷键（Delete 删除节点、Ctrl+C/V 复制粘贴）

**验收标准**:
- ✅ 从素材库拖动视频到画布，自动创建视频节点
- ✅ 移动节点时显示对齐线
- ✅ 双击画布，弹出节点搜索框

---

## 📅 总预估时间

- 阶段 1：1-2 天
- 阶段 2：2-3 天
- 阶段 3：2-3 天
- 阶段 4：3-4 天
- 阶段 5：2-3 天
- 阶段 6：2-3 天

**总计**: 12-18 天（~2.5-3.5 周）

---

## 🤔 下一步

用户确认实施顺序后，我会：
1. 从**阶段 1** 开始（多画布管理）
2. 每完成一个阶段，向用户汇报并演示
3. 获得反馈后继续下一个阶段

---

最后更新：2026-10-18 19:30
