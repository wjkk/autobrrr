# 状态机与错误码规格（v0.2）

版本：v0.2  
日期：2026-03-08  
状态：实现基线

## 1. 状态枚举（前后端统一）

1. ProjectStatus
- `draft`
- `planning`
- `ready_for_storyboard`
- `creating`
- `export_ready`
- `exported`
- `published`
- `failed`
- `archived`

2. PlannerStatus
- `idle`
- `updating`
- `ready`

3. ShotStatus
- `pending`
- `queued`
- `generating`
- `success`
- `failed`

4. ShotVersionStatus
- `pending_apply`
- `active`
- `archived`

5. PublishDraftStatus
- `draft`
- `submitted`
- `approved`
- `rejected`
- `failed`

6. RunStatus
- `queued`
- `running`
- `completed`
- `failed`
- `canceled`
- `timed_out`

## 2. 核心流转

1. Project 主流程
- `draft -> planning -> ready_for_storyboard -> creating -> export_ready -> exported -> published`

2. Planner
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

## 3. 路由阶段映射规则

`/projects/:projectId` 跳转阶段：

- `published` -> `publish`
- `creating | export_ready | exported` -> `creation`
- 其他 -> `planner`

## 4. 错误码规范

### 4.1 通用

- `INVALID_ARGUMENT`
- `NOT_FOUND`
- `CONFLICT`
- `FORBIDDEN`
- `RATE_LIMITED`
- `INTERNAL_ERROR`

### 4.2 Planner

- `PLANNER_REQUIREMENT_EMPTY`
- `PLANNER_NOT_READY`
- `PLANNER_POINTS_INSUFFICIENT`

### 4.3 Creation

- `SHOT_NOT_FOUND`
- `SHOT_VERSION_NOT_FOUND`
- `SHOT_VERSION_APPLY_CONFLICT`
- `SHOT_BATCH_EMPTY`
- `MATERIAL_UPLOAD_INVALID`

### 4.4 Publish

- `PUBLISH_DRAFT_INVALID`
- `PUBLISH_HISTORY_NOT_FOUND`
- `PUBLISH_ALREADY_SUBMITTED`

### 4.5 Execution

- `RUN_TIMEOUT`
- `RUN_EVENT_DUPLICATED`
- `RUN_STATE_INVALID_TRANSITION`

## 5. 错误响应格式

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
