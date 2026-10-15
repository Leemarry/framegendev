# TASK-166 结果

## 已完成

- 盘点 `E:/AI/mediago-gap-shots/screenshots`：106 张，105 张 1920x1080 桌面图，1 张 529x480 裁图；无相同 SHA256。旧 `exe-flow` 保持 43 张 1600x1136 历史证据，其中00/01两图完全相同。缩略索引和机器清单在 `.cache/parity/task-166/new/`，可提交的证据在 `docs/parity-0.1.17/evidence/2026-10-15/`。
- 逐组查看新图并核对错名/漏态：历史、表格、生成历史、Drami、导入/导出和 NLE 示例均不应只按文件名认定完成。结论见 `docs/parity-0.1.17/BASELINE-REVIEW.md`。
- 使用独立 Windows desktop `WinSta0/MediaGoParityAudit166`、独立 user-data/APPDATA/LOCALAPPDATA/`MEDIAGO_WORKSPACE_DIR` 启动官方 EXE；实际走空项目、新建文档、表格、历史 diff/恢复、用户菜单、设置/存储/扩展，PrintWindow 得到 1600x1136 非空窗口。官方隔离进程已关闭；不触碰生产 `workspace-v2`。
- 当前开发页在既有隔离实例上核实：项目导入/打开目录是“待接入”，卡片菜单只有打开/重命名/归档/移到垃圾箱；设置只展示现有实现/入口。新建文档与模型双栏测试 17 项全通过。
- 现有代码证据已关联：新建文档、历史/差异/恢复、TipTap H1-H4/列表/引用/代码/链接/图片/表格、跨项目搜索、模型版本/供应商选择、素材 scope/引用、Billing、Agent/PromptPack。未重复实现候选180/183/187/188/189。
- 补充 `REQ-045~047`、`DEC-030`、`TASK-166` 与 P0 `TASK-181`；调整 TASK-020/062/070 与后续顺序，保留 TASK-010/170 待评审/未定和 TASK-040/041 其他会话所有权。
- 资料入口改为渐进读取：短 README、活跃 CURRENT-HANDOFF、新 BASELINE-REVIEW；旧 CURRENT-HANDOFF 改历史快照；前端 README 改为实际目录/命令/隔离边界说明；项目规范强调按需加载而不是全量 MD/技能。

## 当前保留差距

- TASK-181 尚未实现：`document-save-queue.ts` 遇409会自动采用服务器版本号后重试本地全文，可能覆盖另一窗口/Agent。需要独立产品任务实现保留双方修改、合并/重载、失败与重开验证。
- TASK-060/062 的导入、导出、新窗口仍待开发；TASK-020/090/100/110/120/130/140 等设置、存储、扩展、商业和安装状态不能由截图替代真实能力。
- 官方 EXE 的完整原生菜单、商业动作、真实生成/Agent/安装/清理未执行；本轮不伪造成功。新增开发实例启动在工具审核中被 `blocked by policy`，未宣称开发 UI 全量通过。
- GAP-004 旧共享 `doc-ref-a` 的 `workspace_save` 来源仍未确认，原失败 baseline 保留。

## 实际验证

- `pwsh -NoProfile -File scripts/parity/inspect-screenshots.ps1 ...`：106 张、9 张缩略表、0 个重复 hash。
- `pwsh -NoProfile -File scripts/parity/start-official-desktop.ps1 -AuditDirectory .cache/parity/task-166-launch-check -DesktopName MediaGoParityLauncherCheck -DebugPort 9227`：隔离官方实例成功启动；随后已关闭该实例。
- PowerShell AST parse：`scripts/parity/start-official-desktop.ps1` 通过。
- 启动器目录越界、非法desktop名称、非法端口三个guard均拒绝；原图清单106项路径/hash逐项相符，AGENTS受管区与HEAD一致。
- 变更文档相对链接、指定资料的oxfmt格式与Trellis任务上下文校验通过；未对其他会话产品文件执行格式重写。
- 根AGENTS全文件oxfmt检查会改动既有One CLI受管区（HEAD同样存在），因此保留该区原样；自定义区与formatter输出一致，受管区逐字核对未改。提交时以这些明确范围的检查替代会重写受管区的自动格式hook。
- `pnpm -C apps/workspace exec vitest run src/domains/workspace/components/NewDocumentDialog.test.tsx src/domains/generation/components/GenerationModelRoutePicker.test.tsx`：2 files / 17 tests passed。
- `git diff --check`：通过（仅现有工作树换行提示）。
- 未运行全量前端 lint/format/build、Go check/test/build或当前开发 UI 全量验收；这些不属于本资料复查的已执行门，后续产品任务必须重新运行。本轮开发UI只在自有标签只读核实既有隔离31435的项目/菜单/设置入口。
