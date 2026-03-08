# 内部执行接口规格（v0.2）

版本：v0.2  
日期：2026-03-08  
状态：内部契约基线

## 1. 范围

本文件定义内部接口：后端 <-> Worker/Agent 执行层。

## 2. 执行任务类型

与 `prisma/schema.prisma` 的 `RunType` 对齐：

- `PLANNER_DOC_UPDATE`
- `STORYBOARD_GENERATION`
- `SHOT_RENDER`
- `MUSIC_GENERATION`
- `LIPSYNC_GENERATION`
- `EXPORT`
- `PUBLISH`

## 3. 任务下发

建议事件主题：`execution.jobs.v1`

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

## 4. 执行回传

建议事件主题：`execution.events.v1`

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

## 5. 状态更新规则

1. 收到 `run.started`：`Run.status = RUNNING`
2. 收到 `run.progress`：更新 `Run.progressPercent`
3. 收到 `run.completed`：`Run.status = COMPLETED`
4. 收到 `run.failed`：`Run.status = FAILED`，回写 `errorCode/errorMessage`

若任务是 `SHOT_RENDER` 且完成：

- 创建 `ShotVersion`
- 新版本默认 `PENDING_APPLY`
- 不自动覆盖 `Shot.activeVersionId`

## 6. 幂等要求

- 同一 `runId + eventType + occurredAt` 只处理一次。
- Worker 超时重投时，不得重复创建 `ShotVersion`。

## 7. 失败兜底

- Worker 无回传超过阈值：置 `Run.status = TIMED_OUT`
- 后端重试策略不得绕过状态机校验
- 所有失败需落 `EventLog`
