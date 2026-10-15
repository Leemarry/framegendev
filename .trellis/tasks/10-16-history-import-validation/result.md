# TASK-080 本地导入历史校验结果

本子项仅验收本地图片/视频导入服务的输入校验一致性；整体生成历史、UI重开、真实生成/采用和用量仍未完成。不发送生成或Agent请求。

## 复现与修改

- 隔离31450真实API提交有效PNG后跟不存在素材，返回404却留下`media-library-ea2ccbf05e033a92`；复现数据保留，缓存证据`.cache/parity/task-080-import/repro-partial-tasks.json`。
- 同请求重复ID另实测留下两条历史；保留失败样本`media-library-1c0204dcf4473da9`/`media-library-2c462f0d9f585392`。
- `ImportGenerationMediaAssets`先只读解析已有/候选会话，校验全部素材的存在/类型/项目，再调用原会话与任务写入。仅请求内trim/去重并保序，复用`domain.CleanProjectID`。显式命名创建未传scope时保留ID并默认studio。
- 无API、公共模型、依赖、仓储或通知变更。不承诺数据库写入中断下的批量事务或跨请求幂等；500仍可能保留已成功写入部分。

## 已运行

- 回归先失败再修复；最终`go test ./internal/service/generation -run TestImportGenerationMediaAssets -count=1`通过。包括已有图片/视频成功、8组新建/已有会话拒绝、不改会话、重复ID与无scope显式创建。
- 真实HTTP：新会话混合缺失404，零task/无空会话；已有会话失败完整记录不变；scope不符400、类型不符400、跨项目404；有效重复ID仅一条、media-library来源/零外部用量、素材URL200、project/kind/scope查询隔离通过。
- 成功任务`media-library-94a9fbf8968d652d`，会话`s1-history-final-existing`；无scope命名会话`s1-final-without-scope`。停止并重启自己的31450后端后，两份完整历史记录及三项目全部文档记录不变。缓存`api-accepted.json`、`no-scope-accepted.json`、`documents-before.json`可复核。
- 官方独立9242实际点击项目生成历史的图片/音频，音频URL及DOM确认空态与“暂无可用供应商/模型接入”。未登录、未生成。初次截图仍显示上一项选中态，不能作为稳定音频视觉验收；已补稳定截图并视觉检查，见`evidence/official-history-audio.png`。这只证明官方空态，不代表本地UI已验收。

## 质量门与集成

- 首轮Windows完整门为修复真实复验暴露的重复ID/无scope问题主动中止，退出201，不算通过。
- 次轮tidy/fmt/vet/lint/build及generation race通过，但prompt快照因临时Go LF与检出golden CRLF不同失败，整门退出201，不算通过。
- 补跑首次日志路径因脚本切换cwd解析失败，未进入门；改用绝对日志路径。最终同时临时规范化tracked Go/golden，完整Windows check通过：tidy/fmt/vet/lint、三个可执行构建、Swagger重新生成、全部`go test -race ./...`（generation45.562s、prompt1.368s）。finally精确恢复原字节，工作树只剩本项文件、无go.mod/go.sum变更。独立Windows build门`go build ./...`也退出0。日志在`.cache/parity/task-080-import/windows-check-final.log`。
- 主目录尚未集成本项。完成Windows门、串行集成及主HTTP/持久化验证后再归档本后端子项；181旧窗口恢复及080音频UI子项保持in_progress。
