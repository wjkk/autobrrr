# 状态机与错误码规格（v0.2）

版本：v0.2  
日期：2026-03-09  
状态：现状基线 + Planner 版本化扩展

## 1. 现状状态枚举（代码真相）

来源：`packages/domain/src/shared.ts`、`prisma/schema.prisma`。

1. `ProjectStatus`
- `draft`
- `planning`
- `ready_for_storyboard`
- `creating`
- `export_ready`
- `exported`
- `published`
- `failed`
- `archived`

2. `PlannerStatus`
- `idle`
- `updating`
- `ready`

3. `ShotStatus`
- `pending`
- `queued`
- `generating`
- `success`
- `failed`

4. `ShotVersionStatus`
- `pending_apply`
- `active`
- `archived`

5. `PublishDraftStatus`
- `draft`
- `submitted`
- `approved`
- `rejected`
- `failed`

6. `RunStatus`
- `queued`
- `running`
- `completed`
- `failed`
- `canceled`
- `timed_out`

## 2. 现状核心流转

1. Project 主流程
- `draft -> planning -> ready_for_storyboard -> creating -> export_ready -> exported -> published`

2. Planner（当前 domain）
- `idle -> updating -> ready`
- `ready -> updating`（重新提交需求）

3. Shot
- `pending -> queued -> generating -> success`
- `generating -> failed`
- `failed -> queued`（重试）

4. ShotVersion
- 新生成版本默认 `pending_apply`
- 用户执行替换：`pending_apply -> active`
- 原 active 版本转 `archived`

## 3. Planner v2 扩展状态（目标）

为对齐“统一提交 + 历史版本”交互，新增业务状态域：

1. `OutlineVersionStatus`
- `generating`
- `ready`
- `confirmed`
- `failed`

2. `RefinementVersionStatus`
- `running`
- `ready`
- `failed`
- `canceled`

3. `RefinementStepStatus`
- `waiting`
- `running`
- `done`
- `failed`

提交语义：

1. 大纲未确认：`submit -> confirm_outline_and_start`
2. 大纲已确认：`submit -> rerun_refinement`
3. rerun 必须创建新版本，不覆盖旧版本

## 4. 路由阶段映射规则

`/projects/:projectId` 跳转阶段（代码：`apps/web/src/features/shared/lib/project-stage.ts`）：

1. `published` -> `publish`
2. `creating | export_ready | exported` -> `creation`
3. 其他状态 -> `planner`

## 5. 错误码规范

### 5.1 通用

1. `INVALID_ARGUMENT`
2. `NOT_FOUND`
3. `CONFLICT`
4. `FORBIDDEN`
5. `RATE_LIMITED`
6. `INTERNAL_ERROR`

### 5.2 Explore / 项目创建

1. `PROMPT_REQUIRED`
2. `PROJECT_CREATE_FAILED`

### 5.3 Planner

1. `PLANNER_REQUIREMENT_EMPTY`
2. `PLANNER_OUTLINE_NOT_CONFIRMED`
3. `PLANNER_REFINEMENT_RUNNING_CONFLICT`
4. `PLANNER_VERSION_NOT_FOUND`
5. `PLANNER_VERSION_EDIT_CONFLICT`
6. `PLANNER_CONFIG_INVALID_ASPECT_RATIO`
7. `PLANNER_CONFIG_INVALID_MODEL`
8. `PLANNER_POINTS_INSUFFICIENT`

### 5.4 Creation

1. `SHOT_NOT_FOUND`
2. `SHOT_VERSION_NOT_FOUND`
3. `SHOT_VERSION_APPLY_CONFLICT`
4. `SHOT_BATCH_EMPTY`
5. `MATERIAL_UPLOAD_INVALID`

### 5.5 Publish

1. `PUBLISH_DRAFT_INVALID`
2. `PUBLISH_HISTORY_NOT_FOUND`
3. `PUBLISH_ALREADY_SUBMITTED`

### 5.6 Execution

1. `RUN_TIMEOUT`
2. `RUN_EVENT_DUPLICATED`
3. `RUN_STATE_INVALID_TRANSITION`

## 6. 错误响应格式

```ts
interface ErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
```
