# MediaGo 工作流功能需求（2026-10-18）

本文档记录用户在工作流开发过程中明确的核心需求和设计决策，是后续开发的唯一依据。

---

## 1. 核心原则

### 1.1 数据对齐："每一个分镜里面的工作流属于自己的"

**用户原话：**
> "每一个分镜里面的工作流属于自己的。你可以打开一个虚拟的桌面查看应用功能。"
> "核心是怎么对齐数据。"

**含义：**
- 一个分镜（Shot）= 一个独立的工作流画布
- 用户打开"镜头甲"的生成弹窗 → 看到"镜头甲"的工作流画布
- 用户打开"镜头乙"的生成弹窗 → 看到"镜头乙"的工作流画布
- 两个画布相互独立存储，但可以引用同一个项目素材库的资源

**技术实现要点：**
- 工作流草稿的存储 key 应该按 `{shotId}` 隔离，而不是按 `{documentId}` 或 `{blockId}`
- 后端 API 应该提供 `/api/v1/shots/:shotId/workflow`（GET/PUT）
- 前端切换分镜时，工作流画布内容应该正确切换

---

### 1.2 长期目标：对齐 Toonflow 的完整能力

**用户原话：**
> "对于工作流里面的画布，熟悉这一块的项目 http://localhost:3001/#/workspace，可以开启应该打开内置浏览器查看一下。你看看是否合适，应该是可以使用的，想怎么设计、怎么使用，将功能理解完整地复刻进来。"
> "目前一些页面逻辑和功能仍不完整，不要只模仿外观。"

**含义：**
- 不是快速 mock，而是真正理解 Toonflow 的交互逻辑、数据结构、执行模型
- 需要完整复刻，不是仅仅模仿 UI
- 需要理解底层设计，而不是表面功能

**Toonflow 参考项目信息：**
- 浏览器入口：http://localhost:3001/#/workspace
- 本地源码：`E:/Amireux/Music/AI漫剧/toonflowLocal`
- 技术栈：Vue 3 + Vue Flow + Pinia + Element Plus + Bun/Express/TypeScript
- 许可：MIT，版权署名 HBAI-Ltd

---

### 1.3 开发方式：先分析、后输出给 DeepSeek

**用户原话：**
> "你先别急着开发整理我的目的和需求。整理详细我打算再转手到没有媒体图片识别的 deepseek 来开发。"
> "你可以一直跟我对话明白我的具体需求。"

**含义：**
- Claude 负责分析、理解、设计方案
- DeepSeek 负责具体编码实现
- 输出的方案必须清晰、可执行、有边界，让 DeepSeek 能直接开始编码

---

## 2. 已废弃的内容

以下内容已被用户明确标记为废弃，不再作为开发依据：

**用户原话：**
> "你不要看交接文档里面的，核心看会话中聊天的，以前的作废。"
> "根据当前聊天的理解来修改交接，继续开发。"
> "废弃的文档你就直接删除掉，不要再影响了。"

**已废弃的文档：**
- `CLAUDE-CANVAS-ANALYSIS.md` 第 8 节"前序建议"（8 条建议）
- 任何未经本轮会话确认的"技术路线"、"分期实施"、"数据模型"建议

---

## 3. 用户回答的核心问题（完整记录）

### ⚠️ 重要提示
本节记录了所有和用户的对话细节，包括：
- Claude 提出的问题（原文）
- 用户的回答（原文）
- Claude 的理解和推断（明确标注）
- 技术实现要点

**目的**: 避免重复提问，确保后续开发基于用户明确的需求而非推测。

---

### 3.1 关于"工作流是什么"

**Claude 问：**
- 工作流是分镜级别的编辑工具，还是跨分镜的自动化执行引擎？
- 用户在工作流画布上操作时，是在"为某个分镜设计生成方案"，还是"编排一次性批量生成多个分镜"？

**用户答：**
> "核心问题工作流说个有公共工作流都可以使用，分镜可以给多个工作流使用看生成的效果。"

**解读：**
- ✅ 存在"公共工作流"概念 - 可以跨分镜复用的模板或预设
- ✅ 一个分镜可以关联多个工作流 - 用于对比不同生成方案的效果
- ✅ 多对多关系：多个分镜可以使用同一个公共工作流，一个分镜可以尝试多个工作流

**技术实现要点：**
- 需要"工作流模板库"（公共工作流池）
- 需要"分镜 ↔ 工作流实例"的关联表（多对多）
- 工作流实例需要区分：私有（属于单个分镜）vs 引用公共模板
- 分镜详情页应该显示"当前关联的工作流列表"，支持切换和对比

---

### 3.2 关于"生成结果的归属"

**Claude 问：**
- 单个分镜能否对应多个候选视频？还是一个工作流只能产出一个最终视频？
- 如果工作流里有 5 个视频生成节点，它们是：
  - A. 都是"同一个分镜的不同候选方案"？
  - B. 分别对应"5 个不同分镜"的素材？
  - C. 是"中间生成节点 + 最终输出节点"的依赖链？

**用户答：**
> （根据"分镜可以给多个工作流使用看生成的效果"）

**解读：**
- ✅ 选项 A + 依赖链：一个分镜可以有多个工作流实例，每个工作流产出候选视频
- ✅ 工作流内的多个视频生成节点：既可以是"候选方案并行"，也可以是"依赖链串行"
- ✅ 用户可以在分镜页切换工作流，对比不同工作流产出的效果

**技术实现要点：**
- 每个工作流实例有独立的 `outputCandidates[]` 数组
- 分镜详情页显示"工作流A的候选1/2/3" vs "工作流B的候选1/2"
- 采用逻辑：从某个工作流的某个候选 → 添加到分镜的最终素材

---

### 3.3 关于"素材归属"

**Claude 问：**
- 工作流里生成的中间图片，应该进 MediaGo 的"素材库"还是"工作流专属目录"？

**用户答：**
> "素材归属看聊天记录属于工作流。"

**解读：**
- ✅ 工作流生成的素材**归属于工作流本身**，不直接进项目素材库
- ✅ 路径应该类似：`shots/<shotName>/workflows/<workflowId>/assets/<nodeId>/`
- ✅ 用户"采用"某个候选后，才把该素材复制/链接到分镜的正式素材区

**技术实现要点：**
- 工作流素材隔离存储，避免污染项目素材库
- 删除工作流时，清理其专属素材目录
- "采用"操作：从工作流素材区 → 复制到分镜素材区（或创建引用）

---

### 3.4 关于"Toonflow 的借鉴边界"

**Claude 问：**
- 你最看重 Toonflow 的哪 3-5 个核心能力？
- 哪些能力你明确不需要或可以延后很久？

**用户答：**
> "看重 Toonflow：无限画布交互体验、节点工具条（提取音轨、截取片段等）、多画布管理、文件拖放、自动保存、历史记录（撤销重做）。全部功能保留。"

**核心功能列表（全部保留）：**
1. ✅ **无限画布交互体验** - pan/zoom/拖拽/多选/框选
2. ✅ **节点工具条** - 提取音轨、分离音视频、截取片段、截取视频帧、替换视频
3. ✅ **多画布管理** - 标签页切换、新建/重命名/删除/复制画布
4. ✅ **文件拖放** - 从系统文件管理器拖放到画布，自动创建节点
5. ✅ **自动保存** - 防抖保存、保存失败提示、脏数据标记
6. ✅ **历史记录** - 撤销/重做操作栈
7. ✅ **其他 Toonflow 能力** - 包括但不限于：
   - 素材库面板
   - 节点搜索
   - 快捷键
   - 对齐网格
   - 连线类型检查
   - 引用系统（@节点名）
   - 历史版本切换（mediaHistory）

**不延后，全部实现。**

---

### 3.6 关于"工作流实例的共享粒度"（决策点1）

**Claude 问：**
> 场景: 分镜A和分镜B都关联了"公共工作流1"
> 
> 问题: 它们共享同一个画布数据吗？还是各自有独立副本？
> 
> 选项:
> - A. 共享同一个画布
> - B. 关联时复制
> - C. 区分模板和实例

**用户答：**
> "不共享画布数据。分镜A 可以有多个工作流，每一个工作流都可以为这个分镜制作成果视频。公共工作流就是一个制作视频的模块。"

**Claude 的理解：**
1. ✅ **不共享画布数据** - 分镜A和B虽然都"使用"公共工作流，但各自有独立的画布副本
2. ✅ **一个分镜可以有多个工作流** - 分镜A可以同时有"工作流1"、"工作流2"、"工作流3"
3. ✅ **每个工作流都可以产出视频** - 工作流不是中间步骤，而是完整的视频制作流程
4. ✅ **公共工作流 = 模板** - "公共工作流"的作用是作为"模板"或"制作视频的模块"，供分镜复用

**技术实现要点：**
```typescript
// 数据模型调整：
// - WorkflowTemplate: 公共的、可复用的模板（只读）
// - WorkflowInstance: 从模板创建的实例，分镜私有，可独立编辑

// 创建工作流流程：
用户在分镜A页面点击"从模板创建工作流"
  → 选择"公共工作流1"
  → 后端：复制 template.graph → 创建新的 WorkflowInstance (instanceA)
  → 前端：打开 instanceA 的画布，分镜A可以独立编辑

用户在分镜B页面也选择"公共工作流1"
  → 后端：再次复制 template.graph → 创建新的 WorkflowInstance (instanceB)
  → instanceA 和 instanceB 的画布完全独立

// 数据库关系：
WorkflowTemplate "公共工作流1" (id=template1)
  ├─ WorkflowInstance A (id=instanceA, templateId=template1, shotId=shotA)
  └─ WorkflowInstance B (id=instanceB, templateId=template1, shotId=shotB)

// 画布编辑：
分镜A 修改 instanceA 的画布 → 只影响 instanceA
分镜B 修改 instanceB 的画布 → 只影响 instanceB
模板"公共工作流1"保持不变（只读，除非管理员更新）
```

**关键结论：**
- ✅ 选项 B + C 的混合：从模板创建时复制，但保留模板作为参考
- ✅ 一个分镜 N 个工作流实例（多对多关系）
- ✅ 每个工作流实例都是完整的视频制作流程

---

### 3.7 关于"素材目录的归属"（决策点2）

**Claude 问：**
> 场景: "公共工作流1"被多个分镜关联，执行生成后，素材存哪里？
> 
> 选项:
> - A. 素材属于工作流 - 所有分镜共享
> - B. 素材属于分镜 - 每个分镜各自存一份

**用户答：**
> "中间素材是这个分镜的的素材。"

**Claude 的理解：**
1. ✅ **素材归属于分镜** - 工作流生成的素材，归属于该分镜
2. ✅ **每个分镜独立存储** - 分镜A的工作流生成的素材，存在分镜A的目录下
3. ✅ **不共享素材** - 即使分镜A和B用的是同一个模板，生成的素材也分别存储

**技术实现要点：**
```bash
# 文件系统结构：
projects/<projectId>/
  └─ shots/
      ├─ 镜头A/
      │   ├─ assets/                    # 分镜A的正式素材（已采用的）
      │   │   ├── final-video.mp4       # 采用后的视频
      │   │   └── final-audio.mp3
      │   └─ workflows/
      │       ├─ <instanceA1>/           # 工作流实例1
      │       │   ├── canvas.json
      │       │   └── assets/            # ⭐ 这个工作流生成的素材
      │       │       ├── <nodeId1>/
      │       │       │   ├── output.mp4
      │       │       │   └── history/
      │       │       │       ├── v1.mp4
      │       │       │       └── v2.mp4
      │       │       └── <nodeId2>/
      │       │           └── output.png
      │       └─ <instanceA2>/           # 工作流实例2
      │           └── assets/            # 另一个工作流的素材（独立）
      └─ 镜头B/
          └─ workflows/
              └─ <instanceB1>/           # 即使从同一个模板创建，素材也独立存储
                  └── assets/

# 路径规则：
工作流中间素材: shots/<shotName>/workflows/<workflowId>/assets/<nodeId>/
分镜正式素材:   shots/<shotName>/assets/

# 采用逻辑：
用户在工作流画布上点击"✓ 采用"
  → 从 shots/镜头A/workflows/<instanceA1>/assets/<nodeId>/output.mp4
  → 复制到 shots/镜头A/assets/<assetId>.mp4
```

**关键结论：**
- ✅ 选项 B：素材属于分镜
- ✅ 路径：`shots/<shotName>/workflows/<workflowId>/assets/`
- ✅ 每个分镜的工作流素材完全隔离

---

### 3.8 关于"撤销/重做的粒度"（决策点3）

**Claude 问：**
> 问题: 撤销操作是保存整个画布快照，还是记录每个操作？
> 
> 选项:
> - A. 画布快照（Toonflow 方式）
> - B. 操作记录（Event Sourcing）

**用户答：**
> "是每一步的操作。"

**Claude 的理解：**
1. ✅ **记录每个操作** - 不是保存完整快照，而是记录操作历史
2. ✅ **可回放** - 撤销时，回放操作历史到指定状态
3. ⚠️ **实现复杂度更高** - 需要设计操作类型、序列化、回放逻辑

**技术实现要点：**
```typescript
// 操作类型定义：
type WorkflowOperation = 
  | { type: 'ADD_NODE', payload: { node: WorkflowNode } }
  | { type: 'REMOVE_NODE', payload: { nodeId: string } }
  | { type: 'UPDATE_NODE', payload: { nodeId: string, data: Partial<WorkflowNode['data']> } }
  | { type: 'ADD_EDGE', payload: { edge: WorkflowEdge } }
  | { type: 'REMOVE_EDGE', payload: { edgeId: string } }
  | { type: 'MOVE_NODE', payload: { nodeId: string, position: { x: number, y: number } } }
  | { type: 'UPDATE_VIEWPORT', payload: { viewport: { x: number, y: number, zoom: number } } };

// 历史栈：
interface HistoryStack {
  operations: WorkflowOperation[];  // 所有操作记录
  currentIndex: number;              // 当前位置
}

// 撤销逻辑：
function undo(stack: HistoryStack, graph: WorkflowGraph): WorkflowGraph {
  if (stack.currentIndex <= 0) return graph;
  
  // 回退到上一个操作之前的状态
  stack.currentIndex--;
  
  // 从初始状态重新应用所有操作到 currentIndex
  return replayOperations(stack.operations.slice(0, stack.currentIndex));
}

// 重做逻辑：
function redo(stack: HistoryStack, graph: WorkflowGraph): WorkflowGraph {
  if (stack.currentIndex >= stack.operations.length) return graph;
  
  // 应用下一个操作
  const operation = stack.operations[stack.currentIndex];
  stack.currentIndex++;
  
  return applyOperation(graph, operation);
}

// 优化：可以定期创建快照，避免每次都从头回放
interface OptimizedHistoryStack extends HistoryStack {
  snapshots: Array<{
    index: number;        // 快照对应的操作索引
    graph: WorkflowGraph; // 快照时的完整画布状态
  }>;
}
```

**关键结论：**
- ✅ 选项 B：操作记录（Event Sourcing）
- ✅ 需要定义完整的操作类型
- ✅ 可以结合快照优化性能（每 N 个操作创建一次快照）

---

### 3.9 关于"记录对话历史"的提醒

**用户说：**
> "你要知道，你上述你问我的问题，你都借助一个 MD 的文档，然后把你问题我回复的你理解的都要记下来，然后你怎么做的都要记下来。否则，你每次来问我都是一样的问题。所以，你要从这个会话里面做一从头开始问的问题，我回复的都要记下来，然后你怎么理解的都要记下来。然后，方便你以后再来问我，你都知道。"

**Claude 的理解和行动：**
1. ✅ **创建持久化记录** - 把所有问答都写到 MD 文档里
2. ✅ **记录三部分内容**：
   - Claude 的问题（原文）
   - 用户的回答（原文）
   - Claude 的理解和技术实现（推导）
3. ✅ **避免重复提问** - 后续会话先读这个文档，不再问已经回答过的问题
4. ✅ **文档位置**: `E:/AI/framegendev/docs/parity/WORKFLOW-REQUIREMENTS.md`

**已记录的完整对话**:
- 3.1 ~ 3.5：前面的核心问题
- 3.6 ~ 3.8：本轮的三个决策点
- 3.9：本条元提醒

---

---

## 4. 后续开发计划（待用户确认后更新）

### 4.1 第一阶段：修复当前问题
- [ ] 修复后端编译错误（如果有）
- [ ] 确认前端能正常启动
- [ ] 验证现有工作流画布的基本交互

### 4.2 第二阶段：分析 Toonflow
- [ ] 实际打开 Toonflow（http://localhost:3001/#/workspace）
- [ ] 阅读 Toonflow 源码，理解核心设计
- [ ] 对比官方 0.1.17 的工作流功能
- [ ] 输出功能对照表和技术路线建议

### 4.3 第三阶段：数据模型对齐
- [ ] 设计工作流 ↔ 分镜 ↔ 素材的数据模型
- [ ] 修改后端 API（按 shotId 隔离）
- [ ] 修改前端状态管理（分镜切换时工作流切换）
- [ ] 验证数据隔离和持久化

### 4.4 第四阶段：Toonflow 交互对齐
- [ ] 实现节点工具条
- [ ] 实现素材拖放
- [ ] 实现节点预览
- [ ] 实现自动保存
- [ ] 验证交互流程

### 4.5 第五阶段：执行流程
- [ ] 设计执行引擎（或标记【待接入】）
- [ ] 实现生成 → 候选区 → 采用流程
- [ ] 验证端到端闭环

---

## 5. 参考资料

### 主项目
- 根目录：`E:/AI/framegendev`
- 当前分支：`codex/nle-export`
- 差距表：`E:/AI/framegendev/docs/parity/GAP.md`

### Toonflow 参考项目
- 浏览器入口：http://localhost:3001/#/workspace
- 本地源码：`E:/Amireux/Music/AI漫剧/toonflowLocal`

### 官方参考
- 官方版本：MediaGo Drama 0.1.17
- 官方截图：`E:/AI/mediago-gap-shots/快照-0.1.17-完整流程-2026-10-17/`
- 官方前端导出：`E:/AI/framegendev/.cache/ref/web/assets`

---

## 6. 重要提醒

1. **本文档是唯一需求来源**：后续开发以本文档为准，不再参考已废弃的交接文档
2. **持续更新**：用户回答新问题后，立即更新本文档
3. **给 DeepSeek 的指令**：基于本文档输出清晰、可执行的开发方案
4. **不要重复提问**：用户已经回答的问题，记录在第 3 节，不要再问

---

最后更新：2026-10-18
