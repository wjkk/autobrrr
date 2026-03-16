# 内部执行接口规格（v0.3）

版本：v0.3  
日期：2026-03-15  
状态：按当前代码重写后的现行执行链路说明

## 1. 文档目的

本文用于说明当前系统里“任务执行层”的真实实现，而不是事件总线目标态。

当前事实来源：

1. `/Users/jiankunwu/project/aiv/apps/api/src/lib/run-worker.ts`
2. `/Users/jiankunwu/project/aiv/apps/api/src/lib/provider-adapters.ts`
3. `/Users/jiankunwu/project/aiv/apps/api/src/lib/run-lifecycle.ts`
4. `/Users/jiankunwu/project/aiv/apps/api/src/routes/provider-callbacks.ts`
5. `/Users/jiankunwu/project/aiv/apps/api/src/worker.ts`

## 2. 当前执行模型

当前系统没有实现：

1. `execution.jobs.v1` 事件总线
2. `execution.events.v1` 事件回传总线
3. 独立消息队列协议

当前真实实现是：

1. API 创建 `Run`
2. `Run.status = QUEUED`
3. `/Users/jiankunwu/project/aiv/apps/api/src/worker.ts` 调用 `processNextQueuedRun()`
4. `run-worker.ts` 从数据库领取最早的 queued run 或待轮询 run
5. `provider-adapters.ts` 根据 provider 与模型类型执行：
   - submit
   - poll
   - callback handle
6. `run-lifecycle.ts` 在任务完成后回写业务对象

## 3. 当前正式执行账本

### 3.1 `Run`

当前 `Run` 是唯一正式执行账本。

真实字段重点包括：

1. `runType`
2. `resourceType`
3. `resourceId`
4. `status`
5. `executorType`
6. `inputJson`
7. `outputJson`
8. `providerJobId`
9. `providerStatus`
10. `providerCallbackToken`
11. `nextPollAt`
12. `lastPolledAt`
13. `pollAttemptCount`
14. `startedAt`
15. `finishedAt`
16. `errorCode`
17. `errorMessage`

### 3.2 当前没有独立执行事件表

当前 schema 中**没有** `event_logs`。

因此当前执行相关审计主要依赖：

1. `runs.inputJson`
2. `runs.outputJson`
3. `runs.providerStatus`
4. `runs.errorCode / errorMessage`

这能支撑基本功能，但不足以满足后期分析要求。

## 4. 当前支持的 RunType

当前真实枚举：

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

但当前主路径实际重点覆盖：

1. `PLANNER_DOC_UPDATE`
2. `IMAGE_GENERATION`
3. `VIDEO_GENERATION`
4. `PUBLISH`

`RECIPE_EXECUTION` 目前尚未进入真实主流程。

## 5. 当前 Worker 行为

### 5.1 领取规则

`run-worker.ts` 当前使用数据库直接领取任务：

1. 先找 `status = RUNNING && providerJobId != null && nextPollAt <= now` 的待轮询任务
2. 如果没有，再找 `status = QUEUED` 的任务
3. 领取 queued task 时，将其原子更新为 `RUNNING`

### 5.2 提交与轮询规则

#### submit

对于无 `providerJobId` 的任务：

1. 走 `adapter.submit(run)`
2. 若 provider 同步完成：直接写回 `outputJson.providerData`
3. 若 provider 返回异步任务：写入
   - `providerJobId`
   - `providerCallbackToken`
   - `providerStatus`
   - `nextPollAt`

#### poll

对于已有 `providerJobId` 的任务：

1. 走 `adapter.poll(run)`
2. 更新 `providerStatus`
3. 增加 `pollAttemptCount`
4. 更新 `lastPolledAt`
5. 成功后进入统一 lifecycle 收口

## 6. 当前 Provider Adapter 协议

`provider-adapters.ts` 当前抽象为：

```ts
interface ProviderAdapter {
  submit(run: Run): Promise<ProviderAdapterUpdate>;
  poll(run: Run): Promise<ProviderAdapterUpdate>;
  handleCallback(run: Run, payload: ProviderCallbackPayload): Promise<ProviderAdapterUpdate>;
}
```

返回值分为：

1. `submitted`
2. `running`
3. `completed`
4. `failed`

这是当前真实的内部执行协议，优先级高于旧文档中的事件总线设计。

## 7. 当前支持的 Provider 执行模式

### 7.1 ARK

当前主要用于文本生成。

特点：

1. 以同步响应为主
2. 不支持 poll
3. 不支持 callback

### 7.2 Platou

当前支持：

1. 文本生成
2. 图片生成
3. 视频生成

特点：

1. 文本 / 图片可同步完成
2. 视频走 taskId + poll 模式

### 7.3 Mock Proxy

当用户 provider 配置不可用时，系统当前会对部分 provider 走 mock/fallback 提交逻辑，以保持链路可演示。

## 8. Provider Callback 真实行为

当前内部 callback 入口：

- `POST /api/internal/provider-callbacks/:callbackToken`

真实规则：

1. 用 `providerCallbackToken` 找到 `Run`
2. 若 `Run` 已终态，则直接返回当前 run
3. 校验 `providerJobId` 一致性
4. 调用 `adapter.handleCallback()`
5. callback 本身只推进 run
6. 真正业务写库仍走 `finalizeGeneratedRun()` 或 `finalizePlannerRun()`

这部分与旧文档中的方向一致，但实现方式是“API 直接处理 + lifecycle 收口”，不是事件总线。

## 9. 结果回写规则（按当前实现）

### 9.1 Planner 文档类

`PLANNER_DOC_UPDATE` 完成后：

1. `finalizePlannerConversation()` 解析模型输出
2. 写入 `planner_outline_versions` 或 `planner_refinement_versions`
3. 写入 `planner_messages`
4. refinement 阶段进一步同步：
   - `planner_subjects`
   - `planner_scenes`
   - `planner_shot_scripts`

### 9.2 Planner 图片草稿类

Planner 主体 / 场景 / 分镜图片生成完成后：

1. 创建 `Asset`
2. 回写对应 planner 实体的 `generatedAssetIdsJson`
3. 同步回 `RefinementDoc`

### 9.3 Creation 图片 / 视频类

Shot 生成完成后：

1. 创建 `Asset`
2. 创建 `ShotVersion`
3. 必要时更新 `Shot.activeVersionId`

### 9.4 Publish 类

当前 `PUBLISH` 在业务上已支持提交，但不是一个复杂异步 provider 链路。

## 10. 当前实现与旧文档的主要偏差

### 10.1 旧文档高估了事件化程度

旧文档中写了：

1. 通用任务消息协议
2. 通用事件回传协议
3. Recipe 根任务拆分协议

当前真实实现中，这些并未形成正式运行时接口。

### 10.2 旧文档高估了审计能力

旧文档要求：

1. request snapshot
2. response snapshot
3. provider latency
4. provider request id
5. provider raw status

当前真实实现只部分记录在 `Run` 中，还没有独立审计表。

## 11. 当前最佳实践评价

### 11.1 优点

1. 已有统一 `Run` 账本
2. 已有统一 provider adapter 层
3. submit / poll / callback 责任边界基本成立
4. 业务回写统一通过 lifecycle 服务收口

### 11.2 不足

1. 没有独立外部调用日志表
2. 没有事件总线，不适合高并发扩展场景
3. `apps/api/src/worker.ts` 仍然过轻，尚未演化为独立 worker 应用边界
4. Provider adapter 与 provider client 仍然属于“半模块化”状态

## 12. 下一阶段重构建议

在不考虑兼容老数据和老业务的前提下，建议：

1. 保留 `Run` 作为业务账本
2. 新增 `external_api_call_logs` 作为外部调用审计账本
3. 将 provider 调用全部收拢到统一 capability 层
4. 将 `apps/api/src/worker.ts` 演进为独立 worker 应用或独立执行进程边界
5. 如后续确有需要，再引入 Redis / queue / event bus，而不是继续在文档中提前假定其已存在
