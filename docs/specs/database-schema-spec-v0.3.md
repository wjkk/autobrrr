# 数据库设计规格（v0.3）

版本：v0.3  
日期：2026-03-13  
状态：MySQL 开工基线

## 1. 范围

本文件定义后端正式落地时的 MySQL 数据结构基线，覆盖：

1. 领域核心表
2. 关键外键关系
3. 索引与唯一约束
4. MySQL 下的实现取舍

## 2. 总体原则

1. 数据库使用 `MySQL`。
2. 采用 Prisma 管理 schema。
3. 不依赖 PostgreSQL partial unique index。
4. “当前生效对象”通过主表显式外键表达。
5. `Run` 是统一异步账本。
6. `GenerationRecipe / RecipeExecution` 是复用生成的正式对象。
7. `ModelFamily / ModelProvider / ModelEndpoint` 是模型目录正式对象。

## 3. 主对象与关系

### 3.0 用户与会话层

1. `users`
2. `user_sessions`

关系：

1. `users 1:N user_sessions`
2. `users 1:N projects`

### 3.1 项目层

1. `projects`
2. `episodes`

关系：

1. `projects 1:N episodes`
2. `projects.current_episode_id -> episodes.id`

### 3.2 策划层

1. `planner_sessions`
2. `planner_messages`
3. `planner_references`
4. `planner_outline_versions`
5. `planner_refinement_versions`

关系：

1. `episodes 1:N planner_sessions`
2. `episodes.active_planner_session_id -> planner_sessions.id`
3. `planner_sessions 1:N planner_messages`
4. `planner_sessions 1:N planner_references`
5. `planner_sessions 1:N planner_outline_versions`
6. `planner_sessions 1:N planner_refinement_versions`

### 3.3 创作层

1. `shots`
2. `shot_versions`
3. `assets`
4. `shot_material_bindings`
5. `voice_drafts`
6. `music_drafts`
7. `lipsync_drafts`

关系：

1. `episodes 1:N shots`
2. `shots 1:N shot_versions`
3. `shots 1:N shot_material_bindings`
4. `shot_material_bindings N:1 assets`
5. `shots.active_version_id -> shot_versions.id`
6. `shots.active_material_binding_id -> shot_material_bindings.id`

### 3.4 发布层

1. `publish_drafts`
2. `publish_records`

### 3.5 复用生成层

1. `generation_recipes`
2. `recipe_executions`

### 3.6 模型目录层

1. `model_families`
2. `model_providers`
3. `model_endpoints`

### 3.7 执行账本层

1. `runs`
2. `event_logs`

## 4. 关键字段约束

### 4.0 `users`

关键约束：

1. `email` 唯一。
2. 只保存 `password_hash`。
3. 用户删除策略第一阶段建议软删除或 `DISABLED`，避免直接级联清除项目。

### 4.0.1 `user_sessions`

关键约束：

1. `session_token_hash` 唯一。
2. `expires_at` 到期后会话无效。
3. `revoked_at` 非空后会话立即失效。

### 4.1 `projects`

关键约束：

1. `content_mode` 创建后不可变。
2. `current_episode_id` 可空，但若存在必须属于当前 project。
3. `created_by_id` 必须关联到 `users.id`。

### 4.2 `episodes`

关键约束：

1. `(project_id, episode_no)` 唯一。
2. `active_planner_session_id` 若存在，必须属于当前 episode。

### 4.3 `shots`

关键约束：

1. `(episode_id, sequence_no)` 唯一。
2. `active_version_id` 若存在，必须属于当前 shot。
3. `active_material_binding_id` 若存在，必须属于当前 shot。

### 4.4 `shot_versions`

关键约束：

1. `(shot_id, version_number)` 唯一。
2. 每条记录必须记录 `media_kind`。
3. 生成类版本建议记录 `model_family_id / model_endpoint_id / provider_id`。

### 4.5 `generation_recipes`

关键约束：

1. `definition_json` 必须可独立解释。
2. `version` 自增，支持未来升级配方格式。

### 4.6 `model_endpoints`

关键约束：

1. `(provider_id, remote_model_key)` 唯一。
2. 必须关联一个 `family_id`。

### 4.7 `runs`

关键约束：

1. `idempotency_key` 唯一或带业务域唯一。
2. 生成类任务必须记录模型解析结果。
3. 异步 provider 任务必须记录 `provider_job_id`。
4. polling 模式必须记录 `provider_status / next_poll_at / poll_attempt_count`。

## 5. 索引建议

### 5.1 查询高频索引

1. `users(email)`
2. `user_sessions(user_id, expires_at)`
3. `user_sessions(session_token_hash)`
1. `projects(status, updated_at)`
2. `episodes(project_id, status, updated_at)`
3. `planner_sessions(project_id, episode_id, created_at desc)`
4. `shots(episode_id, sequence_no)`
5. `shot_versions(shot_id, created_at desc)`
6. `assets(project_id, asset_type, created_at desc)`
7. `runs(project_id, run_type, status, created_at desc)`
8. `event_logs(project_id, created_at desc)`
9. `generation_recipes(project_id, created_at desc)`
10. `recipe_executions(recipe_id, created_at desc)`
11. `runs(status, next_poll_at)`

### 5.2 唯一索引

1. `users(email)`
2. `user_sessions(session_token_hash)`
1. `episodes(project_id, episode_no)`
2. `planner_outline_versions(planner_session_id, version_number)`
3. `planner_refinement_versions(planner_session_id, version_number)`
4. `shots(episode_id, sequence_no)`
5. `shot_versions(shot_id, version_number)`
6. `model_endpoints(provider_id, remote_model_key)`
7. `runs(idempotency_key)`

## 6. MySQL 实现取舍

### 6.1 不使用 partial unique

替代方式：

1. 主表显式外键
2. 服务层校验
3. 事务内双写

### 6.2 JSON 字段使用边界

允许保留 JSON 的场景：

1. prompt 快照
2. provider request/response 快照
3. recipe definition
4. 音频工作区过渡期 snapshot

异步 provider 说明：

1. `provider raw response` 可以放 JSON snapshot
2. `provider_job_id / provider_status / next_poll_at` 必须结构化为独立字段

不建议长期保留为 JSON 的场景：

1. 当前 active 对象关系
2. 可查询的核心业务对象
3. 高并发更新字段

### 6.3 枚举建议

对频繁演进的状态枚举，建议优先使用 `VARCHAR` + 应用层约束，而不是 MySQL 原生 ENUM。

原因：

1. schema 演进更稳
2. Prisma 迁移更容易控
3. 跨环境兼容性更好

## 7. Prisma 落地建议

建议按以下顺序建表：

1. `users / user_sessions`
2. `projects / episodes`
3. `assets`
4. `planner_*`
5. `shots / shot_versions / shot_material_bindings`
6. `model_*`
7. `runs / event_logs`
8. `generation_recipes / recipe_executions`
9. `voice_drafts / music_drafts / lipsync_drafts`
10. `publish_*`

## 8. 第一阶段必须建的最小表集

若要优先打通创建到创作主链路，第一阶段至少需要：

1. `users`
2. `user_sessions`
3. `projects`
4. `episodes`
5. `planner_sessions`
6. `shots`
7. `shot_versions`
8. `assets`
9. `shot_material_bindings`
10. `runs`
11. `event_logs`
12. `model_families`
13. `model_providers`
14. `model_endpoints`

## 9. 关联文档

1. `docs/specs/backend-system-design-spec-v0.3.md`
2. `docs/specs/backend-data-api-spec-v0.3.md`
3. `docs/specs/internal-execution-api-spec-v0.3.md`
4. `docs/specs/state-machine-and-error-code-spec-v0.3.md`
