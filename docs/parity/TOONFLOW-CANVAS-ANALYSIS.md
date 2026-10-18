# Toonflow 画布能力全景分析与 MediaGo 对齐方案

**文档版本**: v1.0  
**创建时间**: 2026-10-18  
**分析范围**: Toonflow 本地版本 + MediaGo 0.1.17 复刻  
**状态**: ✅ 源码分析完成，待用户确认需求优先级

---

## 📌 核心问题：数据对齐

### 当前矛盾

#### MediaGo 的业务链
```
项目 (Document)
  └─ 章节 (Chapter)
       └─ 分镜 (Shot)
            ├─ 素材 (Assets in shots/<name>/)
            └─ 工作流? (WorkflowInstance.shotId)
```

#### Toonflow 的画布链
```
工作区目录 (Workspace Directory)
  ├─ 画布文件 (*.json)
  │   ├─ nodes: WorkflowNode[]
  │   ├─ edges: WorkflowEdge[]
  │   └─ viewport: { x, y, zoom }
  └─ 素材目录 (assets/<nodeId>/)
```

### 待确认的核心决策

#### 问题 1: 工作流与分镜的关系
**问题**: 一个分镜 ↔ 一个工作流？还是多对多？

**选项**:
- 🅰️ **一个分镜 = 一个画布文件** (shots/镜头1/workflow.json)
  - ✅ 简单直观，画布里所有节点都是这个分镜的候选/依赖
  - ❌ 无法跨分镜复用生成逻辑
  
- 🅱️ **一个章节 = 一个画布文件** (chapters/第一章/workflow.json)
  - ✅ 画布里每个"视频生成节点"对应一个分镜
  - ✅ 可跨分镜引用中间结果
  - ❌ 画布可能变得庞大，难以维护

- 🅲️ **分镜可选关联多个工作流**
  - ✅ 灵活，支持"方案A"、"方案B"并行尝试
  - ❌ 数据模型复杂

**当前 MediaGo 实现**: 方案 A（`WorkflowInstance.shotId`）

#### 问题 2: 候选视频的归属
**问题**: 工作流里的 5 个视频生成节点，它们是什么关系？

**场景**:
```
[图片] → [图生视频1] → [视频]
            ↓
       [图生视频2] → [视频]
            ↓
       [图生视频3] → [视频]
```

**选项**:
- 🅰️ **都是同一分镜的候选方案** → 用户从 3 个结果里选 1 个进分镜
- 🅱️ **分别对应 3 个不同分镜** → 批量生成，自动填充 3 个分镜
- 🅲️ **是依赖链** → 节点1 → 节点2 → 节点3，只有最终输出进分镜

**当前 MediaGo 实现**: 方案 A（`WorkflowInstance.outputCandidates[]`）

#### 问题 3: 素材归属
**问题**: 工作流里生成的中间图片/视频，放哪里？

**选项**:
- 🅰️ **MediaGo 素材库** (projects/<id>/assets/)
  - ✅ 统一管理，可在其他地方引用
  - ❌ 污染素材库，中间产物太多

- 🅱️ **工作流专属目录** (shots/<name>/workflows/<id>/assets/)
  - ✅ 隔离干净，删除工作流时一起清理
  - ❌ 无法在画布外引用

- 🅲️ **Toonflow 方式** (workspace/assets/<nodeId>/)
  - ✅ 按节点隔离，画布可跨项目共享
  - ❌ MediaGo 目前无跨项目场景

**当前 MediaGo 实现**: 方案 B（`WorkflowInstance.assetScope`）

---

## 🔍 Toonflow 核心能力清单

### 已验证的能力（从源码确认）

#### 1. 画布文件格式
```typescript
// E:/Amireux/Music/AI漫剧/toonflowLocal/apps/web/src/pages/workspace/panels/canvas/canvasFiles.ts:7
type CanvasFile = {
  toonflowCanvas: true;  // 标识符
  nodes: Node[];         // 节点数组
  edges: Edge[];         // 连线数组
  viewport: { x: number; y: number; zoom: number };  // 视口
};
```

**特点**:
- ✅ 纯 JSON 存储，人类可读
- ✅ 支持多画布（workspace 下可有多个 .json 文件）
- ✅ 自动保存（防抖 500ms）
- ✅ 冲突检测（多客户端编辑时）

#### 2. 节点类型系统
**内置节点** (packages/nodes/):
- `imageNode` - 图片输入
- `videoNode` - 视频输入
- `audioNode` - 音频输入
- `textNode` - 文本输入
- `imageGenerationNode` - 图像生成
- `videoGenerationNode` - 视频生成（核心）
- `audioGenerationNode` - 音频生成
- `director3dNode` - 3D 导演

**节点端口系统**:
```typescript
// packages/nodes/videoGenerationNode/src/index.vue:118
handles: [
  { 
    id: "in", 
    type: "target",  // 输入端口
    dataType: ["IMAGE", "VIDEO", "AUDIO", "STRING"],  // 支持多类型
    label: "图片、视频、音频、文本输入" 
  },
  { 
    id: "video", 
    type: "source",  // 输出端口
    dataType: "VIDEO", 
    label: "视频输出" 
  },
]
```

#### 3. 视频生成节点的完整能力
**配置参数**:
- `prompt` - 提示词（支持 @引用）
- `model` - 模型选择（providerId + modelId）
- `duration` - 时长
- `resolution` - 分辨率
- `ratio` - 宽高比
- `mode` - 生成模式:
  - `"text"` - 纯文本生成
  - `"singleImage"` - 单图生成
  - `"startEndRequired"` - 首尾帧（必须2张图）
  - `"endFrameOptional"` - 尾帧可选（1-2张图）
  - `"startFrameOptional"` - 首帧可选（1-2张图）
- `generateAudio` - 是否生成音频

**引用系统**:
```typescript
// packages/nodes/videoGenerationNode/src/index.vue:276
const images = refList.value.flatMap(
  (item) => item.dataType === "IMAGE" && item.value 
    ? [{ path: item.value.url, mimeType: item.value.mimeType }] 
    : []
);
```
- ✅ 支持从其他节点拖线引用
- ✅ 支持 `@节点名` 提示词引用
- ✅ 自动验证引用类型匹配

**输出管理**:
```typescript
// packages/nodes/videoGenerationNode/src/index.vue:289
outputDirectory: `assets/${id}`,  // 每个节点独立目录
```
- ✅ 历史记录（mediaHistory 组件）
- ✅ 替换视频（上传本地文件）
- ✅ 视频操作:
  - 提取音轨
  - 分离音视频
  - 截取片段
  - 截取视频帧

#### 4. 画布交互能力
**基础操作**:
- ✅ 无限画布（pan/zoom）
- ✅ 节点拖拽
- ✅ 对齐网格（16px）
- ✅ 多选（框选 + Shift 点选）
- ✅ 复制粘贴
- ✅ 撤销重做（操作历史）
- ✅ 节点搜索（快速定位）

**连线能力**:
- ✅ 端口类型检查（严格模式）
- ✅ 连线断开（悬浮按钮）
- ✅ 边缘颜色自定义
- ✅ 边缘隐藏切换

**文件操作**:
- ✅ 拖放文件到画布（自动创建对应节点）
- ✅ 素材库面板（资源浏览）
- ✅ 节点菜单（右键/双击）

#### 5. 工作区管理
**画布列表**:
- ✅ 多画布切换（标签页）
- ✅ 新建画布
- ✅ 重命名画布
- ✅ 删除画布（含素材清理）
- ✅ 复制画布（含素材）

**状态持久化**:
- ✅ 自动保存（debounce 500ms）
- ✅ 保存失败提示
- ✅ 脏数据标记
- ✅ 退出前确认

---

## 🆚 MediaGo 现有实现对比

### WorkflowGraph v4 Schema
```typescript
// E:/AI/framegendev/apps/workspace/src/domains/generation/lib/workflow-schema-v4.ts
export interface WorkflowGraph {
  schemaVersion: 4;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport: { x: number; y: number; zoom: number };
}
```

**对齐度**: ✅ 95% 兼容 Toonflow 格式

**差异**:
- MediaGo 的 `WorkflowNode.data.handles` 是静态定义
- Toonflow 的 handles 在节点组件内动态声明
- MediaGo 的 `outputs` 在 `data` 下
- Toonflow 的 outputs 通过 `useNode()` hook 管理

### 当前画布组件
**已有**:
- ✅ `WorkflowGenerationSurface.tsx` - 基于 ReactFlow
- ✅ 节点拖拽和连线
- ✅ 基础端口类型检查

**缺失**:
- ❌ 节点配置面板（当前只能连线，不能配置参数）
- ❌ 执行调度（没有"生成"按钮）
- ❌ 结果预览（生成完了看不到视频）
- ❌ 候选管理（无法在画布上看到多个候选）
- ❌ 历史记录（撤销/重做）
- ❌ 文件拖放

---

## 🎯 最小可用闭环（MVP）

### 用户故事
```
用户在分镜详情页 → 点击"工作流"标签 → 
  打开画布 → 从素材库拖入一张参考图 → 
  连到"图生视频"节点 → 填写提示词 → 
  点击"生成" → 看到进度条 → 
  生成完毕，画布上显示视频缩略图 → 
  点击"采用" → 视频进入分镜
```

### 需要补齐的能力（按优先级）

#### P0 - 核心流程
1. **节点配置面板**
   - 点击节点 → 右侧弹出配置表单
   - 提示词输入框
   - 模型选择下拉框
   - 参数调整（时长/分辨率/宽高比）

2. **执行调度**
   - 节点上的"生成"按钮
   - 生成进度显示（进度条 + 百分比）
   - 停止生成（取消按钮）

3. **结果预览**
   - 节点上嵌入视频播放器
   - 点击放大全屏预览
   - 下载按钮

4. **候选采用**
   - 节点右上角"✓ 采用"按钮
   - 点击后 → 调用后端 API → 视频添加到 `shot.assets[]`

#### P1 - 体验优化
5. **素材拖放**
   - 从 MediaGo 素材库拖到画布
   - 自动创建对应类型节点
   - 自动填充 `outputs.value`

6. **历史记录**
   - 撤销/重做（Ctrl+Z / Ctrl+Y）
   - 操作历史栈

7. **自动保存**
   - 防抖 500ms
   - 保存失败提示

#### P2 - 高级功能
8. **候选对比**
   - 一个节点生成多次 → 保留历史结果
   - 节点下方展示"候选1/2/3"
   - 切换预览

9. **批量生成**
   - 选中多个节点 → 点击"全部生成"
   - 队列管理

10. **模板系统**
    - 保存为模板
    - 从模板创建

---

## 📋 分期实施路线图

### 第一阶段：数据层对齐（1-2 天）
**目标**: 确保前后端数据模型一致

**任务**:
1. 确认用户需求（问题1-3的选项）
2. 更新后端 API schema
3. 前端 TypeScript 类型定义
4. 数据库迁移脚本（如果需要）

**交付物**:
- `docs/parity/WORKFLOW-DATA-MODEL.md` - 数据模型文档
- 后端 API 更新（如需）
- 前端类型更新

### 第二阶段：节点配置面板（2-3 天）
**目标**: 能在画布上配置节点参数

**任务**:
1. 创建 `NodeConfigPanel.tsx` 组件
2. 视频生成节点配置表单
3. 图像生成节点配置表单
4. 表单验证逻辑

**交付物**:
- 右侧配置面板
- 点击节点 → 显示表单
- 表单修改 → 更新节点 data

### 第三阶段：执行调度（3-4 天）
**目标**: 能在画布上触发生成并看到结果

**任务**:
1. 节点上的"生成"按钮
2. 调用后端生成 API
3. 轮询生成状态
4. 进度显示
5. 结果回填到节点
6. 视频预览组件

**交付物**:
- 完整的生成流程
- 进度实时更新
- 视频缩略图预览

### 第四阶段：候选管理（2 天）
**目标**: 把生成结果"采用"到分镜

**任务**:
1. "采用"按钮
2. 调用后端 API 关联素材
3. 多候选切换（如需）
4. 候选删除

**交付物**:
- MVP 闭环完成
- 用户可从画布生成视频并添加到分镜

### 第五阶段：体验优化（3-5 天）
**目标**: 补齐基础交互

**任务**:
1. 撤销/重做
2. 自动保存
3. 素材拖放
4. 节点搜索
5. 快捷键

**交付物**:
- 生产可用的画布编辑器

---

## ⚠️ 技术风险与限制

### 已知限制
1. **MediaGo 无跨项目场景**
   - Toonflow 的 workspace 是全局的
   - MediaGo 的画布绑定在 Document 下

2. **素材管理差异**
   - Toonflow: `assets/<nodeId>/` 按节点隔离
   - MediaGo: `shots/<name>/workflows/<id>/assets/` 按工作流隔离

3. **多用户协同**
   - Toonflow 有冲突检测
   - MediaGo 当前无此需求（单用户桌面应用）

### 需要调研的问题
- ❓ ReactFlow 的性能极限（节点数 > 100 时）
- ❓ 大视频文件的缩略图生成策略
- ❓ 工作流嵌套（一个节点引用另一个画布）

---

## 📝 下一步行动

### 需要用户确认
1. **问题1-3 的选项** → 决定数据模型
2. **Toonflow 最看重的 3-5 个能力** → 决定实施优先级
3. **哪些能力延后** → 避免过度设计

### 准备工作
1. **实际打开 Toonflow 浏览器** (http://localhost:3001/#/workspace)
   - 截图核心交互流程
   - 验证生成逻辑
   - 记录 UI 细节

2. **对比官方 0.1.17**
   - 确认官方是否有工作流入口
   - 如果有，对比 UI 差异

3. **输出详细设计文档**
   - 数据模型
   - API 设计
   - 组件层级
   - 状态管理方案

### 转交给 DeepSeek 的材料
- ✅ 本文档（功能清单 + 实施路线）
- ⏳ 用户确认的优先级
- ⏳ 详细设计文档
- ⏳ Toonflow 交互截图
- ⏳ MediaGo 现有代码边界

---

**文档状态**: ✅ 用户需求已确认  
**开发负责人**: Claude（不转交 DeepSeek）  
**下次更新**: 输出数据模型设计 + 开始实施第一阶段

---

## ✅ 用户确认的核心决策

### 1. 工作流与分镜的关系：多对多 + 公共模板
- ✅ **存在"公共工作流"** - 可跨分镜复用的模板
- ✅ **一个分镜可以关联多个工作流** - 用于对比不同生成方案
- ✅ **多个分镜可以使用同一个公共工作流**

**数据模型：**
```
公共工作流模板库
  ├─ 工作流模板1（可被多个分镜引用）
  ├─ 工作流模板2
  └─ ...

分镜 A
  ├─ 工作流实例1（引用模板1）
  ├─ 工作流实例2（引用模板2）
  └─ 工作流实例3（私有）

分镜 B
  ├─ 工作流实例1（引用模板1，复用）
  └─ 工作流实例2（私有）
```

### 2. 生成结果的归属：候选方案 + 依赖链
- ✅ **一个分镜有多个工作流实例** → 每个工作流产出独立的候选列表
- ✅ **工作流内的多个视频生成节点** → 既可并行（多候选），也可串行（依赖链）
- ✅ **分镜页可切换工作流** → 对比不同工作流的效果

### 3. 素材归属：工作流专属目录
- ✅ **工作流生成的素材归属于工作流**
- ✅ **路径**：`shots/<shotName>/workflows/<workflowId>/assets/<nodeId>/`
- ✅ **采用后**：从工作流素材区 → 复制到分镜正式素材区

### 4. Toonflow 全部功能保留
**必须实现（按优先级）：**
1. 无限画布交互体验（pan/zoom/拖拽/多选/框选）
2. 节点工具条（提取音轨、截取片段、替换视频等）
3. 多画布管理（标签页、新建/重命名/删除/复制）
4. 文件拖放（系统文件 → 画布节点）
5. 自动保存（防抖 + 失败提示）
6. 历史记录（撤销/重做）
7. 素材库面板、节点搜索、快捷键、对齐网格、引用系统

**不延后，全部实现。**
