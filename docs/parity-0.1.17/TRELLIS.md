# Trellis 项目接入

接入日期：2026-10-14。版本：`@mindfoldhq/trellis@0.6.17`。
官方文档：[中文文档](https://docs.trytrellis.app/zh)。

## 安装范围

仅在 `E:\AI\framegendev` 接入。CLI 通过 npm 临时执行，未加入产品依赖，未全局安装；没有修改用户级 Codex 配置。

| 路径                                       | 用途                                          |
| ------------------------------------------ | --------------------------------------------- |
| `AGENTS.md`                                | 项目入口，Trellis 指引在 One CLI 受管片段之外 |
| `.trellis/workflow.md`                     | 官方工作流与阶段说明                          |
| `.trellis/config.yaml`                     | 项目配置；关闭自动提交，Codex 使用 inline     |
| `.trellis/spec/frontend/`                  | 当前 React 工作区的实际规范                   |
| `.trellis/spec/backend/`                   | 当前 Go 服务的实际规范                        |
| `.trellis/spec/guides/project-workflow.md` | 需求来源、授权、隔离与验收规则                |
| `.trellis/tasks/`                          | 每任务 PRD、设计引用、计划、上下文与归档      |
| `.trellis/workspace/amireux/`              | 会话日志与交接索引                            |
| `.trellis/scripts/`                        | 本地 Python 任务、上下文、日志工具            |
| `.agents/skills/`                          | Trellis 的项目技能                            |
| `.codex/`                                  | 项目级 Codex 配置、hooks 与 agent 模板        |
| `.gitattributes`                           | Trellis 日志的 union 合并规则                 |

虽然源码是多包工程，本轮采用统一的 frontend/backend/guides 规范入口，未建立额外 package 路由。以后需要分别治理各包再扩展。

## 与已有记录的关系

[需求](REQUIREMENTS.md)、[任务台账](TASKS.md)、[决策](DECISIONS.md) 仍是产品范围与编号的依据。Trellis 承载执行材料和会话记录，通过编号和链接关联，避免两份需求各自变化。

Superpowers 用于头脑风暴和模块设计；Trellis 管理任务、规范、执行记录及续作。已有[模型接入设计](../superpowers/specs/2026-10-14-model-access-design.md)继续沿用，仍待评审。

任务树（已完成项进入 archive/2026-10）：

- [官方对齐总任务](../../.trellis/tasks/10-14-official-0-1-17-parity/prd.md)：产品范围索引，planning。
- [TASK-001 运行基线](../../.trellis/tasks/archive/2026-10/10-14-isolated-runtime-baseline/prd.md)：独立环境与持久化复验通过，completed。
- [TASK-004 文档恢复](../../.trellis/tasks/archive/2026-10/10-14-document-reload-mutation/result.md)：源码修复及224项文档回归通过，completed。
- [GAP-003 Windows质量门](../../.trellis/tasks/archive/2026-10/10-14-windows-backend-quality/result.md)：完整check/test/race/build通过，completed。
- [TASK-002 Windows MCP](../../.trellis/tasks/archive/2026-10/10-14-windows-mcp-resolution/result.md)：双配置真实MCP与隔离后端替换/文档一致性验收通过，completed。
- [TASK-003 ACP退出核实](../../.trellis/tasks/10-14-acp-startup-exit/prd.md)：下一项单独规划，runtime-config本次200，清理exit1仍待判断。
- [TASK-010 模型接入](../../.trellis/tasks/10-14-model-access/prd.md)：待评审，依赖 TASK-001，planning。

其他模块暂保留在台账，推进时再创建对应任务。父子关系不自动表示依赖；依赖明确写在子任务材料中。

## 后续使用

在 `E:\AI\framegendev` 下启动新会话或续作：

```powershell
python -X utf8 .trellis/scripts/get_context.py
python -X utf8 .trellis/scripts/get_context.py --mode phase
python -X utf8 .trellis/scripts/get_context.py --mode packages
python -X utf8 .trellis/scripts/task.py list
```

AI 按 `AGENTS.md` 读取 `trellis-start` 技能和相关规范，检查台账与实际源码，再继续当前模块。用户已授权持续记录项目任务，创建和更新记录不重复申请。

新模块形成需求和验收条件后，创建任务；复杂模块补设计和实施计划。产品修改前核实既有授权、依赖与隔离数据目录，再激活任务：

```powershell
python -X utf8 .trellis/scripts/task.py create "模块名称" --slug module-name --description "范围与验收" --assignee amireux --meta ledger_id=TASK-xxx --no-start
python -X utf8 .trellis/scripts/task.py start <任务目录名>
```

`--no-start` 创建 planning 记录；`start` 才开始执行。当前接入未激活任何产品任务。默认在主会话开发和检查，未开启并行 agent。

结束前写回台账与验收记录，保存会话；任务真正完成才归档：

```powershell
python -X utf8 .trellis/scripts/add_session.py --title "本次工作" --commit "-" --summary "改动、实际验证、剩余事项" --no-commit
python -X utf8 .trellis/scripts/task.py archive <已完成任务目录名> --no-commit
```

设置 `session_auto_commit: false`；这些记录不触碰 Git 暂存区或提交。未经明确指示不提交、推送。禁止访问生产 `workspace-v2`，测试只用独立目录。

## 自动 hooks 的边界

已生成 `.codex/hooks.json` 和对应脚本，但未验证 Codex 桌面端自动触发。官方模板说明 hooks 还依赖客户端版本、用户级开关与一次性 hooks 审阅；本次没有修改全局设置，也没有宣称自动 hooks 或命令菜单已激活。

即使 hooks 未启用，项目 `AGENTS.md`、技能文件和本地 Python 脚本仍能提供完整的手动读取与续作路径。本次以这条路径完成集成验证。

## 本轮验证

已核对 22 份文档中的 36 个本地链接、实际规范无占位项、任务父子关系和上下文文件、One CLI 受管片段校验和及新增文档格式。`get_context.py`、任务创建/校验/归档、日志记录及 hook 脚本手动调用通过。bootstrap 已归档，产品任务保持 planning；Git HEAD 和暂存区未改变。

本轮仅接入工具与记录；产品启动、测试、构建及真实生成未执行。hook 脚本手动调用通过不代表客户端自动触发已验证。

## 维护方式

保留本项目自定义规范，更新 Trellis 时审阅本地差异。需要升级时在项目根目录执行锁定目标版本的 npm 命令，例如当前版本的更新入口：

```powershell
npm exec --yes --registry=https://registry.npmmirror.com --package=@mindfoldhq/trellis@0.6.17 -- trellis update
```

不要覆盖本地自定义文件，不编辑 npm 缓存包或 `.template-hashes.json` 来绕过冲突。One CLI 的受管 AGENTS 内容仍通过其模板维护。
