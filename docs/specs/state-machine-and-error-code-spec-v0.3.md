# 状态机与错误码规格（v0.3）

版本：v0.3  
日期：2026-03-15  
状态：按当前代码重写后的现行实现说明

## 1. 事实来源

本文件以以下代码为准：

1. `/Users/jiankunwu/project/aiv/apps/api/prisma/schema.prisma`
2. `/Users/jiankunwu/project/aiv/apps/api/src/routes/*.ts`
3. `/Users/jiankunwu/project/aiv/apps/api/src/lib/run-worker.ts`
4. `/Users/jiankunwu/project/aiv/apps/api/src/lib/run-lifecycle.ts`

## 2. 当前正式状态域

### 2.1 `ProjectStatus`

1. `DRAFT`
2. `PLANNING`
3. `READY_FOR_STORYBOARD`
4. `CREATING`
5. `EXPORT_READY`
6. `EXPORTED`
7. `PUBLISHED`
8. `FAILED`
9. `ARCHIVED`

### 2.2 `EpisodeStatus`

1. `DRAFT`
2. `PLANNING`
3. `READY_FOR_STORYBOARD`
4. `CREATING`
5. `EXPORT_READY`
6. `EXPORTED`
7. `PUBLISHED`
8. `ARCHIVED`

### 2.3 `PlannerStatus`

1. `IDLE`
2. `UPDATING`
3. `READY`

### 2.4 `PlannerOutlineStatus`

1. `DRAFT`
2. `READY`
3. `FAILED`

### 2.5 `PlannerRefinementStatus`

1. `DRAFT`
2. `RUNNING`
3. `READY`
4. `FAILED`

### 2.6 `PlannerStepStatus`

1. `PENDING`
2. `RUNNING`
3. `DONE`
4. `FAILED`

### 2.7 `ProfileReleaseStatus`

1. `DRAFT`
2. `ACTIVE`
3. `DEPRECATED`
4. `ARCHIVED`

### 2.8 `ShotStatus`

1. `PENDING`
2. `QUEUED`
3. `GENERATING`
4. `SUCCESS`
5. `FAILED`

### 2.9 `ShotVersionStatus`

1. `PENDING_APPLY`
2. `ACTIVE`
3. `ARCHIVED`

### 2.10 `RunStatus`

1. `QUEUED`
2. `RUNNING`
3. `COMPLETED`
4. `FAILED`
5. `CANCELED`
6. `TIMED_OUT`

### 2.11 当前文档中不再作为正式状态域的旧对象

以下状态域曾出现在旧文档，但当前代码不应再视为现行基线：

1. `RecipeExecutionStatus`
2. `event_logs` 相关状态机
3. `voice_drafts / music_drafts / lipsync_drafts` 的状态机

## 3. 当前真实核心流转

### 3.1 Project 主流程

当前真实主流转为：

1. `DRAFT -> PLANNING`
2. `PLANNING -> READY_FOR_STORYBOARD`
3. `READY_FOR_STORYBOARD -> CREATING`
4. `CREATING -> PUBLISHED` 或 `CREATING -> EXPORT_READY -> EXPORTED -> PUBLISHED`
5. 严重失败时可进入 `FAILED`

说明：

1. 当前代码并未在所有环节严格使用完整的导出链路。
2. 实际常见主链路是：`DRAFT -> PLANNING -> READY_FOR_STORYBOARD -> CREATING -> PUBLISHED`。

### 3.2 Episode 主流程

1. `DRAFT -> PLANNING`
2. `PLANNING -> READY_FOR_STORYBOARD`
3. `READY_FOR_STORYBOARD -> CREATING`
4. `CREATING -> PUBLISHED`

### 3.3 PlannerSession 主流程

1. 新建 session：`IDLE`
2. 提交 planner 生成：`IDLE / READY -> UPDATING`
3. 生成完成：`UPDATING -> READY`

### 3.4 Planner Outline Version

1. 新建 outline version：`DRAFT / READY`
2. 当前实现中，大纲成功生成后通常直接进入 `READY`
3. 用户确认某个大纲版本后：
   - `isConfirmed = true`
   - `confirmedAt != null`
4. `isActive` 表示当前激活大纲版本

### 3.5 Planner Refinement Version

1. 创建 refinement version
2. 同步结构化文档与派生实体
3. 成功后进入 `READY`
4. `isActive` 表示当前激活细化版本

### 3.6 Shot 主流程

1. `PENDING -> QUEUED`
2. `QUEUED -> GENERATING`
3. `GENERATING -> SUCCESS`
4. `GENERATING -> FAILED`

说明：

1. 当前创建生成命令时，shot 会先进入 `QUEUED`
2. 由 worker 真正领取任务后进入运行过程
3. 完成后由 `ShotVersion` 与 `activeVersionId` 决定当前结果

### 3.7 ShotVersion 主流程

1. 新生成版本：`PENDING_APPLY`
2. 激活后：`ACTIVE`
3. 原激活版本转为 `ARCHIVED`

### 3.8 Run 主流程

1. `QUEUED -> RUNNING`
2. `RUNNING -> COMPLETED`
3. `RUNNING -> FAILED`
4. `RUNNING -> CANCELED`
5. `RUNNING -> TIMED_OUT`

补充规则：

1. 对异步 provider，主状态始终保持 `RUNNING`
2. provider 中间态写入 `providerStatus`
3. 首次返回 `providerJobId` 不得误判为完成

## 4. 当前关键状态判定规则

### 4.1 当前生效对象的真相源

当前“当前生效对象”主要通过显式外键或 `isActive` 标记表达：

1. `Project.currentEpisodeId`
2. `Episode.activePlannerSessionId`
3. `PlannerOutlineVersion.isActive`
4. `PlannerRefinementVersion.isActive`
5. `Shot.activeVersionId`

### 4.2 Run 与 provider 中间态

当前中间态不扩展 `RunStatus`，而是写入：

1. `providerStatus`
2. `providerJobId`
3. `nextPollAt`
4. `pollAttemptCount`

## 5. 当前真实错误码范围

### 5.1 通用

1. `INVALID_ARGUMENT`
2. `NOT_FOUND`
3. `UNAUTHORIZED`
4. `INTERNAL_ERROR`

### 5.2 AIV API / Web 代理层

1. `AIV_API_UNAVAILABLE`
2. `AIV_API_INVALID_JSON`
3. `AIV_API_HTTP_ERROR`
4. `AIV_API_EMPTY_RESPONSE`
5. `AIV_API_REQUEST_FAILED`

### 5.3 认证

1. `EMAIL_ALREADY_EXISTS`
2. `INVALID_CREDENTIALS`
3. `UNAUTHORIZED`

### 5.4 模型 / Provider

1. `MODEL_NOT_FOUND`
2. `INVALID_IMAGE_MODEL`
3. `PROVIDER_NOT_CONFIGURED`
4. `BASE_URL_REQUIRED`
5. `ENDPOINT_NOT_FOUND`
6. `MODEL_SYNC_FAILED`
7. `TEST_NOT_SUPPORTED`
8. `PROVIDER_TEST_FAILED`
9. `SYNC_NOT_SUPPORTED`

### 5.5 Planner 主流程

1. `PLANNER_AGENT_NOT_CONFIGURED`
2. `PLANNER_SESSION_REQUIRED`
3. `PLANNER_OUTLINE_NOT_FOUND`
4. `PLANNER_OUTLINE_LOCKED`
5. `PLANNER_OUTLINE_ALREADY_CONFIRMED`
6. `PLANNER_REFINEMENT_REQUIRED`
7. `PLANNER_REFINEMENT_NOT_FOUND`
8. `PLANNER_DOCUMENT_REQUIRED`
9. `PLANNER_SCOPE_TARGET_NOT_FOUND`
10. `PLANNER_SUBJECT_NOT_FOUND`
11. `PLANNER_SCENE_NOT_FOUND`
12. `PLANNER_SHOT_NOT_FOUND`
13. `PLANNER_ASSET_NOT_OWNED`

### 5.6 Planner Debug

1. `PLANNER_DEBUG_RUN_NOT_FOUND`
2. `PLANNER_DEBUG_RUN_FAILED`
3. `PLANNER_DEBUG_REPLAY_FAILED`
4. `PLANNER_DEBUG_COMPARE_FAILED`
5. `PLANNER_SUB_AGENT_NOT_FOUND`

### 5.7 Publish

1. `PUBLISH_NOT_READY`

### 5.8 Run / Execution

1. `RUN_NOT_CANCELABLE`
2. `RUN_TYPE_NOT_SUPPORTED`
3. `RUN_RESOURCE_INVALID`
4. `PLANNER_SESSION_NOT_FOUND`
5. `PLANNER_ENTITY_IMAGE_FINALIZE_FAILED`
6. `SHOT_NOT_FOUND`
7. `PROVIDER_SUBMIT_INVALID_STATE`
8. `PROVIDER_POLL_INVALID_STATE`
9. `PROVIDER_JOB_MISMATCH`
10. `PROVIDER_POLL_UNSUPPORTED`
11. `PROVIDER_CALLBACK_UNSUPPORTED`
12. `PROVIDER_CALLBACK_FAILED`
13. `PROVIDER_PROMPT_REQUIRED`
14. `PROVIDER_RUN_KIND_UNSUPPORTED`
15. `PROVIDER_MODEL_REQUIRED`
16. `PROVIDER_JOB_ID_MISSING`
17. `PROVIDER_JOB_ID_REQUIRED`
18. `PROVIDER_TASK_FAILED`

## 6. 当前错误响应格式

```ts
interface ErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

## 7. 当前前端提示原则

建议按当前实现统一成：

1. `INVALID_ARGUMENT`：直接提示用户输入或参数问题
2. `NOT_FOUND`：提示资源不存在或已失效
3. `UNAUTHORIZED`：跳转登录或展示统一未登录态
4. `MODEL_* / PROVIDER_*`：提示模型或通道不可用，并提供重试/切换入口
5. `PLANNER_*`：提示当前策划阶段状态不满足，建议刷新或切换版本
6. `RUN_*`：提示任务状态冲突或执行失败

## 8. 当前文档与代码差异修正结论

与旧版相比，本次修正的关键点：

1. 删除了并不存在于当前代码主路径的 `RecipeExecutionStatus` 作为正式状态域
2. 错误码列表改为“按当前代码真实出现过的 code 收敛”
3. 明确当前系统主要依靠 `Run + providerStatus` 维护执行态，而非额外事件状态机
