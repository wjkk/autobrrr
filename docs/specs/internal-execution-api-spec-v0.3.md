# 内部执行接口规格（v0.3）

版本：v0.3  
日期：2026-03-13  
状态：Worker 开工基线

## 1. 范围

定义后端 <-> Worker / provider 执行层协议，覆盖：

1. 任务下发
2. 进度回传
3. 完成 / 失败回传
4. Recipe 执行编排
5. provider 解析与快照

## 2. Run 基线

### 2.1 RunType

建议统一使用以下类型：

1. `PLANNER_DOC_UPDATE`
2. `STORYBOARD_GENERATION`
3. `IMAGE_GENERATION`
4. `VIDEO_GENERATION`
5. `MUSIC_GENERATION`
6. `VOICE_PROCESSING`
7. `LIPSYNC_GENERATION`
8. `EXPORT`
9. `PUBLISH`
10. `RECIPE_EXECUTION`

### 2.2 RunStatus

1. `QUEUED`
2. `RUNNING`
3. `COMPLETED`
4. `FAILED`
5. `CANCELED`
6. `TIMED_OUT`

说明：

1. 对异步 provider，本地 `RUNNING` 覆盖 provider 的 `submitted / queued / processing` 中间态。
2. provider 中间态进入 `providerStatus`，不单独扩展主状态枚举。

## 3. 任务下发协议

### 3.1 通用任务消息

事件主题建议：`execution.jobs.v1`

```ts
interface ExecutionJob {
  runId: string;
  parentRunId?: string;
  recipeExecutionId?: string;
  runType:
    | 'PLANNER_DOC_UPDATE'
    | 'STORYBOARD_GENERATION'
    | 'IMAGE_GENERATION'
    | 'VIDEO_GENERATION'
    | 'MUSIC_GENERATION'
    | 'VOICE_PROCESSING'
    | 'LIPSYNC_GENERATION'
    | 'EXPORT'
    | 'PUBLISH'
    | 'RECIPE_EXECUTION';
  projectId: string;
  episodeId?: string;
  shotId?: string;
  resourceType?: string;
  resourceId?: string;
  modelResolution?: {
    familyId?: string;
    providerId?: string;
    endpointId?: string;
    remoteModelKey?: string;
  };
  providerExecution?: {
    mode: 'sync' | 'async-poll' | 'async-callback';
    callbackUrl?: string;
    callbackToken?: string;
  };
  payload: Record<string, unknown>;
  idempotencyKey: string;
  createdAt: string;
}
```

### 3.2 Recipe 根任务

`RECIPE_EXECUTION` 的 `payload` 应包含：

1. `recipeId`
2. `recipeVersion`
3. `inputs`
4. `workflow`
5. `overrides`

Worker 接到后负责拆分子任务，并为每一步创建子 `Run`。

## 4. 进度回传协议

事件主题建议：`execution.events.v1`

```ts
type ExecutionEventType =
  | 'run.started'
  | 'run.progress'
  | 'run.log'
  | 'run.completed'
  | 'run.failed'
  | 'run.canceled';

interface ExecutionEvent {
  runId: string;
  eventType: ExecutionEventType;
  projectId: string;
  episodeId?: string;
  shotId?: string;
  progressPercent?: number;
  stepCode?: string;
  message?: string;
  output?: Record<string, unknown>;
  providerJobId?: string;
  providerStatus?: string;
  errorCode?: string;
  errorMessage?: string;
  occurredAt: string;
}
```

## 5. provider 调用约定

### 5.1 调用前解析

Worker 执行前必须完成模型解析：

1. 从 `family + policy` 解析到 `endpoint`
2. 将 `providerId / endpointId / remoteModelKey` 固化到 `Run`
3. 若 provider 为异步模式，同时固化执行模式：`sync / async-poll / async-callback`

### 5.2 调用快照

执行后必须写入：

1. `request snapshot`
2. `response snapshot`
3. `provider latency`
4. `provider request id`（若存在）
5. `provider job id`（若存在）
6. `provider raw status`

### 5.3 异步 provider 首次响应

若 provider 首次只返回 `jobId / taskId / uuid`，执行层必须：

1. 回传 `providerJobId`
2. 回传 `providerStatus=submitted`
3. 保持本地 `Run.status = RUNNING`
4. 不得误判为 `COMPLETED`

### 5.4 轮询模式

若 provider 为 `async-poll`：

1. Worker 根据 `providerJobId` 调用查询接口
2. 每次轮询更新 `providerStatus`
3. 最终成功或失败时再回传 `run.completed / run.failed`

### 5.5 callback 模式

若 provider 为 `async-callback`：

1. API 提供 callback 入口
2. callback 先校验签名或 token
3. callback 只推进运行态，不直接写业务产物
4. 业务回写仍走统一服务层

## 6. 状态更新规则

1. 收到 `run.started`：`Run.status = RUNNING`
2. 收到 `run.progress`：更新进度与步骤信息
3. 收到 `run.completed`：`Run.status = COMPLETED`
4. 收到 `run.failed`：`Run.status = FAILED`
5. 收到 `run.canceled`：`Run.status = CANCELED`

补充：

1. 收到仅包含 `providerJobId` 的中间响应时，不进入 `COMPLETED`
2. 轮询期间仅更新 `providerStatus`

## 7. 结果回写规则

### 7.1 IMAGE / VIDEO

1. 生成 `Asset`
2. 创建 `ShotVersion`
3. 如命令是自动应用，则更新 `Shot.activeVersionId`

### 7.2 MUSIC

1. 生成 `Asset(MUSIC_AUDIO)`
2. 更新 `music_drafts`

### 7.3 VOICE

1. 上传或处理完成后生成 `Asset(VOICE_AUDIO)`
2. 更新 `voice_drafts`

### 7.4 LIPSYNC

1. 生成 `Asset(LIPSYNC_VIDEO)`
2. 关联到目标 shot 或工作区

### 7.5 RECIPE_EXECUTION

1. 根任务只汇总状态，不直接产生主资产
2. 真正产物由子任务分别产出
3. 子任务全部完成后根任务才可 `COMPLETED`

## 8. 幂等与去重

1. `runId` 是内部唯一主键。
2. `idempotencyKey` 用于业务去重。
3. 同一 `runId + eventType + occurredAt` 只处理一次。
4. Worker 重投不得重复创建 `ShotVersion / Asset`。
5. 同一 `providerId + providerJobId` 的完成事件只处理一次。

## 9. 超时与失败

### 9.1 超时

规则：

1. 后端超过阈值未收到事件，标记 `TIMED_OUT`
2. 超时后允许重试，但必须创建新的 retry run 或显式 retry 记录

异步 provider 额外规则：

1. 超过最大轮询次数仍未完成，置 `TIMED_OUT`
2. callback 模式在回调丢失时也必须有兜底轮询或超时收敛

### 9.2 失败分类

建议至少区分：

1. `VALIDATION_ERROR`
2. `PROVIDER_TIMEOUT`
3. `PROVIDER_BAD_RESPONSE`
4. `PROVIDER_RATE_LIMITED`
5. `ASSET_WRITE_FAILED`
6. `WORKFLOW_CONFIG_INVALID`
7. `INTERNAL_ERROR`
8. `PROVIDER_ASYNC_JOB_NOT_FOUND`
9. `PROVIDER_CALLBACK_INVALID`

## 10. Recipe 工作流执行建议

执行器对 recipe workflow 的最低支持：

1. 顺序执行
2. 失败即停
3. 子步骤进度回传
4. 局部重试

第三方失败与 fallback 建议：

1. 主 endpoint 失败后允许切换同 `ModelFamily` 的候选 endpoint
2. fallback 必须生成事件日志
3. fallback 成功后，最终 `Run` 仍需保留原失败上下文

后续如 workflow 复杂度上升，再引入 DAG 调度能力。

## 11. 关联文档

1. `docs/specs/backend-system-design-spec-v0.3.md`
2. `docs/specs/backend-data-api-spec-v0.3.md`
3. `docs/specs/state-machine-and-error-code-spec-v0.3.md`
