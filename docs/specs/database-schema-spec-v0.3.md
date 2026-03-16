# 数据库设计规格（v0.3）

版本：v0.3  
日期：2026-03-15  
状态：按当前 Prisma schema 重写后的现行实现说明

## 1. 事实来源

本文件仅以以下 schema 为准：

- `/Users/jiankunwu/project/aiv/apps/api/prisma/schema.prisma`

## 2. 当前数据库总体结构

当前数据库使用：

1. `MySQL`
2. `Prisma`

当前 schema 的主分层为：

1. 用户与会话层
2. 项目与剧集层
3. Planner 层
4. Creation 层
5. 目录与配置层
6. 模型目录层
7. Run 执行账本层

## 3. 主对象清单

### 3.1 用户与会话

1. `users`
2. `user_sessions`

### 3.2 项目与剧集

1. `projects`
2. `episodes`
3. `project_creation_configs`

### 3.3 Planner 与 Agent

1. `planner_sessions`
2. `planner_outline_versions`
3. `planner_refinement_versions`
4. `planner_messages`
5. `planner_step_analysis`
6. `planner_subjects`
7. `planner_scenes`
8. `planner_shot_scripts`
9. `planner_agent_profiles`
10. `planner_sub_agent_profiles`
11. `planner_sub_agent_profile_releases`
12. `planner_debug_runs`

### 3.4 Creation

1. `shots`
2. `shot_versions`
3. `assets`

### 3.5 模型与 provider

1. `model_families`
2. `model_providers`
3. `model_endpoints`
4. `user_provider_configs`

### 3.6 执行账本

1. `runs`

### 3.7 未来扩展 / 当前非主路径

1. `generation_recipes`
2. `recipe_executions`

## 4. 当前真实关系

### 4.1 用户 -> 项目

1. `users 1:N projects`
2. `users 1:N user_sessions`
3. `users 1:N user_provider_configs`
4. `users 1:N subject_profiles`
5. `users 1:N style_presets`

### 4.2 项目 -> 剧集

1. `projects 1:N episodes`
2. `projects.current_episode_id -> episodes.id`

### 4.3 项目入口配置

1. `projects 1:1 project_creation_configs`
2. `project_creation_configs` 可关联：
   - `model_endpoints`
   - `subject_profiles`
   - `style_presets`

### 4.4 Planner

1. `episodes 1:N planner_sessions`
2. `episodes.active_planner_session_id -> planner_sessions.id`
3. `planner_sessions 1:N planner_messages`
4. `planner_sessions 1:N planner_outline_versions`
5. `planner_sessions 1:N planner_refinement_versions`
6. `planner_refinement_versions 1:N planner_step_analysis`
7. `planner_refinement_versions 1:N planner_subjects`
8. `planner_refinement_versions 1:N planner_scenes`
9. `planner_refinement_versions 1:N planner_shot_scripts`
10. `planner_refinement_versions` 可关联：
   - `planner_agent_profiles`
   - `planner_sub_agent_profiles`
   - `runs`

### 4.5 Creation

1. `episodes 1:N shots`
2. `shots 1:N shot_versions`
3. `shots.active_version_id -> shot_versions.id`
4. `shot_versions.output_asset_id -> assets.id`

### 4.6 Run

`runs` 当前可以关联：

1. `projects`
2. `episodes`
3. `model_families`
4. `model_providers`
5. `model_endpoints`
5. `planner_outline_versions`
6. `planner_refinement_versions`

## 5. 当前真实约束

### 5.1 用户层

1. `users.email` 唯一
2. `user_sessions.session_token_hash` 唯一

### 5.2 项目层

1. `(project_id, episode_no)` 在 `episodes` 中唯一
2. `project_creation_configs.project_id` 唯一

### 5.3 Planner 层

1. `(planner_session_id, version_number)` 在 `planner_outline_versions` 中唯一
2. `(planner_session_id, version_number)` 在 `planner_refinement_versions` 中唯一
3. `(agent_profile_id, subtype)` 在 `planner_sub_agent_profiles` 中唯一
4. `(sub_agent_profile_id, release_version)` 在 `planner_sub_agent_profile_releases` 中唯一
5. `(refinement_version_id, step_key)` 在 `planner_step_analysis` 中唯一

### 5.4 Creation 层

1. `(episode_id, sequence_no)` 在 `shots` 中唯一
2. `(shot_id, version_number)` 在 `shot_versions` 中唯一

### 5.5 模型目录层

1. `model_families.slug` 唯一
2. `model_providers.code` 唯一
3. `model_endpoints.slug` 唯一
4. `(user_id, provider_id)` 在 `user_provider_configs` 中唯一

### 5.6 Run 层

1. `runs.idempotency_key` 唯一
2. `runs` 已索引：
   - `(project_id, run_type, status, created_at)`
   - `(episode_id, status, created_at)`
   - `(model_family_id, model_endpoint_id, created_at)`
   - `(status, next_poll_at)`

## 6. 当前真实枚举

### 6.1 核心业务枚举

1. `ProjectStatus`
2. `EpisodeStatus`
3. `PlannerStatus`
4. `PlannerMessageRole`
5. `PlannerMessageType`
6. `PlannerOutlineStatus`
7. `PlannerRefinementStatus`
8. `PlannerStepStatus`
9. `ProfileReleaseStatus`
10. `ShotStatus`
11. `ShotVersionStatus`

### 6.2 资源与模型枚举

1. `MediaKind`
2. `AssetSourceKind`
3. `ModelKind`
4. `ProviderType`
5. `ModelEndpointStatus`
6. `CatalogVisibility`
7. `SubjectType`
8. `SubjectGenderTag`

### 6.3 执行枚举

1. `RunType`
2. `RunStatus`
3. `ExecutorType`

## 7. 当前 schema 与旧文档的关键差异

### 7.1 当前 schema 中不存在的旧基线对象

旧文档中常出现、但当前真实 schema 中不存在：

1. `event_logs`
2. `planner_references`
3. `voice_drafts`
4. `music_drafts`
5. `lipsync_drafts`
6. `shot_material_bindings`
7. `publish_drafts`
8. `publish_records`

### 7.2 当前 schema 已新增的重要对象

旧文档未充分体现、但当前真实存在：

1. `planner_agent_profiles`
2. `planner_sub_agent_profiles`
3. `planner_sub_agent_profile_releases`
4. `planner_debug_runs`
5. `project_creation_configs`
6. `subject_profiles`
7. `style_presets`
8. `user_provider_configs`

## 8. 当前数据库设计的最佳实践评价

### 8.1 优点

1. 核心链路已回到关系型建模
2. Planner 版本化对象独立
3. 模型目录与用户 provider 配置分离
4. Run 已形成统一执行账本

### 8.2 问题

1. 外部调用审计缺独立日志表
2. `GenerationRecipe / RecipeExecution` 已进 schema，但尚未进入主路径
3. `runs.inputJson / outputJson` 承担过多审计职责
4. 缺少 AI 调用级别的调用快照表

## 9. 下一阶段数据库重构建议

在不考虑兼容老数据和老业务的前提下，建议下一阶段：

1. 保留当前主干表：
   - users / sessions
   - projects / episodes / creation_config
   - planner versions / entities / debug runs
   - shots / shot_versions / assets
   - model registry / user provider configs
   - runs
2. 将 `GenerationRecipe / RecipeExecution` 降级为未来扩展，不再作为当前主路径中心
3. 新增独立表：
   - `external_api_call_logs`
4. 明确 `runs` 是业务账本，`external_api_call_logs` 是外部调用审计账本
