# TASK-166 实施计划

使用 Superpowers writing-plans 的分步原则，遵循项目 inline 与单份计划约定。

- [x] 检查 Git、现有任务、前后端规范与附件来源，确认 NLE 排他边界。
- [x] 枚举新旧截图、生成可检查缩略索引并查看实际内容；检查候选遗漏对应源码。
- [x] 以独立桌面、user-data、workspace 尝试官方体验；使用 browser-harness，记录实际截图及未覆盖状态。
- [x] 逐模块形成复查索引，记录保留/补齐/待核实/待接入与依赖，更新需求/决策/台账。
- [x] 收敛 README、CURRENT-HANDOFF、AGENTS 自定义片段及规范入口，保留有价值历史，清理核实无用重复。
- [x] 验证文档链接、工具输出与 git diff；工具有逻辑时留可运行校验。仅资料/工具变更不冒称产品质量门通过。
- [x] add_session --no-commit，完成后 archive --no-commit，明确路径暂存并提交；保留其他会话改动（记录随本项提交交付）。

回退：本项提交可以独立 revert；不删除用户运行数据、不重置他人改动、不更改现有分支。临时脚本/图与日志在 `.cache/parity/task-166/`；稳定证据索引在 `docs/parity-0.1.17/`。
