# 内部执行接口规格（v0.2）

版本：v0.2  
日期：2026-03-09  
状态：现状基线 + Planner v2 扩展

## 1. 范围

定义后端 <-> Worker/Agent 执行层接口与事件，重点补齐 Planner 的大纲/细化任务语义。

## 2. 现状基线（与 Prisma 对齐）

`RunType` 当前枚举（`prisma/schema.prisma`）：

1. `PLANNER_DOC_UPDATE`
2. `STORYBOARD_GENERATION`
3. `SHOT_RENDER`
4. `MUSIC_GENERATION`
5. `LIPSYNC_GENERATION`
6. `EXPORT`
7. `PUBLISH`

`RunStatus` 当前枚举：

1. `QUEUED`
2. `RUNNING`
3. `COMPLETED`
4. `FAILED`
5. `CANCELED`
6. `TIMED_OUT`

## 3. Planner v2 扩展约定

为了支持“确认大纲 + 细化版本历史”，建议在 `PLANNER_DOC_UPDATE` 下细分任务：

1. `planner_outline_generate`
2. `planner_refinement_generate`

建议通过 `payload.jobType` 表示细分任务，而不是直接修改 `RunType`。

## 4. 任务下发（建议）

### 4.1 通用执行任务

事件主题：`execution.jobs.v1`

```ts
interface ExecutionJob {
  runId: string;
  runType:
    | 'PLANNER_DOC_UPDATE'
    | 'STORYBOARD_GENERATION'
    | 'SHOT_RENDER'
    | 'MUSIC_GENERATION'
    | 'LIPSYNC_GENERATION'
    | 'EXPORT'
    | 'PUBLISH';
  projectId: string;
  episodeId?: string;
  shotId?: string;
  payload: Record<string, unknown>;
  idempotencyKey: string; // 建议 = runId
  createdAt: string;
}
```

### 4.2 Planner 专用任务（推荐内部 HTTP）

`POST /internal/planner/jobs`

```ts
interface InternalPlannerJobRequest {
  jobType: 'planner_outline_generate' | 'planner_refinement_generate';
  projectId: string;
  episodeId: string;
  plannerSessionId: string;
  outlineVersionId?: string;
  refinementVersionId?: string;
  payload: Record<string, unknown>;
}
```

## 5. 执行回传

事件主题：`execution.events.v1`

```ts
type ExecutionEventType =
  | 'run.started'
  | 'run.progress'
  | 'run.log'
  | 'run.completed'
  | 'run.failed';

interface ExecutionEvent {
  runId: string;
  eventType: ExecutionEventType;
  projectId: string;
  episodeId?: string;
  shotId?: string;
  progressPercent?: number;
  message?: string;
  output?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
  occurredAt: string;
}
```

Planner 细化建议额外支持：

`POST /internal/planner/jobs/:jobId/progress`

```ts
interface InternalPlannerJobProgressRequest {
  status: 'running' | 'ready' | 'failed';
  stepCode?: string;
  stepStatus?: 'waiting' | 'running' | 'done' | 'failed';
  progressPercent?: number; // 0..100
  partialDocSnapshot?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
}
```

## 6. 状态更新规则

1. 收到 `run.started`：`Run.status = RUNNING`
2. 收到 `run.progress`：更新 `Run.progressPercent`
3. 收到 `run.completed`：`Run.status = COMPLETED`
4. 收到 `run.failed`：`Run.status = FAILED`，回写 `errorCode/errorMessage`

Planner 任务附加规则：

1. `planner_outline_generate` 完成后推进 `OutlineVersion` 为 `READY`。
2. `planner_refinement_generate` 回传步骤进度并增量更新 `docSnapshot`。
3. 任务失败不得覆盖已就绪历史版本。

## 7. 幂等与去重要求

1. 同一 `runId + eventType + occurredAt` 只处理一次。
2. Worker 超时重投时，不得重复创建副作用数据（如 `ShotVersion`）。
3. `planner_refinement_generate` 重投不得产生重复版本号。

## 8. 失败兜底

1. Worker 无回传超过阈值：置 `Run.status = TIMED_OUT`
2. 后端重试策略不得绕过状态机校验
3. 所有失败需落 `EventLog`
