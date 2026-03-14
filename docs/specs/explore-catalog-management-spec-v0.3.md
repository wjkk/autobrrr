# 首页主体/画风目录与项目入口配置规范（v0.3）

版本：v0.3  
日期：2026-03-14  
状态：已落地基础实现，作为后续扩展基线

## 1. 目的

本文用于冻结首页 `短剧漫剧` 场景下这 4 个入口的后端设计：

1. `上传剧本`
2. `选择主体图模型`
3. `选择主体`
4. `选择画风`

目标不是只让前端“能点”，而是确保：

1. 目录数据来自后端专用表。
2. 首页提交后，所选项会进入独立配置表，不丢失。
3. 主体与画风后续可以通过后台接口、内部工具或直接数据库维护。

## 2. 当前已落地实现

### 2.1 专用表

当前 MySQL 已有以下表：

1. `subject_profiles`
2. `style_presets`
3. `project_creation_configs`

相关代码：

1. [schema.prisma](/Users/jiankunwu/project/aiv/apps/api/prisma/schema.prisma)
2. [explore-catalogs.ts](/Users/jiankunwu/project/aiv/apps/api/src/routes/explore-catalogs.ts)
3. [studio-projects.ts](/Users/jiankunwu/project/aiv/apps/api/src/routes/studio-projects.ts)
4. [seed-explore-catalogs.ts](/Users/jiankunwu/project/aiv/apps/api/scripts/seed-explore-catalogs.ts)

### 2.2 首页使用方式

首页 `Explore` 已切到真实后端目录：

1. 主体列表：`GET /api/explore/subjects`
2. 画风列表：`GET /api/explore/styles`
3. 主体图模型：`GET /api/model-endpoints?modelKind=image`
4. 创建项目：`POST /api/studio/projects`

相关前端代码：

1. [explore-page.tsx](/Users/jiankunwu/project/aiv/apps/web/src/features/explore/components/explore-page.tsx)
2. [studio-service.ts](/Users/jiankunwu/project/aiv/apps/web/src/lib/studio-service.ts)

### 2.3 创建项目时的配置落库

当前 `POST /api/studio/projects` 已支持：

```json
{
  "prompt": "...",
  "contentMode": "single",
  "creationConfig": {
    "selectedTab": "短剧漫剧",
    "scriptSourceName": "demo-script.md",
    "scriptContent": "...",
    "imageModelEndpointSlug": "proxy-seko-image-v1",
    "subjectProfileSlug": "little-fox",
    "stylePresetSlug": "ink-oriental",
    "settings": {
      "multiEpisode": false
    }
  }
}
```

落库位置：

1. `projects`
2. `project_creation_configs`

## 3. 表设计说明

## 3.1 `subject_profiles`

用途：管理首页“主体”目录，以及后续策划/创作阶段的主体复用。

当前字段：

1. `id`
2. `slug`
3. `name`
4. `visibility`
5. `owner_user_id`
6. `subject_type`
7. `gender_tag`
8. `preview_image_url`
9. `reference_image_url`
10. `description`
11. `prompt_template`
12. `negative_prompt`
13. `tags_json`
14. `metadata_json`
15. `enabled`
16. `sort_order`
17. `created_at`
18. `updated_at`

字段语义：

1. `slug`：稳定业务标识，页面和配置表都应该优先引用它或对应 `id`。
2. `visibility`：区分平台公共主体与用户私有主体。
3. `subject_type`：当前只做基础枚举，后续影响默认 prompt 结构与推荐镜头。
4. `gender_tag`：当前用于首页筛选，后续可参与配音/口型默认策略。
5. `preview_image_url`：目录卡片用图。
6. `reference_image_url`：真正用于生图一致性参考的图。
7. `prompt_template`：该主体注入到生图/策划 prompt 的标准模板。
8. `negative_prompt`：该主体关联的负面 prompt。
9. `metadata_json`：承接短期扩展字段，但不应长期替代核心字段。

## 3.2 主体后续建议增加的字段

当前这批字段足够首页使用，但如果主体要长期管理，建议下一阶段补这几类字段：

1. `identity_key`
说明：跨项目复用同一主体时的稳定身份键。

2. `default_age_group`
说明：比 `gender_tag` 更适合策划和镜头语言的默认分类。

3. `species_label`
说明：用于 `ANIMAL / CREATURE` 细分，比如狐狸、机器人猫、鹦鹉。

4. `reference_asset_id`
说明：改成引用统一 `assets` 表，而不是长期只存 URL。

5. `consistency_strategy`
说明：例如 `single_ref / multi_ref / face_lock / style_lock`。

6. `voice_profile_id`
说明：后续配音或对口型时的默认声音绑定。

7. `lipsync_capable`
说明：区分适合做口型的视频主体和纯静态主体。

8. `status`
说明：建议最终从简单 `enabled` 升级为 `draft / active / archived`。

结论：
当前 `subject_profiles` 已可用，但它未来应当成为“主体资产目录”，不只是首页选项表。

## 3.3 `style_presets`

用途：管理首页“画风”目录，以及后续 prompt 复用。

当前字段：

1. `id`
2. `slug`
3. `name`
4. `visibility`
5. `owner_user_id`
6. `preview_image_url`
7. `description`
8. `prompt_template`
9. `negative_prompt`
10. `tags_json`
11. `metadata_json`
12. `enabled`
13. `sort_order`
14. `created_at`
15. `updated_at`

设计原则：

1. 画风的核心不是图片，而是 prompt 规则。
2. `preview_image_url` 只负责选择体验，不应当成为运行时真相。
3. `prompt_template` 才是画风真正的后端资产。

后续建议补充字段：

1. `style_family`
2. `default_aspect_ratio`
3. `recommended_model_family`
4. `recommended_model_endpoint_id`
5. `render_constraints_json`

## 3.4 `project_creation_configs`

用途：存首页提交前的入口配置快照。

当前字段：

1. `project_id`
2. `selected_tab`
3. `script_source_name`
4. `script_content`
5. `image_model_endpoint_id`
6. `subject_profile_id`
7. `style_preset_id`
8. `settings_json`
9. `created_at`
10. `updated_at`

这张表的定位很重要：

1. 它不是目录表。
2. 它是“项目入口配置快照”。
3. 后续策划、生成 Recipe、再次生成类似视频，都可以从这里取初始输入。

## 4. 当前接口

### 4.1 目录接口

1. `GET /api/explore/subjects`
2. `POST /api/explore/subjects`
3. `PATCH /api/explore/subjects/:itemId`
4. `GET /api/explore/styles`
5. `POST /api/explore/styles`
6. `PATCH /api/explore/styles/:itemId`

### 4.2 项目创建接口

1. `POST /api/studio/projects`

说明：

1. 当前已支持把首页选择项写入 `project_creation_configs`。
2. 当前还没有独立的后台管理页，但接口和表已经具备。

## 5. 管理建议

## 5.1 主体管理至少要有的功能

后续建议提供一个内部管理页或后台工具，最少包含：

1. 新建主体
2. 编辑名称/封面/参考图
3. 编辑 `prompt_template / negative_prompt`
4. 设置公开/私有
5. 设置主体类型与性别标签
6. 排序与启停用
7. 查看被哪些项目引用

## 5.2 画风管理至少要有的功能

1. 新建画风
2. 编辑封面图
3. 编辑正向/负向 prompt 模板
4. 设置推荐模型
5. 设置排序与启停用

## 5.3 维护策略

建议规则：

1. 公共目录项由平台维护。
2. 用户自建目录项写成 `PERSONAL`。
3. 项目创建时写快照，后续即使目录项被修改，历史项目也不应完全失真。

## 6. 已验证结果

2026-03-14 已完成以下验证：

1. 首页展开后可用正式 Chrome 打开 `上传剧本 / 主体图模型 / 主体 / 画风`。
2. `上传剧本` 会把文本内容导入输入框。
3. `主体图模型 / 主体 / 画风` 的选项来自数据库，不是前端常量。
4. 提交项目后，所选项已写入 `project_creation_configs`，并与 `model_endpoints / subject_profiles / style_presets` 建立关联。

验证截图：

1. ![explore-before-submit](/tmp/aiv-explore-selection-before-submit.png)
2. ![explore-after-submit](/tmp/aiv-explore-after-submit.png)
