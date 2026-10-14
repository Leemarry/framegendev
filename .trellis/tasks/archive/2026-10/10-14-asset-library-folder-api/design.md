# TASK-035 设计

采用独立asset_library_folders表保存逻辑分类；复用现有assets表新增library_folder_id默认空串。相比直接复用project_reference_assets，会避免把文档目录与素材分类混为一谈；相比物理移动文件，可保持现有URL、downloadPath和生成/选入资源引用稳定。目录扫描是不同的导入契约，后续单独核实。

目录字段id/project_id/parent_id/name/created_at/updated_at，scope和parent根值均为空串；(project_id,parent_id,name)唯一。项目存在性在service检查；同级名称区分大小写，去前后空白，1–80 Unicode字符，不接受路径分隔符、控制字符及.和..。嵌套通过创建时指定parentId，parent必须属于同scope。此项不提供目录删除或重挂父级，所以不会引入环或移动中的目录竞态。

API：GET/POST /asset-library-folders，PUT /asset-library-folders/:folderId；项目入口加/projects/:projectId。POST{name,parentId?}，PUT{name}；返回目录对象，列表{folders:[]}。错误使用现有envelope，非法值/重名400、缺失或跨scope404、数据库500。项目缺失404。

媒体PUT增加可选folderId:string；省略/null不改，空串回根，非空必须存在于媒体owner scope。现有Update先验证全部字段，再一次写入。MediaAsset投影返回folderId，其他API保持兼容。目录删除延后；项目物理删除时同事务清除目录行，避免孤儿。

文件边界：domain/media_models.go、repository/db.go/media_repo与专用folder repo文件、workspace_repo项目删除、media/store及专用service文件、现有metadata Update、handlers专用folder文件、routes注册、app/repository测试。无前端或新依赖。

2026-10-14用户进一步明确一个功能完整落地再做下一个：TASK-035/036是同一文件夹功能的两个验收层，顺序完成它们后才推进其他功能。浏览当前文件夹导入时不采用“先上传根目录再移动”的双请求；multipart上传增加可选folderId，同scope目标验证通过后再保存文件与目录字段。失败零素材写入，缺失/跨scope目录404。
