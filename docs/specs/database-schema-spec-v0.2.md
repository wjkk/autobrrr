# 数据库设计规格（v0.2）

版本：v0.2  
日期：2026-03-08  
状态：Prisma 对齐版

## 1. 范围

本文件以 `prisma/schema.prisma` 为唯一真相源，定义当前数据库设计。

## 2. 核心模型分层

### 2.1 项目层

- `Project`
- `Episode`
- `StyleTemplate`

### 2.2 策划层（Planner）

- `PlannerSession`
- `PlannerStep`
- `PlannerMessage`
- `PlannerReference`
- `StoryboardDraft`

### 2.3 生产层（Creation）

- `Shot`
- `ShotVersion`
- `ShotMaterialBinding`
- `Asset`

### 2.4 编排执行层

- `PipelineNode`
- `Run`
- `EventLog`

### 2.5 发布与审核层

- `ReviewRecord`
- `PublishDraft`
- `PublishRecord`

## 3. 当前关键关系

1. `Project 1:N Episode`
2. `Episode 1:N PlannerSession`
3. `PlannerSession 1:N PlannerStep/Message/Reference/StoryboardDraft`
4. `Episode 1:N Shot`
5. `Shot 1:N ShotVersion`
6. `Shot 1:N ShotMaterialBinding`
7. `PublishDraft 1:N PublishRecord`
8. `Project/Episode/Shot/Run` 共同关联 `EventLog`

## 4. 枚举（已落库）

包括但不限于：

- `ProjectContentMode`
- `ExecutionMode`
- `ProjectStatus`
- `EpisodeStatus`
- `PlannerStatus`
- `ShotStatus`
- `ShotVersionStatus`
- `RunType`
- `RunStatus`
- `PublishDraftStatus`
- `PublishStatus`

## 5. 索引现状（已存在）

已在 schema 中定义的高频索引：

- `Project(status, updatedAt)`
- `Episode(projectId, status)`
- `PlannerSession(projectId, episodeId, isActive)`
- `Run(projectId, runType, status)`
- `Run(shotId, createdAt)`
- `Shot(projectId, status)`
- `ShotVersion(projectId, episodeId, status)`
- `PublishDraft(projectId, status, updatedAt)`
- `PublishRecord(projectId, status, createdAt)`
- `EventLog(projectId, createdAt)`、`EventLog(shotId, createdAt)`

## 6. 仍需补充的数据库级约束

Prisma 里暂未表达（建议手写 SQL migration）：

1. 每个 `Shot` 仅允许一个 `ACTIVE` 版本
- partial unique: `(shot_id) where status = 'ACTIVE'`

2. 每个 `Shot` 仅允许一个 `is_active = true` 素材绑定
- partial unique: `(shot_id) where is_active = true`

3. 每个 `(project, episode)` 仅允许一个 active `PlannerSession`
- partial unique: `(project_id, episode_id) where is_active = true`

## 7. 首页与工作区查询建议

为满足 `/explore` + 三工作区首屏：

- 使用“聚合查询 + 读模型”策略，避免页面多次 join。
- 保留 `StudioFixture` 级响应结构作为 BFF 输出。

## 8. 一致性要求

- `packages/domain` 类型变更，必须同步评估 Prisma。
- Prisma 枚举变更，必须同步更新状态机文档与 API 文档。
