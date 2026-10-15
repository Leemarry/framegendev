# TASK-080 音频章节历史恢复

关联REQ-019/044/045。个人制作流程需要重新进入音频章节后保留本地提示词与失败/取消记录。现有generationHistory.isChatMessage恢复校验遗漏audio，虽然ChatMessage/GenerationKind及调用方支持audio，导致现有version1存储和旧格式在恢复时丢弃音频消息。

范围仅现有generationHistory.ts的一处类型校验与useGenerationMessages.test.ts的真实存储/重新载入回归。复用已有Zustand persist、storage事件与hook；无需新schema/store/API/依赖，不触及会话2导航或商业用量。TASK-181恢复补项仍待验收，互不依赖。

验收：先重现audio提示词/失败消息经过持久化恢复后丢失，再修复并保留完整消息；卸载、清空内存、使用原version1值重新hydrate并重新挂载hook后可见；别scope隔离、未知类型丢弃仍成立，原图片/视频/文本回归通过。前端lint/format/build及相关测试实际通过。若浏览器启动仍被自动审批拒绝，明确记录UI重开未跑，不以测试冒充界面验收、不标TASK-080整体完成。真实生成、商业用量和外部接入不在本项。
