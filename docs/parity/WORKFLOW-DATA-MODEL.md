# MediaGo 工作流数据模型设计

**版本**: v1.0  
**创建时间**: 2026-10-18  
**状态**: 🚧 设计中

---

## 🎯 设计目标

基于 Toonflow 的画布能力，结合 MediaGo 的业务模型（Document → Chapter → Shot），实现：

1. **多对多关系**：分镜 ↔ 工作流实例
2. **公共模板库**：可跨分镜复用的工作流模板
3. **素材隔离**：工作流生成的素材归属于工作流本身
4. **完整交互**：多画布管理、自动保存、撤销重做、文件拖放

---

## 📊 核心数据实体

### 1. 工作流模板 (WorkflowTemplate)

**用途**: 公共的、可复用的工作流定义

```typescript
interface WorkflowTemplate {
  id: string;                          // UUID
  name: string;                        // 模板名称，如"图生视频-标准流程"
  description?: string;                // 描述
  category?: string;                   // 分类：视频生成、图像处理、音频制作
  thumbnail?: string;                  // 缩略图 URL
  graph: WorkflowGraph;                // 画布数据（v4 schema）
  isPublic: boolean;                   // 是否公开（官方模板）
  authorId?: string;                   // 创建者 ID（用户模板）
  tags: string[];                      // 标签，便于搜索
  usageCount: number;                  // 使用次数统计
  createdAt: string;                   // 创建时间
  updatedAt: string;                   // 更新时间
}
```

**存储位置**:
- 后端数据库表：`workflow_templates`
- 前端状态：全局 Zustand store `useWorkflowTemplateStore`

**关键特性**:
- ✅ 可被多个分镜引用
- ✅ 官方模板 + 用户自定义模板
- ✅ 模板库 UI 支持搜索、分类、预览

---

### 2. 工作流实例 (WorkflowInstance)

**用途**: 分镜关联的具体工作流实例

```typescript
interface WorkflowInstance {
  id: string;                          // UUID
  name: string;                        // 实例名称，如"镜头1-方案A"
  documentId: string;                  // 所属文档 ID
  
  // 来源
  sourceType: 'template' | 'scratch';  // 来源：从模板创建 | 从空白创建
  templateId?: string;                 // 引用的模板 ID（sourceType='template'时）
  templateVersion?: number;            // 模板版本号（未来支持模板更新）
  
  // 画布数据
  graph: WorkflowGraph;                // 当前画布状态（v4 schema）
  
  // 状态
  status: WorkflowStatus;              // 工作流状态
  
  // 输出
  outputCandidates: WorkflowOutput[];  // 候选输出列表
  
  // 素材作用域
  assetScope: string;                  // 素材目录路径，如 "workflows/<workflowId>/assets"
  
  // 元数据
  createdAt: string;
  updatedAt: string;
  lastExecutedAt?: string;             // 最后执行时间
}

type WorkflowStatus = 
  | 'draft'        // 草稿（编辑中）
  | 'executing'    // 执行中（有节点正在生成）
  | 'completed'    // 已完成（所有节点执行完毕）
  | 'partial'      // 部分完成（部分节点成功，部分失败）
  | 'failed';      // 失败（执行出错）

interface WorkflowOutput {
  id: string;                          // 候选输出 ID
  nodeId: string;                      // 产出该候选的节点 ID
  assetId: string;                     // 生成的素材 ID
  assetType: 'image' | 'video' | 'audio';
  assetUrl: string;                    // 素材预览 URL
  metadata: {                          // 生成元数据
    prompt?: string;
    modelId?: string;
    params?: Record<string, unknown>;
  };
  createdAt: string;
}
```

**存储位置**:
- 后端数据库表：`workflow_instances`
- 前端状态：分镜级 Zustand store `useShotWorkflowStore`

**关键特性**:
- ✅ 一个工作流实例可以被多个分镜关联（通过关联表）
- ✅ 支持从模板创建 + 空白创建
- ✅ 记录所有候选输出

---

### 3. 分镜-工作流关联 (ShotWorkflowLink)

**用途**: 多对多关系表

```typescript
interface ShotWorkflowLink {
  id: string;                          // UUID
  shotId: string;                      // 分镜 ID
  workflowId: string;                  // 工作流实例 ID
  isPrimary: boolean;                  // 是否为主要工作流（分镜的默认工作流）
  adoptedOutputId?: string;            // 已采用的候选输出 ID
  createdAt: string;
  updatedAt: string;
}
```

**存储位置**:
- 后端数据库表：`shot_workflow_links`

**关键特性**:
- ✅ 一个分镜可以关联多个工作流（对比不同方案）
- ✅ 一个工作流可以被多个分镜关联（复用公共流程）
- ✅ `isPrimary` 标记分镜的默认工作流
- ✅ `adoptedOutputId` 记录分镜采用的候选

---

## 🗂️ 文件系统结构

### Toonflow 方式
```
工作区目录/
├── canvas1.json          # 画布文件
├── canvas2.json
└── assets/
    ├── <nodeId1>/        # 节点1的素材
    │   ├── output.mp4
    │   └── thumbnail.jpg
    └── <nodeId2>/        # 节点2的素材
        └── output.png
```

### MediaGo 方式（改进）

```
projects/<projectId>/
├── shots/
│   ├── 镜头1/
│   │   ├── assets/           # 分镜正式素材（已采用的）
│   │   │   ├── video.mp4
│   │   │   └── audio.mp3
│   │   └── workflows/        # 分镜关联的工作流实例
│   │       ├── <workflowId1>/
│   │       │   ├── canvas.json       # 画布数据（冗余存储，便于离线访问）
│   │       │   └── assets/           # 工作流专属素材
│   │       │       ├── <nodeId1>/
│   │       │       │   ├── output.mp4
│   │       │       │   ├── history/
│   │       │       │   │   ├── v1.mp4
│   │       │       │   │   └── v2.mp4
│   │       │       │   └── thumbnail.jpg
│   │       │       └── <nodeId2>/
│   │       │           └── output.png
│   │       └── <workflowId2>/
│   │           ├── canvas.json
│   │           └── assets/
│   └── 镜头2/
│       └── workflows/
│           └── <workflowId3>/  # 可能引用同一个 templateId
└── workflow-templates/      # 项目私有模板（可选）
    └── <templateId>/
        ├── template.json
        └── preview.jpg
```

**设计要点**:
1. **工作流素材隔离**: `shots/<name>/workflows/<workflowId>/assets/` 避免污染分镜正式素材
2. **画布数据冗余**: 画布 JSON 既存数据库，也存文件系统（便于 Git、离线访问）
3. **历史版本**: 每个节点的 `history/` 目录保留多次生成结果
4. **采用逻辑**: 用户"采用"某个候选 → 复制到 `shots/<name>/assets/`

---

## 🔄 数据流

### 1. 创建工作流实例

```
用户操作：分镜详情页 → 点击"新建工作流"

选项A: 从模板创建
  → 选择模板（模板库 UI）
  → 后端：复制 template.graph → 新建 WorkflowInstance
  → 前端：打开画布，加载 graph

选项B: 从空白创建
  → 后端：创建空 WorkflowInstance (emptyWorkflowGraphV4)
  → 前端：打开空画布

结果：
  → 创建 ShotWorkflowLink 关联
  → 在文件系统创建 workflows/<workflowId>/ 目录
```

### 2. 编辑工作流

```
用户操作：拖拽节点、连线、配置参数

前端：
  → useVueFlow / ReactFlow 管理画布状态
  → 防抖保存 (500ms)
  → 调用 PUT /api/v1/workflows/:id

后端：
  → 更新 workflow_instances.graph
  → 写入文件系统 workflows/<id>/canvas.json
```

### 3. 执行生成

```
用户操作：点击节点"生成"按钮

前端：
  → 提取节点配置 (prompt, modelId, params)
  → 收集节点依赖（上游节点的 outputs）
  → 调用 POST /api/v1/workflows/:id/nodes/:nodeId/execute

后端：
  → 调度生成任务（图生视频/文生视频/图像生成）
  → 返回 taskId

前端：
  → 轮询任务状态 GET /api/v1/tasks/:taskId
  → 更新节点状态 (generating → succeeded/failed)
  → 生成完成 → 下载素材到 workflows/<id>/assets/<nodeId>/
```

### 4. 查看候选

```
前端：
  → 读取 workflow_instances.outputCandidates
  → 显示候选列表（缩略图 + 元数据）
  → 点击候选 → 全屏预览
```

### 5. 采用候选

```
用户操作：点击候选"✓ 采用"按钮

前端：
  → 调用 POST /api/v1/shots/:shotId/adopt-workflow-output
    body: { workflowId, outputId }

后端：
  → 复制素材：workflows/<id>/assets/<nodeId>/output.mp4 
               → shots/<name>/assets/<assetId>.mp4
  → 更新 shot_workflow_links.adoptedOutputId
  → 更新 shots.assets 数组（添加新素材）

前端：
  → 刷新分镜素材列表
  → 显示采用成功提示
```

---

## 🎨 前端组件结构

### 1. 工作流管理层

```tsx
// apps/workspace/src/domains/generation/components/

WorkflowManager.tsx           // 工作流管理容器（分镜详情页的"工作流"标签）
├── WorkflowTabBar.tsx        // 标签页（显示分镜关联的所有工作流）
│   ├── WorkflowTab.tsx       // 单个工作流标签
│   ├── NewWorkflowButton.tsx // 新建工作流按钮
│   └── WorkflowTabMenu.tsx   // 右键菜单（重命名/删除/复制）
│
├── WorkflowCanvas.tsx        // 画布容器（基于 ReactFlow）
│   ├── WorkflowToolbar.tsx   // 顶部工具栏
│   ├── WorkflowSidebar.tsx   // 左侧节点库面板
│   ├── WorkflowConfigPanel.tsx // 右侧节点配置面板
│   └── WorkflowControls.tsx  // 画布控制按钮（缩放/对齐/撤销重做）
│
└── WorkflowTemplateLibrary.tsx // 模板库对话框
    ├── TemplateCard.tsx      // 模板卡片
    └── TemplatePreview.tsx   // 模板预览
```

### 2. 节点层

```tsx
// apps/workspace/src/domains/generation/components/nodes/

BaseNode.tsx                  // 节点基础组件
├── VideoGenerationNode.tsx   // 视频生成节点
├── ImageGenerationNode.tsx   // 图像生成节点
├── AudioGenerationNode.tsx   // 音频生成节点
├── ImageNode.tsx             // 图片输入节点
├── VideoNode.tsx             // 视频输入节点
└── TextNode.tsx              // 文本输入节点

NodeConfigPanel.tsx           // 节点配置面板（右侧弹出）
├── VideoGenForm.tsx          // 视频生成节点表单
├── ImageGenForm.tsx          // 图像生成节点表单
└── ...

NodeToolbar.tsx               // 节点工具条（节点悬浮时显示）
├── ExtractAudioTool.tsx      // 提取音轨
├── TrimVideoTool.tsx         // 截取片段
├── ExtractFrameTool.tsx      // 截取视频帧
└── ReplaceMediaTool.tsx      // 替换素材

NodeOutputPreview.tsx         // 节点输出预览（内嵌视频播放器）
├── VideoPlayer.tsx
├── ImageViewer.tsx
└── AudioWaveform.tsx

NodeCandidateList.tsx         // 候选列表（节点下方展开）
├── CandidateItem.tsx         // 单个候选
└── AdoptCandidateButton.tsx  // 采用按钮
```

### 3. 状态管理

```tsx
// apps/workspace/src/domains/generation/stores/

workflow-template.ts          // 工作流模板 store
  → useWorkflowTemplateStore()
  → { templates[], fetchTemplates(), createTemplate() }

shot-workflow.ts              // 分镜工作流 store
  → useShotWorkflowStore(shotId)
  → { 
      workflows: WorkflowInstance[],    // 当前分镜关联的工作流列表
      activeWorkflowId: string,         // 当前激活的工作流
      fetchWorkflows(),
      createWorkflow(),
      switchWorkflow(),
      deleteWorkflow()
    }

workflow-canvas.ts            // 画布状态 store
  → useWorkflowCanvasStore(workflowId)
  → { 
      graph: WorkflowGraph,             // 当前画布数据
      history: HistoryStack,            // 撤销/重做栈
      isDirty: boolean,                 // 脏数据标记
      updateGraph(),
      saveGraph(),
      undo(),
      redo()
    }

workflow-execution.ts         // 执行状态 store
  → useWorkflowExecutionStore(workflowId)
  → { 
      nodeStates: Map<nodeId, NodeStatus>,  // 节点状态
      executeNode(),
      pollTaskStatus(),
      cancelExecution()
    }
```

---

## 🔧 后端 API 设计

### 1. 工作流模板

```
GET    /api/v1/workflow-templates
       → 获取模板列表（支持分类、搜索）
       
GET    /api/v1/workflow-templates/:id
       → 获取模板详情
       
POST   /api/v1/workflow-templates
       body: { name, description, graph, category, tags }
       → 创建用户模板（从当前工作流保存为模板）
       
PUT    /api/v1/workflow-templates/:id
       → 更新模板
       
DELETE /api/v1/workflow-templates/:id
       → 删除用户模板
```

### 2. 工作流实例

```
GET    /api/v1/shots/:shotId/workflows
       → 获取分镜关联的所有工作流实例
       
POST   /api/v1/shots/:shotId/workflows
       body: { 
         name, 
         sourceType: 'template' | 'scratch',
         templateId?: string 
       }
       → 为分镜创建工作流实例
       → 自动创建 ShotWorkflowLink
       
GET    /api/v1/workflows/:id
       → 获取工作流实例详情
       
PUT    /api/v1/workflows/:id
       body: { graph: WorkflowGraph }
       → 更新工作流画布
       → 自动保存到文件系统
       
DELETE /api/v1/workflows/:id
       → 删除工作流实例
       → 清理文件系统素材
       → 删除所有 ShotWorkflowLink
```

### 3. 工作流执行

```
POST   /api/v1/workflows/:workflowId/nodes/:nodeId/execute
       body: { 
         config: { prompt, modelId, params },
         inputs: { [handleId]: { dataType, value } }
       }
       → 执行节点生成任务
       → 返回 { taskId }
       
GET    /api/v1/tasks/:taskId
       → 轮询任务状态
       → 返回 { status, progress, result?, error? }
       
POST   /api/v1/workflows/:workflowId/nodes/:nodeId/cancel
       → 取消执行中的任务
```

### 4. 候选管理

```
GET    /api/v1/workflows/:workflowId/outputs
       → 获取工作流的所有候选输出
       
POST   /api/v1/shots/:shotId/adopt-workflow-output
       body: { workflowId, outputId }
       → 采用候选到分镜
       → 复制素材到分镜正式素材区
       → 更新 shot_workflow_links.adoptedOutputId
       
DELETE /api/v1/workflows/:workflowId/outputs/:outputId
       → 删除候选输出
```

---

## ✅ 已确认的决策（基于用户回答）

### 决策点 1：工作流实例的共享粒度 ✅

**用户回答**: "不共享画布数据。分镜A 可以有多个工作流，每一个工作流都可以为这个分镜制作成果视频。公共工作流就是一个制作视频的模块。"

**最终方案**: 
- ✅ **从模板创建时复制 graph** - 每个分镜关联工作流模板时，创建独立的 WorkflowInstance
- ✅ **一个分镜可以有多个工作流实例** - 分镜A可以同时有"实例1"、"实例2"、"实例3"
- ✅ **公共工作流 = 模板** - 作为可复用的"制作视频的模块"，供分镜 fork

**数据模型**:
```typescript
WorkflowTemplate "公共工作流1" (id=template1, graph={...})
  ├─ WorkflowInstance A1 (id=instanceA1, templateId=template1, shotId=shotA, graph=<独立副本>)
  ├─ WorkflowInstance A2 (id=instanceA2, templateId=template1, shotId=shotA, graph=<独立副本>)
  └─ WorkflowInstance B1 (id=instanceB1, templateId=template1, shotId=shotB, graph=<独立副本>)

// 分镜A 有两个工作流实例（都来自同一个模板，但画布独立）
// 分镜B 有一个工作流实例（也来自同一个模板）
// 所有实例的画布互不影响
```

---

### 决策点 2：素材目录的归属 ✅

**用户回答**: "中间素材是这个分镜的的素材。"

**最终方案**:
- ✅ **素材归属于分镜** - 工作流生成的素材，存储在该分镜的目录下
- ✅ **每个工作流实例独立存储** - 即使来自同一个模板，素材也分别存储
- ✅ **路径规则**: `shots/<shotName>/workflows/<workflowId>/assets/<nodeId>/`

**文件系统结构**:
```
projects/<projectId>/
  └─ shots/
      ├─ 镜头A/
      │   ├─ assets/                    # 分镜正式素材（已采用的）
      │   │   └── final-video.mp4
      │   └─ workflows/
      │       ├─ <instanceA1>/
      │       │   ├── canvas.json
      │       │   └── assets/            # ⭐ 工作流A1的素材（归属镜头A）
      │       │       └── <nodeId>/output.mp4
      │       └─ <instanceA2>/
      │           └── assets/            # ⭐ 工作流A2的素材（独立）
      └─ 镜头B/
          └─ workflows/
              └─ <instanceB1>/
                  └── assets/            # ⭐ 工作流B1的素材（归属镜头B）
```

---

### 决策点 3：撤销/重做的粒度 ✅

**用户回答**: "是每一步的操作。"

**最终方案**:
- ✅ **操作记录（Event Sourcing）** - 记录每个操作，而非完整快照
- ✅ **可回放** - 撤销/重做时，回放操作历史
- ✅ **结合快照优化** - 定期创建快照，避免每次从头回放

**实现设计**:
```typescript
type WorkflowOperation = 
  | { type: 'ADD_NODE', payload: { node: WorkflowNode } }
  | { type: 'REMOVE_NODE', payload: { nodeId: string } }
  | { type: 'UPDATE_NODE', payload: { nodeId: string, changes: Partial<WorkflowNode['data']> } }
  | { type: 'ADD_EDGE', payload: { edge: WorkflowEdge } }
  | { type: 'REMOVE_EDGE', payload: { edgeId: string } }
  | { type: 'MOVE_NODE', payload: { nodeId: string, position: XYPosition } }
  | { type: 'UPDATE_VIEWPORT', payload: { viewport: Viewport } };

interface HistoryStack {
  operations: WorkflowOperation[];  // 所有操作
  currentIndex: number;              // 当前位置
  snapshots: Array<{                 // 定期快照
    index: number;
    graph: WorkflowGraph;
  }>;
}

// 撤销：回退 currentIndex，从最近的快照开始回放
// 重做：前进 currentIndex，应用下一个操作
```

---

## 📅 下一步

1. **确认决策点** - 向用户询问决策点1、2、3的选择
2. **实施阶段1** - 创建数据库表、API、前端类型定义
3. **实施阶段2** - 画布基础（多画布管理、自动保存、撤销重做）

---

最后更新：2026-10-18 18:30
