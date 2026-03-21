# AIV Studio 架构复核评审

## 0. 执行后更新（2026-03-21）

本文主体保留了“整改前基线评审”价值，但其中若干问题已不再是当前实时状态。按当前代码，以下事项已完成收口：

1. Planner 运行时 mock 依赖已移除，默认态收口到 [planner-defaults.ts](/Users/jiankunwu/project/aiv/apps/web/src/features/planner/lib/planner-defaults.ts)。
2. API 已建立统一错误模型 [app-error.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/app-error.ts)，并接入关键 route 与全局 error handler。
3. `run-lifecycle` 已从单文件热点拆出 [run-generated-finalizer.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/run-generated-finalizer.ts)，provider completion output 也已标准化 `downloadUrl`。
4. Web 侧纯代理 route 已收口到 catch-all：[route.ts](/Users/jiankunwu/project/aiv/apps/web/src/app/api/[[...path]]/route.ts)。
5. `server.ts` 域注册已显式分组到 [register-domain-routes.ts](/Users/jiankunwu/project/aiv/apps/api/src/routes/register-domain-routes.ts)。
6. `GenerationRecipe` / `RecipeExecution` / `RECIPE_EXECUTION` 已从 [schema.prisma](/Users/jiankunwu/project/aiv/apps/api/prisma/schema.prisma) 清理。
7. 关键 smoke 覆盖已补齐：
   - Planner outline -> refinement： [outline-version-service.test.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/planner/orchestration/outline-version-service.test.ts)
   - Planner stream/workspace、Planner image finalize、Creation video finalize、provider callback completion： [smoke-planner-api-refactor.ts](/Users/jiankunwu/project/aiv/apps/api/scripts/smoke-planner-api-refactor.ts)

因此，本文第 1 到第 9 节更适合作为“整改前基线”，而不是对当前 HEAD 的实时评分。

当前更贴近事实的一句话评价是：

**AIV Studio 已从“关键链路未收口的 6.x 状态”推进到“主链路、错误模型和回归护栏基本成型的 7.x 状态”，但仍不建议乐观宣称已经稳定达到 8/10。**

## 1. 评审结论

本次复核基于当前代码，而不是只基于描述性印象。结论是：

AIV Studio 当前处于“架构方向基本正确，但关键链路工程化尚未收口”的阶段。项目并非“架构失控”，而是出现了几个高杠杆的局部失衡点，主要集中在：

1. Planner 前端状态编排已接近维护极限。
2. 运行时仍存在 mock 数据参与业务决策的现象。
3. Run 完成链路承担了过多下游副作用。
4. 后端错误处理尚未形成统一业务错误模型。
5. 异步 worker 仍是数据库轮询式调度，扩展性有限。
6. Web 侧 BFF 层大部分是纯透传，维护收益不稳定。

与此同时，原始评价中有两条需要修正：

1. 项目并非“无测试”，而是“缺少关键链路级集成保障”。
2. Asset 存储链路并非完全未完工，而是“已接通落库，但抽象仍不够稳固”。

综合来看，我对项目当前状态的评分会略高于原文，约为 **6.8 到 7.2 / 10**。

---

## 2. 本次复核的证据基础

### 2.1 核查范围

本次重点核查了以下代码：

- 前端 Planner 状态：
  - [use-planner-page-state.ts](/Users/jiankunwu/project/aiv/apps/web/src/features/planner/hooks/use-planner-page-state.ts)
  - [use-planner-stream.ts](/Users/jiankunwu/project/aiv/apps/web/src/features/planner/hooks/use-planner-stream.ts)
  - [use-planner-runtime-workspace.ts](/Users/jiankunwu/project/aiv/apps/web/src/features/planner/hooks/use-planner-runtime-workspace.ts)

- 后端运行时链路：
  - [run-lifecycle.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/run-lifecycle.ts)
  - [run-worker.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/run-worker.ts)
  - [worker.ts](/Users/jiankunwu/project/aiv/apps/api/src/worker.ts)
  - [server.ts](/Users/jiankunwu/project/aiv/apps/api/src/server.ts)

- Planner workspace 契约：
  - [packages/domain/src/planner-api.ts](/Users/jiankunwu/project/aiv/packages/domain/src/planner-api.ts)
  - [workspace-query.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/planner/workspace-query.ts)
  - [workspace-assembler.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/planner/workspace-assembler.ts)
  - [workspace-presenters.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/planner/workspace-presenters.ts)
  - [snapshot-service.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/planner/stream/snapshot-service.ts)

- Web BFF 层：
  - [apps/web/src/lib/aiv-api.ts](/Users/jiankunwu/project/aiv/apps/web/src/lib/aiv-api.ts)
  - [apps/web/src/app/api/planner/projects/[projectId]/workspace/route.ts](/Users/jiankunwu/project/aiv/apps/web/src/app/api/planner/projects/[projectId]/workspace/route.ts)

- 数据模型：
  - [schema.prisma](/Users/jiankunwu/project/aiv/apps/api/prisma/schema.prisma)

### 2.2 量化观察

- [use-planner-page-state.ts](/Users/jiankunwu/project/aiv/apps/web/src/features/planner/hooks/use-planner-page-state.ts) 共 **652 行**
- [run-lifecycle.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/run-lifecycle.ts) 共 **480 行**
- `apps/web/src/app/api` 下共有 **56 个** `route.ts`
- 其中包含 `proxyAivApiRoute(...)` 的纯代理/近纯代理 route 有 **53 个**

---

## 3. 我同意原评价的部分

## 3.1 Monorepo 分层方向是对的

这一点原评价是成立的。仓库结构清晰分成：

- `packages/domain`
- `packages/ui`
- `apps/api`
- `apps/web`

其中 `packages/domain` 承担跨前后端契约层，尤其 Planner workspace 类型契约清晰可见于 [planner-api.ts](/Users/jiankunwu/project/aiv/packages/domain/src/planner-api.ts)。这是正确的架构方向。

## 3.2 Planner 子域拆分质量较高

原评价提到 Planner 子系统是全项目拆分最好的区域，这个判断基本成立。实际代码中，workspace、stream、refinement、orchestration、rerun、entity recommendation 等逻辑都有独立模块，不是杂糅在一个 service 中。

尤其 Planner workspace 是有明确查询层 + 组装层 + presenter 层分工的：

- 查询：[workspace-query.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/planner/workspace-query.ts)
- 组装：[workspace-assembler.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/planner/workspace-assembler.ts)
- 映射：[workspace-presenters.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/planner/workspace-presenters.ts)

这说明后端在 Planner 子域上已经具备一定工程化意识。

## 3.3 Provider adapter 模式是合理的

这一点我同意。代码中存在统一的 provider adapter 抽象，并由 worker 在运行时根据 run 解析对应 adapter 执行 submit/poll/finalize 流程。这为接入更多 provider 保留了合理扩展面。

## 3.4 前端 Planner 状态管理问题确实严重

这条是原评价中最准确的一条之一。

在 [use-planner-page-state.ts:97](/Users/jiankunwu/project/aiv/apps/web/src/features/planner/hooks/use-planner-page-state.ts#L97)，`usePlannerPageState` 已经成为一个超级协调器。它统一调度 base state、stream、runtime workspace、document persistence、asset actions、shot actions、creation flow、dialog state 等多个层面。

更关键的是，`usePlannerAssetActions` 的入参规模已经明显失控。在 [use-planner-page-state.ts:383](/Users/jiankunwu/project/aiv/apps/web/src/features/planner/hooks/use-planner-page-state.ts#L383) 可以看到它被传入了大量状态值、草稿值、setter、回调、刷新函数、提交函数和 DOM reset 行为。这是典型的 prop drilling 极限征兆。

原评价把根因归结为“完全依赖 React Context + props 逐层传递，没有更合适的状态容器”，这个方向判断是对的。

## 3.5 mock 数据混入运行时逻辑，这条完全成立

在 [use-planner-page-state.ts:41](/Users/jiankunwu/project/aiv/apps/web/src/features/planner/hooks/use-planner-page-state.ts#L41) 直接引入了 `sekoPlanData` 和 `sekoPlanThreadData`。

更关键的是这两组数据并非只用于开发态展示，而是参与了运行时默认值推导：

- [use-planner-page-state.ts:152](/Users/jiankunwu/project/aiv/apps/web/src/features/planner/hooks/use-planner-page-state.ts#L152) 使用 `sekoPlanData` 参与 `plannerDoc` 构建
- [use-planner-page-state.ts:173](/Users/jiankunwu/project/aiv/apps/web/src/features/planner/hooks/use-planner-page-state.ts#L173) 使用 `sekoPlanThreadData.refinementSteps.length` 作为 `stepCount`
- 提交完成后的消息回写逻辑中也继续使用了 mock prompt

这不是“开发兜底无伤大雅”，而是 runtime decision 已受 fixture 影响，应尽快清除。

## 3.6 `run-lifecycle.ts` 职责过重，这条成立

[run-lifecycle.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/run-lifecycle.ts) 目前同时承担：

1. run 失败/完成状态推进
2. provider output URL 解析
3. 生成资源下载与本地存储
4. Asset 记录创建
5. Planner entity 回写
6. refinement projection 同步
7. shot version 创建与激活
8. planner conversation finalize

从 [run-lifecycle.ts:156](/Users/jiankunwu/project/aiv/apps/api/src/lib/run-lifecycle.ts#L156) 开始到文件结束可以明显看到，这是异步完成链路上的“汇聚点”。这种设计短期可行，但它已经成为多个子系统的耦合中心。

## 3.7 server 路由注册缺少显式命名空间组织，这条成立

在 [server.ts:44](/Users/jiankunwu/project/aiv/apps/api/src/server.ts#L44) 开始，多个 route register 平铺注册在顶层 app 上。虽然各 route 文件内部路径本身仍然带 `/api/...` 前缀，但 server 入口没有按子域统一分组，导致路由命名空间依赖各模块内部硬编码。

这不是功能性 bug，但确实会提高重构时的遗漏风险。

## 3.8 错误处理体系偏粗糙，这条成立

[server.ts:69](/Users/jiankunwu/project/aiv/apps/api/src/server.ts#L69) 只有一个全局 500 handler。虽然很多 route 内部已经手写了 400/404/409/401 响应，但整个系统没有统一的 `AppError` / `DomainError` 抽象，也没有中心化的错误码到 HTTP 状态码映射。

结果是：

- route 层不断重复写样板错误响应
- service 层缺少统一抛错语义
- 前端错误码消费不稳定
- 全局 handler 只负责兜底，无法提供一致的业务错误模型

## 3.9 worker 调度机制不透明，这条成立，而且证据明确

这部分不是“看不出来”，而是代码已经说明了当前实现。

[worker.ts:39](/Users/jiankunwu/project/aiv/apps/api/src/worker.ts#L39) 直接在 `while (true)` 中循环调用 `processNextQueuedRun()`；空闲时 sleep 固定间隔。

而 [run-worker.ts:162](/Users/jiankunwu/project/aiv/apps/api/src/lib/run-worker.ts#L162) 的 `claimNextRun()` 先查可 poll 的 run，再查 `QUEUED` run，然后通过 `updateMany` 抢占状态。这就是典型的数据库轮询 + 抢占式 claim 模式，而不是消息队列中间件。

这条评价应保留。

## 3.10 BFF 价值不一致，这条不仅成立，而且比原文更严重

原文写的是 “53 个 Route Handlers 中相当部分是纯透传”。按当前代码统计，`apps/web/src/app/api` 下共有 **56 个** route，其中 **53 个**直接使用 `proxyAivApiRoute(...)`。

纯代理行为的核心实现在 [aiv-api.ts:117](/Users/jiankunwu/project/aiv/apps/web/src/lib/aiv-api.ts#L117)，它主要做：

- 转发 method
- 转发 cookie
- 透传 body
- 透传 response text / content-type / set-cookie

例如 Planner workspace route 本身几乎没有业务逻辑，只是拼 path 后代理到 API：

- [apps/web/src/app/api/planner/projects/[projectId]/workspace/route.ts](/Users/jiankunwu/project/aiv/apps/web/src/app/api/planner/projects/[projectId]/workspace/route.ts)

因此这条问题不仅成立，而且可以更明确地表述为：

当前 Web API 层大部分不是 BFF，而是“反向代理层”。如果不承担数据聚合、权限转换、SSR 注入或协议适配，那么维护成本与收益不匹配。

---

## 4. 我不同意或需要修正的部分

## 4.1 “无测试”不成立，应改为“缺少关键链路级测试”

原文把“工程健壮性”打到 4/10，并给出“无测试、资源存储空洞、错误处理粗糙”的依据。其中“无测试”明显不符合当前仓库事实。

项目中已有大量测试，尤其 `apps/api/src/lib` 与 `apps/web/src/features/*/lib` 下测试数量很多。典型例子包括：

- [run-lifecycle.test.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/run-lifecycle.test.ts)
- [run-worker.test.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/run-worker.test.ts)
- [workspace-service.test.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/planner/workspace-service.test.ts)
- [planner-page-state-slices.test.ts](/Users/jiankunwu/project/aiv/apps/web/src/features/planner/hooks/planner-page-state-slices.test.ts)

更准确的说法应该是：

项目有相当数量的单元测试和模块测试，但缺少覆盖核心业务链路的集成测试/端到端测试，例如 Planner 两阶段执行、stream 与 workspace 协同、Creation run 生命周期闭环等。

## 4.2 “Asset 存储层未完工”表述过头，应改为“已接通，但设计仍脆弱”

原评价提到生成资源仍停留在 `https://generated.local/` 占位符，并据此判断存储层未完工。按当前代码，这个结论已经不准确。

在 [run-lifecycle.ts:178](/Users/jiankunwu/project/aiv/apps/api/src/lib/run-lifecycle.ts#L178) 和 [run-lifecycle.ts:360](/Users/jiankunwu/project/aiv/apps/api/src/lib/run-lifecycle.ts#L360)，生成资源已经会通过 `downloadGeneratedAssetToLocal()` 下载到本地，再把 `storageKey` 和 `sourceUrl` 写入 `asset` 表。

也就是说：

- 生成 URL 不是只停留在 provider output
- asset 记录不是只写 placeholder
- 资源落地链路已经接通

但原评价抓到的“设计脆弱性”仍然存在：`providerSourceUrl` 的来源仍依赖 [run-lifecycle.ts:53](/Users/jiankunwu/project/aiv/apps/api/src/lib/run-lifecycle.ts#L53) 的 `resolveProviderSourceUrl()` 从 `outputJson.providerData` 中动态挖掘 `uri/url/downloadUrl/video_url/image_url` 等字段。这说明存储闭环不是由统一 provider completion contract 显式提供，而是由下游做容错式解析。

因此更准确的结论是：

Asset 存储链路已实现基本可用，但 provider 输出契约不够声明式，资源完成后的持久化边界仍不够稳定。

## 4.3 “Prisma 类型泄漏”目前只能算风险，不宜直接定性为已广泛发生

原评价提到“部分路由直接返回 Prisma 模型字段，而不是经过 presenter 转换的 DTO”。这个风险存在，但不能一概而论。

反例是 Planner workspace 主链路并不是直接回 Prisma 结果：

- [routes/workspaces.ts](/Users/jiankunwu/project/aiv/apps/api/src/routes/workspaces.ts)
- [workspace-query.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/planner/workspace-query.ts)
- [workspace-assembler.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/planner/workspace-assembler.ts)
- [workspace-presenters.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/planner/workspace-presenters.ts)

这里已经有明确 DTO 组装层。

但风险仍然是真的：有些 route 直接依赖 Prisma 查询并在 route 内做轻量映射，例如 [model-registry.ts](/Users/jiankunwu/project/aiv/apps/api/src/routes/model-registry.ts)、[auth.ts](/Users/jiankunwu/project/aiv/apps/api/src/routes/auth.ts)。这会导致 route 层承担过多数据变换职责。

因此修正版应该是：

后端并非普遍直接泄漏 Prisma 模型，但 route 层的数据映射风格不一致，一部分接口已有 presenter/service 分层，一部分仍停留在 route 内部直接查表再组装响应的阶段。

---

## 5. 数据模型复核

## 5.1 优点

原评价对版本化设计的肯定是合理的。

- `PlannerOutlineVersion` / `PlannerRefinementVersion` 的双层版本设计是对的
- `Shot` / `ShotVersion` 的拆分符合媒体生成版本演进需求
- `Asset.sourceKind` 区分 `UPLOAD / GENERATED / IMPORTED / REFERENCE`，语义清晰
- Planner workspace 契约也能完整表达 active version 与 history version 的分层

## 5.2 存在的问题

### 5.2.1 Planner 状态机表达力不足

[schema.prisma:43](/Users/jiankunwu/project/aiv/apps/api/prisma/schema.prisma#L43) 中 `PlannerStatus` 只有：

- `IDLE`
- `UPDATING`
- `READY`

这对前端不足以表达当前到底在跑大纲、跑细化、还是在等待确认。当前系统实际上通过 `outlineConfirmedAt`、`activeOutline`、`activeRefinement` 等额外字段组合推断阶段，workspace presenter 也专门提供了 `stage` 派生逻辑：

- [workspace-presenters.ts:7](/Users/jiankunwu/project/aiv/apps/api/src/lib/planner/workspace-presenters.ts#L7)

这说明原始状态机本身不够完整。

### 5.2.2 Workspace 载荷偏重

[planner-api.ts](/Users/jiankunwu/project/aiv/packages/domain/src/planner-api.ts) 中 `ApiPlannerWorkspace` 聚合了：

- project
- episode
- plannerSession
- latestPlannerRun
- messages
- activeOutline
- outlineVersions
- activeRefinement
- refinementVersions
- subjects
- scenes
- shotScripts

后端组装逻辑也确实一次性查询并返回这些内容：

- [workspace-query.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/planner/workspace-query.ts)
- [workspace-assembler.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/planner/workspace-assembler.ts)

这对初始化页面很方便，但如果前端轮询或频繁 refresh workspace，会导致全量载荷重复传输。

### 5.2.3 SSE 与 workspace 是双轨来源，前端靠合并兜底

stream snapshot 的结构在：

- [snapshot-service.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/planner/stream/snapshot-service.ts)

前端 stream hook 在：

- [use-planner-stream.ts](/Users/jiankunwu/project/aiv/apps/web/src/features/planner/hooks/use-planner-stream.ts)

而页面状态里对步骤展示采用了这样的优先级：

- [use-planner-page-state.ts:156](/Users/jiankunwu/project/aiv/apps/web/src/features/planner/hooks/use-planner-page-state.ts#L156)

即：

- 如果 `streamState.steps.length` 有值，则用 stream steps
- 否则退回 `runtimeWorkspace.activeRefinement.stepAnalysis`

这说明流式状态和 workspace 状态并不是同一个单一真相源，而是“双轨拼接”。原评价说这很脆弱，我同意。

### 5.2.4 休眠模型确实存在，可考虑清理

[schema.prisma:761](/Users/jiankunwu/project/aiv/apps/api/prisma/schema.prisma#L761) 的 `GenerationRecipe` 和 [schema.prisma:780](/Users/jiankunwu/project/aiv/apps/api/prisma/schema.prisma#L780) 的 `RecipeExecution` 仍在 schema 中。

我在 `apps/` 和 `packages/` 中搜索后，没有发现当前业务代码对它们的有效使用，仅剩 schema 声明和 `RunType.RECIPE_EXECUTION`。因此原评价把它们视作“遗留模型”是合理的。

---

## 6. 修订后的总体判断

## 6.1 对原评分的修订

我会把原始评分表修订为：

| 维度 | 修订分数 | 说明 |
|---|---:|---|
| 后端分层设计 | 7.5/10 | Planner 子域、workspace 分层较好，但 route/service 风格还不统一，`run-lifecycle` 仍是明显热点 |
| 前端状态管理 | 5.5/10 | 原评价基本准确，Planner 页面协调层已明显过载 |
| 数据模型设计 | 7.0/10 | 版本化方向正确，但状态机表达力与载荷组织仍需优化 |
| Provider 抽象 | 7.5/10 | adapter 思路正确，provider completion contract 仍应收口 |
| 工程健壮性 | 5.5/10 | 有较多单测，但缺少关键链路集成测试，错误模型不足，worker 与运行时边界仍偏脆弱 |
| 可维护性 | 6.8/10 | 后端部分区域较整洁，前端 Planner 区域拖累明显 |
| 综合 | 6.8/10 | 架构思路正确，但执行层关键路径仍存在明显技术债 |

## 6.2 一句话评价

AIV Studio 不是“架构错误型项目”，而是“架构方向正确、但关键链路工程化尚未收口”的项目。最大风险不在分层理念，而在少数关键路径的复杂度增长速度超过了当前治理手段。

---

## 7. 修订后的优先修复建议

按 ROI 排序，我建议这样排：

## 7.1 第一优先级

### 1. 清除 Planner 前端运行时中的 mock 数据依赖

原因：

- 风险真实且已经进入运行时
- 修复范围集中
- 改完后可以立即降低行为不可预测性

直接证据：

- [use-planner-page-state.ts:152](/Users/jiankunwu/project/aiv/apps/web/src/features/planner/hooks/use-planner-page-state.ts#L152)
- [use-planner-page-state.ts:173](/Users/jiankunwu/project/aiv/apps/web/src/features/planner/hooks/use-planner-page-state.ts#L173)

### 2. 建立统一业务错误模型

建议引入：

- `AppError` / `DomainError`
- `code -> httpStatus` 映射
- route 层统一错误翻译
- service 层抛业务异常，route 不再手写重复错误格式

原因：

- 这是前后端错误处理稳定性的基础设施
- 收益覆盖整个 API 层
- 比重构状态管理更短平快

## 7.2 第二优先级

### 3. 拆解 `run-lifecycle.ts`

建议切分为至少三层：

- run terminal state transition
- generated asset persistence
- planner/shot specific completion handlers

原因：

- 当前文件已经是关键耦合点
- 它会持续吸收更多副作用
- 越晚拆越难拆

### 4. 收口 Planner 页面状态模型

不一定必须上 Zustand/Jotai，但至少要：

- 把页面级协调状态聚合成明确 store/model
- 减少 action hook 的超长入参
- 把“文档状态”“对话框状态”“runtime 同步状态”拆成稳定边界

原因：

- 这是长期可维护性的最大隐患
- 再继续加功能，复杂度会继续非线性上升

## 7.3 第三优先级

### 5. 补关键链路集成测试

建议优先覆盖：

- Planner outline -> refinement 闭环
- Planner stream + workspace 刷新协同
- Creation image/video run 从 queued -> completed -> asset/version 落库
- provider callback / polling 终态闭环

原因：

- 项目并非没测试，但缺少能兜住主流程回归的测试

### 6. 重新定义 Web BFF 的职责边界

建议把 Web API route 分成两类：

- 真 BFF：保留，承担 SSR、cookie、聚合、前端友好协议
- 纯代理：尽量删除或合并

原因：

- 当前 56 个 route 中 53 个是 `proxyAivApiRoute`
- 这层维护成本已明显高于收益

---

## 8. 最终判断

我对原评价的最终态度是：

- **结论方向：同意**
- **细节措辞：需要修订**
- **最需要纠正的两点：**
  - 不是”无测试”
  - 不是”Asset 存储层完全未完工”

如果要把这份评审作为正式对外/对内文档，我建议采用本文的修订版，而不是直接使用原稿。原稿的问题不在于看错方向，而在于个别结论强度超过了当前代码事实。

---

## 9. 第三轮复核（Claude Sonnet 4.6，2026-03-21）

本节为对上述两份评价（原始评价 + 第二轮复核）进行独立代码核实后的终轮判断。

### 9.1 核实范围

除第二轮复核已覆盖的文件外，本轮额外读取了：

- [planner-page.tsx](/Users/jiankunwu/project/aiv/apps/web/src/features/planner/components/planner-page.tsx)
- [planner-page-state-slices.ts](/Users/jiankunwu/project/aiv/apps/web/src/features/planner/hooks/planner-page-state-slices.ts)
- [use-planner-page-state.ts](/Users/jiankunwu/project/aiv/apps/web/src/features/planner/hooks/use-planner-page-state.ts)（完整读取）
- [entity-service.ts](/Users/jiankunwu/project/aiv/apps/api/src/lib/planner/refinement/entity-service.ts)
- [run-lifecycle.ts:155–195](/Users/jiankunwu/project/aiv/apps/api/src/lib/run-lifecycle.ts)（Asset 落库路径核实）
- [settings/hooks/ 目录](/Users/jiankunwu/project/aiv/apps/web/src/features/settings/hooks/)（全量文件列表）
- [use-catalog-management-page-state.ts](/Users/jiankunwu/project/aiv/apps/web/src/features/settings/hooks/use-catalog-management-page-state.ts)（完整读取）

并通过 glob 确认了项目测试文件的实际分布。

### 9.2 对第二轮复核两条修正的代码验证

#### 修正一：”无测试”→”缺少关键链路集成测试”

**结论：第二轮修正成立。**

`apps/api/src/lib` 和 `apps/web/src/features` 下测试文件数量很多，覆盖 `run-lifecycle`、`run-worker`、`workspace-service`、`planner/orchestration`、`planner/refinement`、`provider` 等核心模块，以及前端 `planner/lib`、`settings/lib`、`creation/lib` 等逻辑层。

`planner-page-state-slices.test.ts` 文件已通过 glob 确认存在。

原始评价将”工程健壮性”打到 4/10 并以”无测试”为主要依据，这个定性过于严厉。第二轮修正后的”有相当数量单元测试，缺主链路集成测试”是符合代码事实的表述。

#### 修正二：”Asset 存储未完工”→”已接通，但设计仍脆弱”

**结论：第二轮修正成立，且本轮已读到关键代码行。**

`run-lifecycle.ts:178–190` 明确可见：`downloadGeneratedAssetToLocal` 被实际调用，`tx.asset.create` 实际写库，存储链路已经打通。

同时第二轮指出的脆弱点也成立：`resolveProviderSourceUrl()` 通过动态扫描 `outputJson.providerData` 的多个可能字段名（`uri/url/downloadUrl/video_url/image_url`）来获取下载地址，这说明 provider completion contract 不够声明式，脆弱性来自下游容错解析，而非链路断裂。

### 9.3 对”结构性重构已完成”说法的代码验证

本轮对仓库中一度存在的“结构性重构已基本完成”口径做了代码核实。就已落地的结构变化而言，以下判断成立：

| 声明 | 核实结果 |
|------|---------|
| `planner-page.tsx` 变为薄壳 | **成立**。文件共 29 行，仅调用 `usePlannerPageState` 并将结果传入 `PlannerPageContent`，不含业务逻辑 |
| `entity-service.ts` 变为 facade | **成立**。文件共 17 行，主体为导出语句与少量 `__testables` 暴露，职责已下沉至 access / recommendation / mutation / asset / shot 五个子模块 |
| settings hooks 按职责拆分 | **成立**。`hooks/catalog-management/` 下确认存在 5 个子 hook，`use-catalog-management-page-state.ts` 以装配为主（189 行，返回结构化 state 对象），但仍保留少量页面级副作用与数据同步逻辑 |
| `planner-page-state-slices.ts` 提取切片类型 | **部分成立**。文件存在且有对应测试文件，但类型定义大量使用 `any`（`runtimeActiveOutline: any`、`runtimeActiveRefinement: any`、`plannerDoc: any`、`displayScriptActs: any[]`、`editingShot: any`、`shotDraft: any`、`openShotInlineEditor: (...args: any[]) => void` 等），提取了结构形式，但类型安全尚未落地 |

**对这类口径的判断：**

“结构性重构已到位”可以作为局部结论，但不能直接等价为“系统整体工程质量已经达到更高分数”。结构改进、运行时风险、工程健壮性和业务边界正确性仍应分开评价。

### 9.4 本轮新增观察

**`planner-page-state-slices.ts` 的 `any` 类型是明确的未完成项，不是可忽略细节。**

第二轮复核没有提及这一点。`planner-page-state-slices.ts` 中仅 `any` 关键字就出现了 23 次，`PlannerThreadState`、`PlannerDocumentState` 与 `PlannerDialogState` 都受影响，涵盖了 `runtimeActiveOutline`、`runtimeActiveRefinement`、`plannerDoc`、`displayScriptActs`、`displaySubjectCards`、`displaySceneCards`、`activeVersion`、`editingShot`、`shotDraft` 等核心字段。这些字段恰好是 Planner 文档面板和对话框的主要数据来源。

这意味着：结构分层已完成（4 个切片 + builder 函数），但切片与下游组件之间的类型契约仍然偏空。这与”前后端类型安全”目标之间仍有明显距离，也是此前乐观自评的主要盲点之一。

### 9.5 修订后评分

综合三轮核实，本轮给出以下评分。相较第二轮，我对整体口径做了更保守的收敛：前端状态管理维持原判断，工程健壮性与综合评分略下调，以更贴近当前关键路径的真实维护成本。

| 维度 | 本轮评分 | 对比第二轮 | 说明 |
|------|--------:|--------:|------|
| 后端分层设计 | 7.5/10 | 7.8→7.5 | Planner 子域分层优秀，但 route 风格不统一、`run-lifecycle` 职责过杂，整体下调 |
| 前端状态管理 | 5.5/10 | 5.5→5.5 | 结构改进已落地，但 `any` 类型和超级协调器问题并存，维持不变 |
| 数据模型设计 | 7.0/10 | 7.0→7.0 | 版本化设计正确，状态机表达力不足，维持 |
| Provider 抽象 | 7.5/10 | 7.5→7.5 | 模式正确，completion contract 待收口，维持 |
| 工程健壮性 | 5.5/10 | 5.8→5.5 | 虽有较多单测，但无集成测试 + 无统一错误模型 + DB 轮询 worker 仍明显限制上限 |
| 可维护性 | 6.8/10 | 6.8→6.8 | 后端局部整洁，前端 Planner 拖累，维持 |
| **综合** | **6.8/10** | 6.9→6.8 | 架构思路正确，结构改进已初步落地，但关键路径技术债尚未清偿 |

### 9.6 最终一句话评价

AIV Studio 是一个**架构思路清晰、结构性重构已初步到位、但少数关键路径的运行时风险和类型安全尚未收口**的项目。按当前代码状态，我更建议优先处理 mock 数据的运行时参与、统一错误模型，以及把 `planner-page-state-slices.ts` 的 `any` 类型逐步替换为真实类型定义，再决定是否继续推进更大规模的结构重构。

### 9.7 对下一轮复核方的建议

如需继续复核，建议重点验证以下尚未被三轮评价代码核实的区域：

1. **`run-worker.ts` 和 `worker.ts` 的实际调度逻辑**：确认 `while(true)` + 数据库轮询 + `updateMany` 抢占模式的并发安全边界（多个 worker 实例同时运行时是否存在竞争）
2. **`planner-page-state-slices.ts` 的完整类型定义**：统计 `any` 字段比例，评估类型安全实际覆盖率
3. **前端 `creation` feature 的状态管理**：目前三轮评价均集中在 Planner，Creation 的编辑器状态（canvas、timeline、audio）组织方式尚未被核查
4. **`state-machine-and-error-code-spec-v0.3.md`**：检查规范文档与实际 `schema.prisma` 中 `PlannerStatus` 及各 `RunStatus` 枚举的一致性
