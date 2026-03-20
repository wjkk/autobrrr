# 后端系统设计稿（v0.3）

版本：v0.3  
日期：2026-03-20  
状态：按 2026-03-20 当前代码复核后的现行实现说明

## 1. 文档目的

本文用于描述当前 `apps/api` 后端的真实实现形态，而不是目标态蓝图。

本文覆盖：

1. 运行时组件
2. 领域边界
3. 真实执行链路
4. AI 调用现状
5. 当前架构问题与下一步演进方向

若与代码冲突，以代码为准：

1. `/Users/jiankunwu/project/aiv/apps/api/prisma/schema.prisma`
2. `/Users/jiankunwu/project/aiv/apps/api/src/routes/*.ts`
3. `/Users/jiankunwu/project/aiv/apps/api/src/lib/*.ts`

## 2. 当前运行时形态

### 2.1 实际组件

当前真实组件为：

1. `apps/web`
2. `apps/api`
3. `apps/api/src/worker.ts`
4. `MySQL`

当前**没有形成正式运行时基线**的组件：

1. 独立 `apps/worker`
2. `Redis` 任务队列
3. 独立 `Object Storage` 抽象层
4. 独立 `event bus`

### 2.2 当前执行模式

当前执行采用：

1. API 写入 `runs`
2. worker 轮询 `runs`
3. provider adapter 调用外部模型
4. provider callback / polling 更新 `runs`
5. 由统一 lifecycle 服务完成业务回写

关键代码：

1. `/Users/jiankunwu/project/aiv/apps/api/src/lib/run-worker.ts`
2. `/Users/jiankunwu/project/aiv/apps/api/src/lib/provider/adapter-resolution.ts`
3. `/Users/jiankunwu/project/aiv/apps/api/src/lib/provider/adapters/*.ts`
4. `/Users/jiankunwu/project/aiv/apps/api/src/lib/provider-adapters.ts`
5. `/Users/jiankunwu/project/aiv/apps/api/src/lib/provider-gateway.ts`
6. `/Users/jiankunwu/project/aiv/apps/api/src/lib/run-lifecycle.ts`
7. `/Users/jiankunwu/project/aiv/apps/api/src/routes/provider-callbacks.ts`

## 3. 领域边界

### 3.1 用户与会话

当前已落地：

1. 用户注册
2. 用户登录
3. 用户登出
4. 当前登录态查询
5. 基于 session cookie 的接口鉴权

关键对象：

1. `User`
2. `UserSession`

### 3.2 项目与剧集

当前项目主线围绕：

1. `Project`
2. `Episode`
3. `ProjectCreationConfig`

其中 `ProjectCreationConfig` 承接首页入口配置快照：

1. 一级类型
2. 二级子类型
3. 剧本文本
4. 主体图模型
5. 主体
6. 画风
7. 额外设置

### 3.3 Planner

当前 Planner 已形成真实双阶段模型：

1. `PlannerSession`
2. `PlannerOutlineVersion`
3. `PlannerRefinementVersion`
4. `PlannerMessage`
5. `PlannerStepAnalysis`
6. `PlannerSubject`
7. `PlannerScene`
8. `PlannerShotScript`
9. `PlannerAgentProfile`
10. `PlannerSubAgentProfile`
11. `PlannerSubAgentProfileRelease`
12. `PlannerDebugRun`

Planner 的真实特点：

1. 大纲与细化版本分离
2. 主流程与调试页分离
3. Agent 配置以数据库表为真相源
4. refinement 阶段允许规划期图片草稿与素材绑定

### 3.4 Creation

当前 Creation 主线围绕：

1. `Shot`
2. `ShotVersion`
3. `Asset`
4. `Run`

真实实现中：

1. `POST /api/creation/projects/:projectId/shots/:shotId/generate-image`
2. `POST /api/creation/projects/:projectId/shots/:shotId/generate-video`

都会创建 `Run`，再由 worker 驱动执行。

### 3.5 模型目录与 Provider 配置

当前模型层已真实落地：

1. `ModelFamily`
2. `ModelProvider`
3. `ModelEndpoint`
4. `UserProviderConfig`

当前支持：

1. 用户级 provider API Key 配置
2. 模型目录查询
3. provider 连通性测试
4. Ark / Platou catalog sync
5. 用户默认模型和启用模型过滤

### 3.6 Dormant / 未进入主路径的对象

以下对象已经存在于 schema，但当前不是主业务路径核心：

1. `GenerationRecipe`
2. `RecipeExecution`

它们更适合视为未来扩展保留，而不是当前系统主架构中心。

## 4. 当前 AI 执行链路

### 4.1 当前分层

当前 AI 调用链路实际上是：

1. route / orchestrator 组装业务输入
2. `model-registry` 解析模型
3. `provider-runtime-config` 解析用户级 provider 配置
4. `provider-gateway.ts` 通过 `provider/registry.ts` 暴露统一 capability 入口
5. `provider/adapter-resolution.ts` 选择 `provider/adapters/*.ts` 中的实际 Run adapter
6. `run-worker` / `provider-callbacks` 推进执行状态

### 4.2 已支持的 provider client

当前已实现：

1. `ark-client.ts`
2. `platou-client.ts`

### 4.3 当前问题

当前 AI 相关代码尚未达到“高度模块化、易插拔、易升级改造”的要求，主要问题：

1. provider 调用主链路已统一经过 gateway，但 `provider-gateway.ts` 与 `provider/registry.ts` 仍存在双层入口，需要继续保持边界清晰
2. route 层在少数 feature 中仍承担较多 orchestration 责任
3. worker 仍与 API 应用共置于 `apps/api`，部署边界仍偏轻
4. dormant 模型仍会干扰部分历史文档阅读

## 5. 当前 Run 机制

`Run` 是当前系统唯一正式执行账本。

已真实承载：

1. planner doc update
2. image generation
3. video generation
4. publish
5. provider polling / callback 追踪

当前 `Run` 已记录：

1. `inputJson`
2. `outputJson`
3. `providerJobId`
4. `providerStatus`
5. `providerCallbackToken`
6. `nextPollAt`
7. `lastPolledAt`
8. `pollAttemptCount`
9. `errorCode`
10. `errorMessage`

### 5.1 当前不足

`Run` 仍不足以替代“外部接口调用日志表”，因为它偏业务账本，不是调用审计账本。

当前 `external_api_call_logs` 已补齐调用级审计，但 `Run` 与调用账本仍是两套不同职责：

1. `Run` 负责业务执行状态与结果
2. `external_api_call_logs` 负责 request / response / trace / provider request id 审计

## 6. 当前架构是否符合最佳实践

### 6.1 符合的部分

1. 数据真相已回到后端数据库
2. 主业务接口基本按 feature 分 route
3. Provider 适配层已形成 `gateway -> registry -> adapters` 主干
4. Planner 已从单文档模型进化到 outline/refinement 双阶段
5. 外部调用日志已落到独立审计表

### 6.2 不足的部分

1. route 层仍承担过多业务编排
2. 少数高频页面与 route 仍需继续瘦身
3. 仍存在部分 dormant 模型干扰文档理解
4. worker 仍在 `apps/api` 内，不利于边界清晰化

## 7. 下一阶段重构方向

在“不考虑兼容老数据和老业务”的前提下，下一阶段建议：

1. 继续保持 provider 层以 `provider-gateway.ts -> provider/registry.ts -> provider/adapters/*.ts` 为唯一主干
2. route 只保留协议转换，业务编排继续下沉到 service / orchestrator
3. 将 `apps/api/src/worker.ts` 演进为独立 worker 应用或独立执行边界
4. 将 dormant 的 `GenerationRecipe / RecipeExecution` 从当前主设计说明中继续降级为未来扩展项

## 8. 当前最准确的系统判断

今天的系统不是“文档里的目标态后端”，而是：

1. 一个已经真实跑通用户、目录、planner、creation、publish 主链路的 MySQL + Prisma + API + worker 系统
2. 一个 AI 层已经形成统一 gateway / registry / adapter 主干，但仍需继续稳固边界的系统
3. 一个后端主链路较健康、下一步重点转向前端与少量后端按需治理的系统
