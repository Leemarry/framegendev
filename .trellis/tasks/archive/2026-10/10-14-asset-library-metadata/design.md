# TASK-031 设计

采用现有资产扩展。独立元数据表会引入无需的连接、迁移和生命周期；仅前端 localStorage 无法满足API持久化，均不采用。

- domain.AssetModel 增加 TagsJSON（TEXT默认[]）、Note（TEXT默认空）、Rating（INTEGER默认0）。JSON在service编码/解码，repository只持久化；中央AutoMigrate向旧表加列。
- MediaAsset API增加 tags:string[]、note:string、rating:number。PUT使用指针区分省略和显式空值；null视为省略，至少一个有效字段。标签最多20个，每个trim后1–40 Unicode字符，去空/去重；备注保留空白，最多4000字符，评分整数0–5。filename请求兼容，generation的UpdateFilename保留。
- service.Update(id, projectID, payload)锁内读取资产，按真实ProjectID精确校验写入scope，验证后一次更新并重读。未知资产/其他scope同一404；校验sentinel转400，DB错误500。元数据修改不动文件或媒体派生字段。
- api添加updateMediaAssetMetadata；详情独立AssetLibraryMetadataEditor表单。成功后重新读取列表，失败显示错误/保留草稿；item key重置表单。使用媒体真实projectId，兼容项目视图中可见的全局素材。
- 扩展现有搜索，不建立新状态库。纯selected条目元数据只读；合并条目使用物理媒体记录。
- 官方整页属于TASK-032，本项详情沿用token/组件密度，支持滚动和键盘。回滚仅撤销本项代码，新增列保留，不删除数据。

文件边界：domain/media_models.go持久化；repository/media_repo.go既有metadata更新复用；service/media/store.go与新library_metadata.go负责投影、校验和更新；handlers/media.go负责HTTP；api/media.ts扩展类型/调用；AssetLibraryButton接线；lib/asset-library.ts搜索；MetadataEditor与必要测试。scope读/删除历史行为另记后续核实，不扩大本项破坏性行为。
