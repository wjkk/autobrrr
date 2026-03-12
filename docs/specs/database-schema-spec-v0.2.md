# 数据库设计规格（v0.2）

版本：v0.2  
日期：2026-03-09  
状态：Prisma 基线 + Explore/Planner 增量要求

## 1. 范围

本文件描述两部分：

1. 当前已落库模型（以 `prisma/schema.prisma` 为准）
2. 为匹配最新首页/策划页行为必须补充的增量建模

## 2. 当前核心模型（已存在）

### 2.1 项目层

- `Project`
- `Episode`
- `StyleTemplate`

### 2.2 策划层

- `PlannerSession`
- `PlannerStep`
- `PlannerMessage`
- `PlannerReference`
- `StoryboardDraft`

### 2.3 生产层

- `Shot`
- `ShotVersion`
- `ShotMaterialBinding`
- `Asset`

### 2.4 编排执行层

- `PipelineNode`
- `Run`
- `EventLog`

### 2.5 发布层

- `ReviewRecord`
- `PublishDraft`
- `PublishRecord`

## 3. 当前关系与索引（摘要）

关系：

1. `Project 1:N Episode`
2. `Episode 1:N PlannerSession`
3. `PlannerSession 1:N PlannerStep/Message/Reference/StoryboardDraft`
4. `Episode 1:N Shot`
5. `Shot 1:N ShotVersion`

已定义高频索引（摘要）：

1. `Project(status, updatedAt)`
2. `Episode(projectId, status)`
3. `PlannerSession(projectId, episodeId, isActive)`
4. `Run(projectId, runType, status)`
5. `Shot(projectId, status)`
6. `ShotVersion(projectId, episodeId, status)`
7. `EventLog(projectId, createdAt)`

## 4. 必需增量模型（Explore -> Planner v2）

### 4.1 `PlannerOutlineVersion`

用途：记录大纲版本与确认状态。

建议字段：

1. `id`
2. `projectId`
3. `episodeId`
4. `plannerSessionId`
5. `versionNumber`
6. `requirement`
7. `outlineSnapshot` (`Json`)
8. `status` (`GENERATING | READY | CONFIRMED | FAILED`)
9. `createdAt/updatedAt/confirmedAt`

### 4.2 `PlannerRefinementVersion`

用途：记录细化版本历史（不可变）。

建议字段：

1. `id`
2. `projectId`
3. `episodeId`
4. `plannerSessionId`
5. `outlineVersionId`
6. `versionNumber`
7. `triggerType` (`CONFIRM_OUTLINE | RERUN`)
8. `instruction`
9. `status` (`RUNNING | READY | FAILED | CANCELED`)
10. `progressPercent`
11. `docSnapshot` (`Json`)
12. `isActive`
13. `createdAt/updatedAt/finishedAt`

### 4.3 `PlannerRefinementStep`

用途：步骤级进度（summary/style/subjects/scenes/script）。

建议字段：

1. `id`
2. `refinementVersionId`
3. `stepCode`
4. `stepTitle`
5. `stepOrder`
6. `status` (`WAITING | RUNNING | DONE | FAILED`)
7. `startedAt/finishedAt`

### 4.4 `PlannerGenerationConfig`

用途：持久化策划页底部配置（分镜图模型、画面比例）。

建议字段：

1. `id`
2. `projectId`
3. `episodeId`
4. `storyboardModelId`
5. `aspectRatio` (`16:9 | 9:16 | 4:3 | 3:4`)
6. `updatedBy`
7. `createdAt/updatedAt`

### 4.5 `PlannerVersionOperationLog`（建议）

用途：记录主体/场景/分镜微调操作。

建议字段：

1. `id`
2. `refinementVersionId`
3. `operatorId`
4. `operationType`
5. `operationPayload` (`Json`)
6. `createdAt`

## 5. 必需约束

1. `Project.contentMode` 创建后不可更新（服务层 + DB 双保险）。
2. `(planner_session_id, version_number)` 在 outline/refinement 版本表唯一。
3. 同一 `planner_session_id` 仅允许一个 `refinement_version.is_active = true`。
4. `progress_percent` 必须 `0..100`。
5. `(project_id, episode_id)` 在 `planner_generation_config` 上唯一。

## 6. 索引建议（新增）

1. `planner_outline_versions(project_id, episode_id, created_at desc)`
2. `planner_refinement_versions(project_id, episode_id, created_at desc)`
3. `planner_refinement_versions(planner_session_id, is_active)`
4. `planner_refinement_steps(refinement_version_id, step_order)`
5. `planner_generation_configs(project_id, episode_id)`
6. `planner_version_operation_logs(refinement_version_id, created_at)`

## 7. 枚举一致性要求

当前策划页前端比例已采用：`16:9 | 9:16 | 4:3 | 3:4`，默认 `16:9`。

现有 domain/DB 仍有 `1:1` 历史字段，建议策略：

1. Planner 新配置枚举使用新集合（不含 `1:1`）。
2. Creation 历史字段可临时保留 `1:1` 兼容。
3. 中长期统一到单一比例枚举，避免跨页配置漂移。

## 8. 与接口规格对齐

- 外部接口：`docs/specs/backend-data-api-spec-v0.2.md`
- 业务落地指导：`docs/specs/explore-planner-backend-guidance-v0.2.md`

任何 `packages/domain` 变更，必须同步评估 Prisma 与上述两份文档。
