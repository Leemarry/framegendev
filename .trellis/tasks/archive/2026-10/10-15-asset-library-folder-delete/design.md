# 技术设计

现有 `MediaAssetRepository` 是素材目录唯一数据库边界，`MediaAssets` 服务持有并发锁，handler 负责 HTTP 映射；前端 `AssetLibrary` 持有 scope/`folderId` URL 与 SWR，`AssetLibraryFolders` 负责目录列表和表单。沿这些边界扩展，不新增媒体目录抽象。

repository 增加按 scope 获取并删除空目录的事务方法：先验证 folder owner，再以同一事务查询 `assets.library_folder_id` 与同 scope 子目录；任何引用返回专用冲突错误，删除使用 `WHERE id AND project_id`。service 映射 not found/conflict，handler 映射 404/409；错误不得泄露跨 scope 数据。

前端 API 增加 DELETE 函数；controls 增加删除回调与忙状态。目录行提供熟悉的删除图标和 tooltip，确认对话框明确“仅删除逻辑目录，素材文件不受影响”，取消零写入；成功从同一 SWR cache 移除目录并导航到父目录，失败由对话框保留并展示错误。目录含素材/子目录时由真实 409 提示，不做乐观成功。

复用现有 `AlertDialog`、`useSWR` cache mutation、`libraryFolderPath` 和 toast/错误处理。删除与 rename/create 共用 scope key，不改变媒体删除 API。
