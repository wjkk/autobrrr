# 状态机与错误码规格（v0.3）

版本：v0.3  
日期：2026-03-13  
状态：后端开工基线

## 1. 状态域

### 1.1 ProjectStatus

1. `DRAFT`
2. `PLANNING`
3. `READY_FOR_STORYBOARD`
4. `CREATING`
5. `EXPORT_READY`
6. `EXPORTED`
7. `PUBLISHED`
8. `FAILED`
9. `ARCHIVED`

### 1.2 PlannerStatus

1. `IDLE`
2. `UPDATING`
3. `READY`

### 1.3 ShotStatus

1. `PENDING`
2. `QUEUED`
3. `GENERATING`
4. `SUCCESS`
5. `FAILED`

### 1.4 ShotVersionStatus

1. `PENDING_APPLY`
2. `ACTIVE`
3. `ARCHIVED`

### 1.5 RunStatus

1. `QUEUED`
2. `RUNNING`
3. `COMPLETED`
4. `FAILED`
5. `CANCELED`
6. `TIMED_OUT`

说明：

1. 对异步 provider，第三方任务处于 `submitted / queued / processing` 时，本地仍保持 `RUNNING`。
2. 第三方原始状态单独记录在 `providerStatus`，不增加主状态枚举。

### 1.6 RecipeExecutionStatus

1. `QUEUED`
2. `RUNNING`
3. `COMPLETED`
4. `FAILED`
5. `CANCELED`

## 2. 核心流转

### 2.1 Project 主流程

1. `DRAFT -> PLANNING`
2. `PLANNING -> READY_FOR_STORYBOARD`
3. `READY_FOR_STORYBOARD -> CREATING`
4. `CREATING -> EXPORT_READY`
5. `EXPORT_READY -> EXPORTED`
6. `EXPORTED -> PUBLISHED`
7. 任意阶段可在严重失败时转 `FAILED`

### 2.2 Shot 主流程

1. `PENDING -> QUEUED`
2. `QUEUED -> GENERATING`
3. `GENERATING -> SUCCESS`
4. `GENERATING -> FAILED`
5. `FAILED -> QUEUED`（重试）

### 2.3 ShotVersion 流程

1. 新生成版本默认 `PENDING_APPLY`
2. 用户应用后：`PENDING_APPLY -> ACTIVE`
3. 原 active 版本转 `ARCHIVED`

### 2.4 Run 流程

1. `QUEUED -> RUNNING`
2. `RUNNING -> COMPLETED`
3. `RUNNING -> FAILED`
4. `RUNNING -> CANCELED`
5. `RUNNING -> TIMED_OUT`

异步 provider 补充规则：

1. `RUNNING` 期间允许多次更新 `providerStatus`
2. 获得 `providerJobId` 不改变主状态
3. 轮询或 callback 成功后才进入 `COMPLETED`

### 2.5 RecipeExecution 流程

1. `QUEUED -> RUNNING`
2. `RUNNING -> COMPLETED`
3. `RUNNING -> FAILED`
4. `RUNNING -> CANCELED`

## 3. 规则

### 3.1 当前生效版本规则

1. `Shot.activeVersionId` 是当前生效版本唯一真相。
2. 子表中的 `ACTIVE` 状态用于展示，不作为唯一事实来源。

### 3.2 Recipe 执行规则

1. 根 `RecipeExecution` 运行时必须存在根 `Run(RECIPE_EXECUTION)`。
2. 任一关键子步骤失败，根执行默认失败。
3. 部分步骤可重试，但不允许 silently 覆盖历史产物。

### 3.3 任务重试规则

1. 重试必须保留原始失败记录。
2. 重试不得直接擦除旧 `Run`。
3. 同一幂等键重复提交，不应重复创建并发任务。

## 4. 错误码规范

### 4.1 通用

1. `INVALID_ARGUMENT`
2. `NOT_FOUND`
3. `CONFLICT`
4. `FORBIDDEN`
5. `RATE_LIMITED`
6. `INTERNAL_ERROR`

### 4.2 项目与工作区

1. `PROMPT_REQUIRED`
2. `PROJECT_CREATE_FAILED`
3. `EPISODE_NOT_FOUND`
4. `WORKSPACE_NOT_READY`

### 4.3 Planner

1. `PLANNER_REQUIREMENT_EMPTY`
2. `PLANNER_OUTLINE_NOT_CONFIRMED`
3. `PLANNER_REFINEMENT_RUNNING_CONFLICT`
4. `PLANNER_VERSION_NOT_FOUND`
5. `PLANNER_CONFIG_INVALID_MODEL`
6. `PLANNER_CONFIG_INVALID_ASPECT_RATIO`

### 4.4 Creation

1. `SHOT_NOT_FOUND`
2. `SHOT_VERSION_NOT_FOUND`
3. `SHOT_VERSION_APPLY_CONFLICT`
4. `MATERIAL_UPLOAD_INVALID`
5. `CANVAS_EDIT_INVALID`
6. `VOICE_UPLOAD_INVALID`
7. `MUSIC_PROMPT_INVALID`
8. `LIPSYNC_INPUT_INVALID`

### 4.5 Model Registry

1. `MODEL_FAMILY_NOT_FOUND`
2. `MODEL_ENDPOINT_NOT_FOUND`
3. `MODEL_PROVIDER_DISABLED`
4. `MODEL_RESOLUTION_FAILED`
5. `MODEL_FALLBACK_EXHAUSTED`

### 4.6 Recipe

1. `RECIPE_NOT_FOUND`
2. `RECIPE_INVALID_JSON`
3. `RECIPE_SLOT_MISSING`
4. `RECIPE_EXECUTION_CONFLICT`

### 4.7 Execution

1. `RUN_TIMEOUT`
2. `RUN_EVENT_DUPLICATED`
3. `RUN_STATE_INVALID_TRANSITION`
4. `PROVIDER_TIMEOUT`
5. `PROVIDER_BAD_RESPONSE`
6. `ASSET_WRITE_FAILED`
7. `PROVIDER_ASYNC_JOB_NOT_FOUND`
8. `PROVIDER_CALLBACK_INVALID`
9. `PROVIDER_POLL_EXHAUSTED`

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

## 6. 前端提示原则

1. `INVALID_ARGUMENT` 类错误直接提示用户输入问题。
2. `CONFLICT` 类错误提示当前状态冲突并建议刷新。
3. `PROVIDER_*` 类错误提示生成失败，可重试或切换模型策略。
4. `INTERNAL_ERROR` 只给用户通用文案，详情进入日志。
5. fallback 发生时，前端应能展示“已切换备用通道”而不是静默切换。

## 7. 关联文档

1. `docs/specs/backend-data-api-spec-v0.3.md`
2. `docs/specs/internal-execution-api-spec-v0.3.md`
3. `docs/specs/backend-system-design-spec-v0.3.md`
