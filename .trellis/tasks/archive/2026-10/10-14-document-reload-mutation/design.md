# TASK-004 设计与修改边界

关联 REQ-005、REQ-018。用户于本轮要求继续开发，实施本项阻塞修复。

## 行为与数据流

持久化 Markdown → WritingEditor → MarkdownHybridEditor → Tiptap →
useMarkdownEditorPerformance → updateDocumentContent → document-save-queue → 原接口。
无操作加载不得回传不同正文；用户输入、格式工具和流式提交仍需保存。

## 排查与预期范围

用实际 MarkdownHybridEditor 测试捕获初始化后的 onChange，并检查 Tiptap
交易与节点。四组回归确认未操作时 onChange 各调用一次并追加尾部空白。
浏览器检查 schema 默认节点为 sectionMediaPreview（优先级1100），StarterKit
的 trailingNode 未指定 node，采用这个默认节点。评论装饰初始化的元数据交易
触发其 appendTransaction，尾部自动插入 src/title 为空的媒体节点；随即更新并保存。
这个 React NodeView 在 effect 中创建也触发 GAP-002 的 flushSync 警告。

修复：正文编辑器的统一 schema 配置 `trailingNode: false`，覆盖解析/预热与交互。
保留原始文件空白和实体，不移除用户已有内容。用户可通过 Enter、格式工具与现有
Gapcursor 编辑文档；使用真实编辑回归确认。设置编辑器的 schema 默认节点为 paragraph，
没有相同的空媒体问题，本项不修改它。

修改 MarkdownHybridEditor.tsx 的编辑器配置和同目录测试。新增模板回归进一步确认
locked-heading.ts 的属性 imprint 会发出 update，使原有空白被序列化归一化并保存。
这笔交易仅设置不导出到 Markdown 的 locked/sectionId 属性，因此使用 Tiptap 原生
`preventUpdate` 元数据阻止该内部交易触发保存；标题保护、正文编辑仍执行原路径。
复用现有组件、保存队列与接口，不增加依赖。
不清理已有正文，不把空白归一化当作修复，不改模型页、后端、公共数据结构或生产数据。

## 验收与回滚

真实编辑器覆盖中文、已有空段落/实体、标题、列表、外部内容同步和真实输入。
浏览器使用 TASK-001 独立数据；比对完整文件 SHA256 和版本，执行连续刷新、切换重开、
服务重启。实际编辑后应保存；保存后的无操作恢复不得再写入。
仅回滚本任务代码修改可恢复原行为，不涉及数据迁移。
