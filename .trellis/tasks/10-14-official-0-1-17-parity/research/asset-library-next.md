# TASK-034 后续核实检查点

2026-10-14，TASK-035/036/033验收后继续只读核实实际源码。

逻辑目录目前只有list/create/rename，assets.library_folder_id和asset_library_folders没有目录删除或重挂父级API；不能写成已实现。删除目录与删除物理媒体必须分开：后续优先规划空逻辑目录删除，含素材/子目录明确拒绝，保持ID/URL/物理文件和文档引用，不发起运行验收数据删除。是否递归、是否将素材回根必须形成明确单项契约再实施。

media领域不存在物理目录WalkDir扫描。既有projectasset/local_file_sync.go的scanProjectWorkAssetFiles仅扫描project work，跳过Markdown，写project_reference_assets及其folder_id，且同步filename/size/updatedAt。它不是library分类扫描，直接调用会混用文档目录和素材目录并改写元数据。后续需要基于真实library范围、路径去重/引用、文件变更/丢失处理单项设计；可复用共享路径/MIME检测边界，不复制整套work同步或伪称扫描已可用。

未执行扫描、目录删除或新产品检查；本检查点仅源码核实。TASK-030/TASK-034保持开发中，下一份计划只覆盖一个完整可验收子项。当前无新任务激活，最近完成TASK-033 Session18。
