# 设计交付边界

迁移资料入口：`E:/AI/MediaGo Drama/漫剧自动化工作台-设计与开发资料/README.md`。原方案与附件整理为日期快照，主文档按当前代码归纳可行性与Skill/MCP复用边界。用户明确未来是否实施未定，本轮不启动功能开发；详见DEC-027、REQ-042/043。

唯一产品方案：`docs/superpowers/specs/2026-10-14-automation-workbench-design.md`。

采用Superpowers brainstorming架构设计路径和ponytail复用原则；用户已选择保留官方风格。当前任务执行的是调研/文本/图片交付，产品实施不在此任务内。已获项目记录与本轮生成图片授权，不重复要求常规流程批准。

图片使用指定工具包PowerShell启动器，沿用现有加密凭据，不打印明文。官方截图只作本地目视参考，转写为提示词；提供方不接收截图或项目数据。输出唯一新文件，不覆盖现有资产。请求超时保留不确定结果，不自动重试。

产品设计提出复用已有ReactFlow画布与generation batch能力；toonflowLocal迁移仍保持专项待规划。图与文本冲突时以设计文本约束为准。

v2修订：沿官方丹药的章节/资源对应关系，优先复用DocumentSectionGenerator、MediaGenerationWorkspace采用与prompt-presets。默认摘要/媒体，详情按需展开；镜头方式分图片停留/轻运动/视频裁切/指定帧定格/生成视频。toonflow3001真实“女孩”画布可浏览，媒体/选中编辑作本地交互参考；不得把视频预览失败写成完成。根AGENTS自定义区增加制作指南指针，保留One受管块。
