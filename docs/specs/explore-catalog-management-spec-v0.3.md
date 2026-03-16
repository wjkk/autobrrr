# 首页主体/画风目录与项目入口配置规范（v0.3）

版本：v0.3  
日期：2026-03-15  
状态：按当前代码重写后的现行实现说明

## 1. 文档目的

本文用于说明当前系统中以下能力的真实落地情况：

1. 首页 `Explore` 的项目入口配置
2. 主体目录与画风目录
3. 用户侧目录管理页
4. 后台公共目录管理页
5. 主体图上传与 AI 生成

事实来源：

1. `/Users/jiankunwu/project/aiv/apps/api/prisma/schema.prisma`
2. `/Users/jiankunwu/project/aiv/apps/api/src/routes/explore-catalogs.ts`
3. `/Users/jiankunwu/project/aiv/apps/api/src/routes/studio-projects.ts`
4. `/Users/jiankunwu/project/aiv/apps/web/src/features/explore/components/explore-page.tsx`
5. `/Users/jiankunwu/project/aiv/apps/web/src/features/settings/components/catalog-management-page.tsx`
6. `/Users/jiankunwu/project/aiv/apps/web/src/app/settings/catalogs/page.tsx`
7. `/Users/jiankunwu/project/aiv/apps/web/src/app/admin/catalogs/page.tsx`

## 2. 当前已落地能力

### 2.1 首页入口配置已后端化

当前首页已不再使用纯前端常量，而是接入真实后端数据：

1. 主体列表：`GET /api/explore/subjects`
2. 画风列表：`GET /api/explore/styles`
3. 主体图模型：`GET /api/model-endpoints?modelKind=image`
4. 创建项目：`POST /api/studio/projects`

首页当前可提交的关键配置包括：

1. 内容类型 `selectedTab`
2. 子类型 `selectedSubtype`
3. 剧本来源名 `scriptSourceName`
4. 剧本文本 `scriptContent`
5. 主体图模型 `imageModelEndpointSlug`
6. 主体 `subjectProfileSlug`
7. 画风 `stylePresetSlug`
8. 其他入口设置 `settings`

这些配置会写入：

- `project_creation_configs`

### 2.2 主体 / 画风目录已落地为正式表

当前目录相关正式表：

1. `subject_profiles`
2. `style_presets`
3. `project_creation_configs`

其中：

- `subject_profiles`：主体目录
- `style_presets`：画风目录
- `project_creation_configs`：项目入口配置快照

## 3. 当前真实数据模型

### 3.1 `subject_profiles`

当前真实字段语义：

1. `slug`：稳定业务标识
2. `name`：展示名称
3. `visibility`：`PUBLIC / PERSONAL`
4. `owner_user_id`：个人主体的归属用户
5. `subject_type`：`HUMAN / ANIMAL / CREATURE / OBJECT`
6. `gender_tag`：当前筛选与展示使用
7. `preview_image_url`：目录卡片封面图
8. `reference_image_url`：生成一致性参考图
9. `description`
10. `prompt_template`
11. `negative_prompt`
12. `tags_json`
13. `metadata_json`
14. `enabled`
15. `sort_order`

### 3.2 `style_presets`

当前真实字段语义：

1. `slug`
2. `name`
3. `visibility`
4. `owner_user_id`
5. `preview_image_url`
6. `description`
7. `prompt_template`
8. `negative_prompt`
9. `tags_json`
10. `metadata_json`
11. `enabled`
12. `sort_order`

### 3.3 `project_creation_configs`

当前真实定位：

1. 不是目录表
2. 是项目创建时的配置快照表
3. 后续 planner / creation 均可从这里读取入口初始真相

当前真实字段：

1. `selected_tab`
2. `selected_subtype`
3. `script_source_name`
4. `script_content`
5. `image_model_endpoint_id`
6. `subject_profile_id`
7. `style_preset_id`
8. `settings_json`

## 4. 当前接口

### 4.1 主体接口

1. `GET /api/explore/subjects`
2. `POST /api/explore/subjects`
3. `PATCH /api/explore/subjects/:itemId`
4. `POST /api/explore/subjects/generate-image`

### 4.2 画风接口

1. `GET /api/explore/styles`
2. `POST /api/explore/styles`
3. `PATCH /api/explore/styles/:itemId`

### 4.3 项目创建接口

1. `POST /api/studio/projects`

## 5. 当前页面落地状态

### 5.1 首页 `Explore`

当前已落地：

1. 选择主体
2. 选择画风
3. 选择主体图模型
4. 上传剧本/导入剧本文本
5. 提交项目并写入 `project_creation_configs`
6. 通过 query 参数预选主体

### 5.2 用户侧目录页

当前已落地页面：

- `/settings/catalogs`

当前已落地能力：

1. 主体库 / 画风库切换
2. 公共 / 个人筛选
3. 主体类型筛选
4. 搜索
5. 新建主体 / 新建画风
6. 卡片列表浏览
7. 弹层编辑主体
8. 弹层编辑画风
9. 使用主体直接跳转创作
10. 主体图本地上传
11. 主体图 AI 生成

### 5.3 后台公共目录页

当前已落地页面：

- `/admin/catalogs`

当前已落地能力：

1. 只看公共目录
2. 共用与用户侧一致的目录管理组件
3. 在后台语境下维护公共主体 / 公共画风

## 6. 当前真实管理结论

旧文档中“当前还没有独立后台管理页”的说法已经失效。

今天的真实状态是：

1. 用户侧已有 `/settings/catalogs`
2. 后台侧已有 `/admin/catalogs`
3. 二者共用目录管理主组件，但作用域不同

## 7. 当前实现边界

### 7.1 已经做到的

1. 首页目录后端化
2. 项目入口配置快照落库
3. 主体 / 画风目录读写
4. 主体图 AI 生成
5. 主体图上传
6. 从主体目录跳回首页继续创作
7. 用户侧目录与后台公共目录双入口

### 7.2 还未形成的更强能力

1. 主体素材预处理层
2. 封面裁切与透明背景等素材标准化流程
3. 更细粒度的目录版本历史
4. 更完善的引用分析（哪些项目在用某主体 / 画风）

## 8. 当前最佳实践评价

### 8.1 优点

1. 目录表、配置快照表、项目表已分开
2. 目录数据不再依赖前端常量
3. 用户侧与后台侧的边界已建立
4. 主体图生成能力已经从目录页延伸到 planner 自动能力的设计落点

### 8.2 问题

1. 目录管理主文件虽然已拆一轮，但仍偏大
2. 主体图片质量问题与布局问题仍未完全分层
3. 目录 AI 生成能力与未来统一 AI capability 层还未打通

## 9. 下一阶段建议

在不考虑兼容老数据和老业务的前提下，建议：

1. 将目录 AI 生成统一接入未来 `ai-capabilities/image-generation`
2. 为主体素材建立独立“预处理 / 裁切策略”层
3. 为主体 / 画风目录增加引用分析与版本轨迹
4. 把目录接口文档与页面文档统一回收到同一组现行基线说明中
