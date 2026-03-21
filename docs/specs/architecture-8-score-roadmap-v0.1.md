# 架构 8 分收口路线图（v0.1）

版本：v0.1  
日期：2026-03-21  
状态：已执行并完成收口

---

## 1. 文档目标

> 执行口径说明：
> - 本文是当前唯一用于指导本轮重构执行顺序的计划文档。
> - 其他 `refactor-*`、`planner-structural-*` 文档若与本文冲突，以本文为准。
> - 旧计划文档仅保留为历史记录，不再作为当前执行依据。

本文不讨论“如何把结构做得更漂亮”，只讨论一件事：

**在当前代码基础上，如何用最小但关键的工程动作，把 AIV Studio 从约 6.8/10 收口到可稳定评为 8/10。**

这里的“8 分”定义不是：

1. 文件都变小
2. 目录都更规整
3. facade 更多

而是以下五项同时成立：

1. 主链路运行时风险已明显下降
2. 前端 Planner 热点具备稳定类型边界
3. API 层业务错误语义统一
4. Run / worker 异步链路有可验证的可靠性护栏
5. Planner / Creation 核心链路具备集成级回归保障

如果只做目录重组和 facade 化，而不补这五项，项目最多到 7.x，不足以称为 8 分。

---

## 1.1 当前执行状态（2026-03-21）

本路线图对应的执行项已完成，当前不再是“待实施计划”，而是“收口完成后的执行记录”。

已落地结果：

1. Planner 页面运行时已移除 `@aiv/mock-data` 决策依赖，默认态收口到 [planner-defaults.ts](/Users/jiankunwu/project/aiv/apps/web/src/features/planner/lib/planner-defaults.ts)。
2. [planner-page-state-slices.ts](/Users/jiankunwu/project/aiv/apps/web/src/features/planner/hooks/planner-page-state-slices.ts) 已完成核心切片类型收口，并由 [planner-page-state-slices.test.ts](/Users/jiankunwu/project/aiv/apps/web/src/features/planner/hooks/planner-page-state-slices.test.ts) 覆盖。
3. API 已引入统一错误模型 [app-error.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/app-error.ts)，并接入 [server.ts](/Users/jiankunwu/project/aiv/apps/api/src/server.ts)、[workspaces.ts](/Users/jiankunwu/project/aiv/apps/api/src/routes/workspaces.ts)、[planner-commands.ts](/Users/jiankunwu/project/aiv/apps/api/src/routes/planner-commands.ts)、[creation-commands.ts](/Users/jiankunwu/project/aiv/apps/api/src/routes/creation-commands.ts)。
4. `run-lifecycle` 已拆成薄协调入口 [run-lifecycle.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/run-lifecycle.ts) 与生成终态处理 [run-generated-finalizer.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/run-generated-finalizer.ts)。
5. provider completion output 已统一补 `downloadUrl`，落在 [shared.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/provider/adapters/shared.ts)。
6. Web 侧纯代理 BFF route 已收口为 catch-all：[route.ts](/Users/jiankunwu/project/aiv/apps/web/src/app/api/[[...path]]/route.ts) + [api-route-proxy.ts](/Users/jiankunwu/project/aiv/apps/web/src/lib/api-route-proxy.ts)。
7. Fastify 注册已按域分组，落在 [register-domain-routes.ts](/Users/jiankunwu/project/aiv/apps/api/src/routes/register-domain-routes.ts)。
8. Prisma schema 中休眠的 `GenerationRecipe` / `RecipeExecution` / `RECIPE_EXECUTION` 已移除，见 [schema.prisma](/Users/jiankunwu/project/aiv/apps/api/prisma/schema.prisma)。
9. Planner 与 Creation 主链路 smoke 已收口到 [smoke-planner-api-refactor.ts](/Users/jiankunwu/project/aiv/apps/api/scripts/smoke-planner-api-refactor.ts) 和 [planner-regression-gate-2026-03-18.md](/Users/jiankunwu/project/aiv/docs/reviews/planner-regression-gate-2026-03-18.md)。

worker 并发语义说明：

1. `RUNNING + providerJobId + nextPollAt <= now` 的 pollable run 优先于所有 `QUEUED` run，逻辑在 [run-worker.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/run-worker.ts)。
2. `QUEUED` run 通过 `updateMany({ id, status: 'QUEUED' })` 做条件抢占；抢占失败直接返回 `null`，避免双 worker 同时 claim。
3. provider callback 路由对终态 run 会直接短路返回，不会重复 finalize；逻辑在 [provider-callbacks.ts](/Users/jiankunwu/project/aiv/apps/api/src/routes/provider-callbacks.ts)。
4. `run-lifecycle` 当前的风险护栏不是“严格幂等重入”，而是“终态短路 + 资产 ID 列表去重/截断 + focused tests”；这一点已由 [run-lifecycle.test.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/run-lifecycle.test.ts) 覆盖。

当前关键回归口径：

1. `pnpm --filter @aiv/api test:unit`
2. `pnpm --filter @aiv/api exec tsc --noEmit`
3. `pnpm test:planner:api-smoke`
4. `pnpm test:planner:gate`

本命令在本轮收口中已实际验证通过：

1. `pnpm --filter @aiv/api test:unit`：通过，`255` 项测试全部通过。
2. `pnpm --filter @aiv/api exec tsc --noEmit`：通过。
3. `pnpm test:planner:api-smoke`：通过，新增 creation video callback 闭环验证已纳入。
4. `pnpm --filter @aiv/web test:unit`：此前已通过。
5. `pnpm typecheck`：此前已通过。

错误模型阶段性里程碑状态：

1. `M1` 已完成：仓库级 AI 执行硬约束已固化到 [AGENTS.md](/Users/jiankunwu/project/aiv/AGENTS.md) 和 [CLAUDE.md](/Users/jiankunwu/project/aiv/CLAUDE.md)。
2. `M2` 已完成：高频 route 已统一到共享错误模型，覆盖 [workspaces.ts](/Users/jiankunwu/project/aiv/apps/api/src/routes/workspaces.ts)、[planner-commands.ts](/Users/jiankunwu/project/aiv/apps/api/src/routes/planner-commands.ts)、[creation-commands.ts](/Users/jiankunwu/project/aiv/apps/api/src/routes/creation-commands.ts)、[runs.ts](/Users/jiankunwu/project/aiv/apps/api/src/routes/runs.ts)、[provider-callbacks.ts](/Users/jiankunwu/project/aiv/apps/api/src/routes/provider-callbacks.ts)、[auth.ts](/Users/jiankunwu/project/aiv/apps/api/src/routes/auth.ts)、[model-registry.ts](/Users/jiankunwu/project/aiv/apps/api/src/routes/model-registry.ts)、[provider-configs.ts](/Users/jiankunwu/project/aiv/apps/api/src/routes/provider-configs.ts)、[assets.ts](/Users/jiankunwu/project/aiv/apps/api/src/routes/assets.ts)、[studio-projects.ts](/Users/jiankunwu/project/aiv/apps/api/src/routes/studio-projects.ts)、[publish-commands.ts](/Users/jiankunwu/project/aiv/apps/api/src/routes/publish-commands.ts)。
3. `M3` 已完成：上述变更已通过 `tsc`、`test:unit`、`test:planner:api-smoke` 验证。

N1 / N2 阶段性完成状态：

1. `N1` 已完成：高频 route focused tests 已补齐，覆盖 [auth.test.ts](/Users/jiankunwu/project/aiv/apps/api/src/routes/auth.test.ts)、[runs.test.ts](/Users/jiankunwu/project/aiv/apps/api/src/routes/runs.test.ts)、[provider-callbacks.test.ts](/Users/jiankunwu/project/aiv/apps/api/src/routes/provider-callbacks.test.ts)、[assets.test.ts](/Users/jiankunwu/project/aiv/apps/api/src/routes/assets.test.ts)、[studio-projects.test.ts](/Users/jiankunwu/project/aiv/apps/api/src/routes/studio-projects.test.ts)、[publish-commands.test.ts](/Users/jiankunwu/project/aiv/apps/api/src/routes/publish-commands.test.ts)。
2. `N2` 已完成：worker / callback / finalize 的最小结构化观测已落地，核心入口分别在 [run-observability.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/run-observability.ts)、[worker.ts](/Users/jiankunwu/project/aiv/apps/api/src/worker.ts)、[provider-callbacks.ts](/Users/jiankunwu/project/aiv/apps/api/src/routes/provider-callbacks.ts)、[run-lifecycle.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/run-lifecycle.ts)，并由 [run-observability.test.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/run-observability.test.ts) 覆盖。

Phase D 当前完成状态：

1. 已新增独立 integration 套件入口：`pnpm --filter @aiv/api test:integration`。
2. 已落地的主链路 integration 覆盖：
   - [creation-video-callback.integration.test.ts](/Users/jiankunwu/project/aiv/apps/api/src/integration/creation-video-callback.integration.test.ts)：覆盖 creation video callback 成功闭环、duplicate callback 幂等、failed callback 不产生脏 asset/version。
   - [planner-outline-refinement.integration.test.ts](/Users/jiankunwu/project/aiv/apps/api/src/integration/planner-outline-refinement.integration.test.ts)：覆盖 outline queue -> finalize -> confirm -> refinement queue -> finalize -> workspace stage/refinement 可见。
   - [run-worker-claim-race.integration.test.ts](/Users/jiankunwu/project/aiv/apps/api/src/integration/run-worker-claim-race.integration.test.ts)：覆盖同一 queued run 的 worker claim race，确保只有一个 worker 抢占成功。
   - [run-callback-poll-race.integration.test.ts](/Users/jiankunwu/project/aiv/apps/api/src/integration/run-callback-poll-race.integration.test.ts)：覆盖 callback completed 后 stale worker poll 不会重复 finalize。
   - [planner-asset-finalization.integration.test.ts](/Users/jiankunwu/project/aiv/apps/api/src/integration/planner-asset-finalization.integration.test.ts)：覆盖 planner subject image generation -> asset 落库 -> planner workspace `generatedAssets` 可见。
3. 本轮已实际验证通过：
   - `pnpm --filter @aiv/api exec tsc --noEmit`
   - `pnpm --filter @aiv/api test:unit`
   - `pnpm --filter @aiv/api test:integration`
   - `pnpm test:planner:api-smoke`
4. 基于当前路线图定义，Phase D 所要求的“核心链路集成测试 + 异步链路强验证”已完成首轮收口，可以从“剩余阻塞项”降级为“后续持续扩充项”。

---

## 2. 当前分数卡在哪

以下第 2 节到第 9 节保留为“执行前阻塞项与实施计划基线”，用于说明为什么这轮收口要做这些动作；当前实时状态以上面的“1.1 当前执行状态”为准。

结合当前代码，本项目距离 8 分的主要阻塞项不是“分层理念错误”，而是以下四类问题：

### 2.1 前端 Planner 仍有运行时与类型双重债

当前事实：

1. [use-planner-page-state.ts](/Users/jiankunwu/project/aiv/apps/web/src/features/planner/hooks/use-planner-page-state.ts) 仍是 652 行页面总装配器
2. 运行时仍直接依赖 `@aiv/mock-data` 的 `sekoPlanData` 与 `sekoPlanThreadData`
3. [planner-page-state-slices.ts](/Users/jiankunwu/project/aiv/apps/web/src/features/planner/hooks/planner-page-state-slices.ts) 已做结构切片，但 `any` 仍大量存在

这意味着：

1. 结构已经比原来好
2. 但可维护性仍靠“人脑记忆”，不是靠稳定类型与状态边界

### 2.2 API 错误模型尚未统一

当前事实：

1. [server.ts](/Users/jiankunwu/project/aiv/apps/api/src/server.ts) 只有全局 500 handler
2. 各 route 自行返回 400/401/404/409
3. `run-lifecycle.ts`、provider adapters、planner service 已经有很多 `errorCode`，但没有统一错误抽象

这意味着：

1. 系统已经有“错误码素材”
2. 但没有统一翻译层和可复用抛错语义

### 2.3 Run / worker 可靠性不足

当前事实：

1. [worker.ts](/Users/jiankunwu/project/aiv/apps/api/src/worker.ts) 仍是 `while (true)` 轮询
2. [run-worker.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/run-worker.ts) 通过数据库 claim `QUEUED` / pollable run
3. [run-lifecycle.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/run-lifecycle.ts) 同时承担 run 状态推进、asset 落库、planner finalize、projection sync

这意味着：

1. 异步主链路已可工作
2. 但它的可靠性主要靠代码自觉，而不是靠专门的边界设计和测试护栏

### 2.4 集成测试缺口仍在

当前事实：

1. 单元测试数量很多
2. 但 Planner outline -> refinement、stream/workspace 协同、Creation run 生命周期等关键路径尚未形成明确的集成保障基线

这意味着：

1. 局部逻辑回归能发现
2. 跨模块链路回归仍可能漏出

---

## 3. 8 分目标态定义

达到 8 分时，项目应满足：

### 3.1 前端

1. Planner 页面保留 page-level orchestration，但不再依赖 mock 数据参与运行时决策
2. `planner-page-state-slices.ts` 不再以 `any` 作为主要切片契约
3. 页面编排、展示切片、请求副作用三层边界稳定

### 3.2 后端

1. route 只负责认证、校验、调用 service、映射响应
2. service 层可抛统一业务错误
3. `run-lifecycle.ts` 不再承担过多跨子域副作用拼装

### 3.3 异步链路

1. worker 调度边界具备明确并发语义说明
2. run finalization 关键分支具备 focused integration tests
3. provider output -> asset persistence -> workspace 可见性形成可验证闭环

### 3.4 工程护栏

1. 有最小业务错误码规范
2. 有最小主链路集成测试矩阵
3. 文档与代码现状一致，不再把“结构变好”误写成“系统已经达到不符合现实的高分”

---

## 4. 修订后的实施范围

要到 8 分，必须做的不是五花八门的大重构，而是四个主题包：

1. Planner 前端状态与类型收口
2. API 统一错误模型
3. Run / worker 主链路收口
4. 核心链路集成测试

同时纳入三个必要的结构收口项：

5. Web BFF 层审计与纯代理 route 收缩
6. `server.ts` 路由命名空间分组
7. schema 休眠模型清理

低优先级项：

1. 更大规模目录迁移
2. facade 数量继续增加
3. 进一步拆 page shell
4. 统一所有 route 风格到同一模板

这些动作可以做，但不是 8 分的必要条件。

---

## 5. 修订后的阶段计划

## Phase A：清除运行时假数据与前端类型空洞

目标：

1. 让 Planner 页面不再依赖 mock 参与运行时决策
2. 让已存在的页面切片真正成为类型边界，而不是结构占位

执行项：

1. 移除 [use-planner-page-state.ts](/Users/jiankunwu/project/aiv/apps/web/src/features/planner/hooks/use-planner-page-state.ts) 中对 `sekoPlanData` / `sekoPlanThreadData` 的运行时依赖
2. 为 Planner page slices 引入真实类型：
   - `runtimeActiveOutline`
   - `runtimeActiveRefinement`
   - `plannerDoc`
   - `displaySubjectCards`
   - `displaySceneCards`
   - `displayScriptActs`
   - `editingShot`
   - `shotDraft`
3. 把 `planner-page-state-slices.ts` 中的 `any` 降到可控范围
4. 保持 `planner-page.tsx` 作为薄壳，不再回流逻辑

完成定义：

1. Planner 页面运行时不再从 mock fixture 推导 stepCount / plannerDoc / prompt
2. `planner-page-state-slices.ts` 中不再存在成片 `any` 契约
3. 相关页面和现有单测通过

验证：

1. `pnpm typecheck`
2. `pnpm build`
3. `pnpm --filter @aiv/web test:unit`
4. Planner 页面手动 smoke

## Phase B：建立统一业务错误模型

目标：

1. 让 API 错误处理从“各处手写返回”升级为“统一语义 + 统一映射”

执行项：

1. 新建最小 `AppError` 抽象：
   - `code`
   - `httpStatus`
   - `message`
   - `details?`
2. 为常见错误建立工厂或子类：
   - `NotFoundError`
   - `UnauthorizedError`
   - `ConflictError`
   - `InvalidArgumentError`
   - `ConfigurationError`
3. route 层改为：
   - 认证失败返回统一错误
   - service 抛业务错误
   - 全局 error handler 做最终映射
4. 优先落地在以下热点：
   - Planner workspace / planner commands
   - creation commands
   - provider configs / model registry
   - assets / runs

完成定义：

1. 至少一条主链路已不再手写重复错误结构
2. 前端能稳定消费 `code + message + status`
3. 500 handler 仅负责未知错误

验证：

1. `pnpm typecheck:api`
2. `pnpm --filter @aiv/api test:unit`
3. 补充 error mapping focused tests

## Phase C：收口 Run / worker 主链路

目标：

1. 让异步执行链路具备明确边界，而不是继续把复杂度堆进 `run-lifecycle.ts`

执行项：

1. 将 [run-lifecycle.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/run-lifecycle.ts) 拆成至少三块：
   - run terminal transitions
   - generated asset persistence
   - planner/shot completion handlers
2. 明确 provider output contract：
   - 尽量减少 `findStringDeep(...)` 兜底式解析的职责外溢
   - 在 adapter/gateway 边界尽早归一下载地址字段
3. 为 worker claim 逻辑补并发语义说明与测试
4. 保留当前数据库轮询实现，但补足：
   - claim 行为测试
   - pollable / queued 优先级测试
   - finalize idempotency 风险说明

说明：

本阶段**不强制**上 Redis / BullMQ / pg-boss。  
8 分目标要求的是“关键链路可靠且可解释”，不是“必须引入新基础设施”。

完成定义：

1. `run-lifecycle.ts` 不再是明显的跨域上帝文件
2. worker 轮询模式的边界有测试和文档说明
3. asset persistence 和 planner/shot finalize 可分别验证

验证：

1. `pnpm typecheck:api`
2. `pnpm --filter @aiv/api test:unit`
3. focused run lifecycle tests

## Phase D：补核心链路集成测试

目标：

1. 用少量高价值测试，把“能工作”升级为“能回归验证”

最低测试矩阵：

1. Planner outline -> refinement 闭环
2. Planner stream snapshot 与 workspace 刷新协同
3. Planner image generation -> asset 落库 -> workspace 可见
4. Creation image/video run -> shotVersion / asset / run status 闭环
5. provider callback / polling 终态闭环

优先实现方式：

1. API 集成测试优先
2. Web 端只补必要的 bootstrap / contract tests
3. 不强求先上完整 E2E 浏览器测试

完成定义：

1. 上述 5 条链路全部已有自动化证据
2. 回归门槛可以通过统一 smoke 命令重复运行

验证：

1. `pnpm --filter @aiv/api test:unit`
2. `pnpm --filter @aiv/web test:unit`
3. 新增集成测试命令或 smoke script

当前覆盖证据：

1. Planner outline -> refinement：由 [outline-version-service.test.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/planner/orchestration/outline-version-service.test.ts) 覆盖确认大纲进入 refinement 的核心转移。
2. Planner stream snapshot + workspace refresh：由 [smoke-planner-api-refactor.ts](/Users/jiankunwu/project/aiv/apps/api/scripts/smoke-planner-api-refactor.ts) 覆盖 `generate-doc -> stream -> workspace`。
3. Planner image generation -> asset persistence -> workspace visibility：由 [smoke-planner-api-refactor.ts](/Users/jiankunwu/project/aiv/apps/api/scripts/smoke-planner-api-refactor.ts) 覆盖 `planner shot generate-image -> finalize -> workspace refresh`。
4. Creation image/video run -> shotVersion / asset / run status：由 [smoke-planner-api-refactor.ts](/Users/jiankunwu/project/aiv/apps/api/scripts/smoke-planner-api-refactor.ts) 覆盖 `generate-video -> callback completion -> run/workspace assertions`。
5. provider callback / polling terminal completion：由 [smoke-planner-api-refactor.ts](/Users/jiankunwu/project/aiv/apps/api/scripts/smoke-planner-api-refactor.ts) 和 [provider-adapters.test.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/provider-adapters.test.ts) 共同覆盖。

---

## 6. 不建议作为 8 分前置条件的动作

以下动作可以做，但不应阻塞 8 分目标：

1. 把所有 route 全部改成统一风格
2. 把所有 feature 都继续拆成更多 facade
3. 引入新的全局状态库作为前置条件
4. 直接引入队列中间件替换现有 worker
5. 再做一轮“大而全目录重排”
6. 把 `provider-gateway.ts` 完全删除

特别说明：

当前 [provider-gateway.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/provider-gateway.ts) 已经是对 [provider/registry.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/provider/registry.ts) 的同步业务入口封装。  
对 8 分目标来说，更合理的做法是：

1. 保持 gateway 为同步业务统一入口
2. 保持 adapters 为 Run 场景入口
3. 收紧它们之间的 contract

而不是重新做一轮 provider 层大重构。

---

## 7. 评分提升映射

如果本路线图完成，分数应大致变化为：

| 维度 | 当前估计 | 目标 | 提升来源 |
|---|---:|---:|---|
| 后端分层设计 | 7.5 | 8.0 | `run-lifecycle` 拆解、route/service/error seam 更清楚 |
| 前端状态管理 | 5.5 | 7.0 | 去 mock runtime、切片真实类型化、页面边界稳定 |
| 数据模型设计 | 7.0 | 7.3 | 不强求大改 schema，但提升状态表达与契约一致性 |
| Provider 抽象 | 7.5 | 7.8 | contract 收紧、同步入口与 Run 入口职责更清楚 |
| 工程健壮性 | 5.5 | 7.5 | 错误模型、run/worker 护栏、集成测试补齐 |
| 可维护性 | 6.8 | 8.0 | 热点收口后新增功能不再持续堆向同一文件 |
| 综合 | 6.8 | 8.0 | 结构、运行时、测试三方面同时提升 |

说明：

1. 8 分不是来自“目录更整齐”
2. 8 分来自“热点风险下降 + 类型边界稳定 + 主链路可回归”

---

## 8. 建议实施顺序

按 ROI 建议顺序：

1. Phase A：清 mock + Planner slices 类型化
2. Phase B：统一业务错误模型
3. Phase D：补关键链路集成测试中的 Planner 主链路
4. Phase C：拆 `run-lifecycle` 并补 worker 边界测试
5. 再补剩余 Creation / provider callback 集成测试

原因：

1. A 和 B 成本相对低，回报高
2. D 应尽早开始，否则 C 的重构仍缺少护栏
3. C 是必要项，但最好在已有最小回归保护后推进

---

## 9. 可执行任务拆解

以下任务已全部完成，保留该列表仅作为执行记录。

本节把四个主题包细化到可直接进入 `todo.list` 的粒度。执行时不再按“抽象阶段名”推进，而按以下任务序列推进。

### P0：必须先做，直接决定成熟度下限

#### P0-A 清除 Planner 运行时 mock 参与

目标文件：

- [use-planner-page-state.ts](/Users/jiankunwu/project/aiv/apps/web/src/features/planner/hooks/use-planner-page-state.ts)
- [planner-page-state-slices.ts](/Users/jiankunwu/project/aiv/apps/web/src/features/planner/hooks/planner-page-state-slices.ts)
- Planner 相关 presenter / helper / bootstrap 文件

任务：

1. 找出 `sekoPlanData`、`sekoPlanThreadData` 在 Planner 页面中的所有运行时用途
2. 区分“开发展示 fallback”与“真实运行时决策”
3. 用 runtime workspace / structured doc / explicit empty state 替代 mock 驱动
4. 删除运行时 `stepCount` 对 fixture 的依赖
5. 删除提交完成后消息回写逻辑中对 fixture prompt 的依赖
6. 保留 mock 数据仅用于测试或显式 demo 场景

完成标准：

1. Planner 页面主链路不再 import `@aiv/mock-data`
2. 页面在无 runtime workspace、仅有 bootstrap 数据时仍能稳定渲染
3. 不因为移除 fixture 造成空状态崩溃

#### P0-B 收口 Planner page slices 的真实类型

目标文件：

- [planner-page-state-slices.ts](/Users/jiankunwu/project/aiv/apps/web/src/features/planner/hooks/planner-page-state-slices.ts)
- [use-planner-page-state.ts](/Users/jiankunwu/project/aiv/apps/web/src/features/planner/hooks/use-planner-page-state.ts)
- 相关 planner lib 类型文件

任务：

1. 为 `PlannerThreadState` 去掉 `runtimeActiveOutline` / `runtimeActiveRefinement` / `refinementDetailSteps` / `activeVersion` 的 `any`
2. 为 `PlannerDocumentState` 去掉 `plannerDoc` / `displaySubjectCards` / `displaySceneCards` / `displayScriptActs` / `editingShot` / `shotDraft` 的 `any`
3. 为 `PlannerDialogState` 去掉 `activeSubjectCard` / `subjectAssetThumbs` / `activeSceneCard` / `sceneAssetThumbs` / `shotDeleteDialog` / `deletingShot` 的 `any`
4. 如果某些类型还不存在，先在 Planner feature 内定义局部 page-model 类型
5. 只有在真实无法立刻确定时，才允许保留极少量过渡类型

完成标准：

1. `planner-page-state-slices.ts` 不再存在成片 `any`
2. 切片 builder 的输入输出能被 TS 正确约束
3. `planner-page-state-slices.test.ts` 补充类型相关覆盖

#### P0-C 建立最小统一错误模型

目标文件：

- [server.ts](/Users/jiankunwu/project/aiv/apps/api/src/server.ts)
- [routes/workspaces.ts](/Users/jiankunwu/project/aiv/apps/api/src/routes/workspaces.ts)
- [routes/planner-commands.ts](/Users/jiankunwu/project/aiv/apps/api/src/routes/planner-commands.ts)
- [routes/creation-commands.ts](/Users/jiankunwu/project/aiv/apps/api/src/routes/creation-commands.ts)
- [routes/model-registry.ts](/Users/jiankunwu/project/aiv/apps/api/src/routes/model-registry.ts)
- [routes/provider-configs.ts](/Users/jiankunwu/project/aiv/apps/api/src/routes/provider-configs.ts)
- 新增 `lib/errors.ts` 或等价文件

任务：

1. 新增 `AppError`、`InvalidArgumentError`、`UnauthorizedError`、`NotFoundError`、`ConflictError`、`ConfigurationError`
2. 新增 `toErrorResponse` 或等价映射函数
3. 让全局 error handler 能识别业务错误并返回对应 HTTP 状态码
4. 优先把 workspace / planner commands / creation commands 三条链路改成统一抛错与统一返回
5. 清理这些热点 route 中重复出现的手写错误 envelope

完成标准：

1. 至少三条核心 route 已统一错误模型
2. 未知异常仍走 500 兜底
3. 前端可稳定消费 `status + code + message`

### P1：紧接着做，直接决定后端主链路是否真正稳住

#### P1-A 拆解 `run-lifecycle.ts`

目标文件：

- [run-lifecycle.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/run-lifecycle.ts)
- 新增 `run-finalize-generated-asset.ts`、`run-finalize-planner.ts`、`run-terminal-transition.ts` 或等价文件

任务：

1. 拆出 run fail / terminal state transition
2. 拆出 generated asset persistence
3. 拆出 planner finalize handler
4. 拆出 shot finalize handler
5. 保持现有对外 API 不变，先做内部拆分

完成标准：

1. `run-lifecycle.ts` 退化为 facade 或 orchestration entry
2. asset 落库逻辑可独立测试
3. planner/shot finalize 逻辑可独立测试

#### P1-B 收紧 provider output contract

目标文件：

- [run-lifecycle.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/run-lifecycle.ts)
- [run-worker.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/run-worker.ts)
- [provider/adapters/ark.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/provider/adapters/ark.ts)
- [provider/adapters/platou.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/provider/adapters/platou.ts)
- [provider/adapters/shared.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/provider/adapters/shared.ts)

任务：

1. 明确 adapter 完成态里资源下载地址的统一字段
2. 尽量把 `findStringDeep(...)` 的多字段兜底解析前移到 adapter 层
3. 让 finalizer 尽量依赖统一 contract，而不是 providerData 猜测

完成标准：

1. `resolveProviderSourceUrl()` 复杂度下降，或职责被替代
2. adapter 层对 completed output 的 contract 更明确

#### P1-C 明确 worker claim / poll / finalize 边界

目标文件：

- [worker.ts](/Users/jiankunwu/project/aiv/apps/api/src/worker.ts)
- [run-worker.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/run-worker.ts)
- [run-worker.test.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/run-worker.test.ts)

任务：

1. 补 worker 轮询模式的并发语义说明
2. 补 claim queued run 的竞争场景测试
3. 补 pollable run 优先级测试
4. 补 finalize 重入 / 幂等性风险测试或文档说明

完成标准：

1. 多 worker 并行时的期望行为可说明
2. 主分支行为有 focused tests

#### P1-D 审计 Web BFF 层并收缩纯代理 route

目标文件：

- `apps/web/src/app/api/**/route.ts`
- [apps/web/src/lib/aiv-api.ts](/Users/jiankunwu/project/aiv/apps/web/src/lib/aiv-api.ts)
- `apps/web/src/features/*/*.server.ts`

任务：

1. 盘点所有使用 `proxyAivApiRoute(...)` 的 route handler
2. 将 route 分成三类：
   - 必须保留的 BFF：承担 cookie / SSR / 聚合 / 前端协议适配
   - 可合并的薄代理
   - 应删除并改由前端直连后端 API 的纯代理
3. 对 planner / creation / publish / settings / auth 等 route 给出保留或删除理由
4. 先删除或合并收益最高、风险最低的一批纯代理 route
5. 为保留项记录明确的 BFF 价值边界

完成标准：

1. BFF route 有明确分类清单
2. 至少完成第一批纯代理 route 的删除或合并
3. `apps/web/src/app/api` 的存在边界可解释，而不是默认全部保留

### P2：必须完成，决定 8 分有没有真正站住

#### P2-A Planner 主链路集成测试

目标文件：

- 新增 planner integration test 或 smoke script
- [planner/workspace-service.test.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/planner/workspace-service.test.ts)
- [planner/stream/snapshot-service.test.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/planner/stream/snapshot-service.test.ts)
- [run-lifecycle.test.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/run-lifecycle.test.ts)

任务：

1. 覆盖 outline -> refinement 闭环
2. 覆盖 stream snapshot 与 workspace refresh 协同
3. 覆盖 planner image generation -> asset 落库 -> workspace 可见

完成标准：

1. 三条 Planner 主链路自动化可回归

#### P2-B Creation / provider callback 集成测试

目标文件：

- [creation-commands.ts](/Users/jiankunwu/project/aiv/apps/api/src/routes/creation-commands.ts)
- [provider-callbacks.ts](/Users/jiankunwu/project/aiv/apps/api/src/routes/provider-callbacks.ts)
- [run-lifecycle.test.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/run-lifecycle.test.ts)
- [run-worker.test.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/run-worker.test.ts)

任务：

1. 覆盖 Creation image/video run -> shotVersion / asset / run status 闭环
2. 覆盖 provider callback / polling 终态闭环

完成标准：

1. 至少两条 Creation / provider 异步链路自动化可回归

#### P2-C 文档与待办收口

目标文件：

- [todo.list](/Users/jiankunwu/project/aiv/todo.list)
- [docs/reviews/aiv-studio-architecture-review.md](/Users/jiankunwu/project/aiv/docs/reviews/aiv-studio-architecture-review.md)
- [docs/specs/README.md](/Users/jiankunwu/project/aiv/docs/specs/README.md)

任务：

1. 每完成一个主题包同步更新状态
2. 不再留下并行冲突计划
3. 最终状态只以当前代码现实为准

完成标准：

1. `todo.list` 与实际进度一致
2. 评审和路线图文档不再冲突

#### P2-D `server.ts` 路由命名空间分组

目标文件：

- [server.ts](/Users/jiankunwu/project/aiv/apps/api/src/server.ts)
- `apps/api/src/routes/*.ts`

任务：

1. 为 planner / creation / publish / explore / auth / provider / workspace 等路由建立明确分组注册策略
2. 优先将 planner / creation / publish 三组形成清晰命名空间边界
3. 评估采用 `app.register(group, { prefix })` 或等价注册模块的方式
4. 重构时保持现有对外 API 路径不变

完成标准：

1. `server.ts` 的注册结构按子域可读
2. 命名空间边界不再只依赖各 route 文件内部硬编码
3. 对外路由路径保持兼容

#### P2-E schema 休眠模型清理

目标文件：

- [apps/api/prisma/schema.prisma](/Users/jiankunwu/project/aiv/apps/api/prisma/schema.prisma)
- 涉及 `GenerationRecipe` / `RecipeExecution` / `RECIPE_EXECUTION` 的代码与文档

任务：

1. 先确认 `GenerationRecipe` / `RecipeExecution` / `RECIPE_EXECUTION` 在当前运行路径中确实未使用
2. 若确认休眠：
   - 从 schema 中移除模型与枚举项
   - 清理 relation 与文档残留
3. 若短期不删：
   - 明确降级为 future extension
   - 不再出现在当前主路径描述中

完成标准：

1. schema 不再保留无主路径使用的噪音模型，或其降级状态被明确定义
2. Prisma schema、代码现实与文档一致

---

## 10. 执行约束

本轮执行必须满足以下约束：

1. 不并行推进两个以上主题包。
2. 每个阶段必须先有验证结果，再进入下一阶段。
3. 不再把 facade 化、目录迁移、页面切片拆分本身当作阶段成果。
4. 若某项改动不能直接提升主链路成熟度，默认延后。
5. 若文档与代码发生偏差，先修文档或停手，不继续按旧口径推进。

阶段完成判定以“代码 + 测试 + 运行时验证”三者同时成立为准。

---

## 11. 最终结论

要把 AIV Studio 拉到 8 分，不能只继续做“结构重构”，必须补齐：

1. Planner 前端真实类型边界
2. API 统一错误模型
3. Run / worker 主链路边界治理
4. 核心链路集成测试

如果只做 facade 化、目录迁移和 page shell 收口，项目会更整洁，但仍停留在 7.x。  
只有当“结构、运行时、测试”三方面同时收口，8 分才成立。
