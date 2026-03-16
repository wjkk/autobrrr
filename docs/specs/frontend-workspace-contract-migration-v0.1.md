# 前端工作区契约迁移说明（v0.1）

版本：v0.1
日期：2026-03-16
状态：现行迁移说明（服务于 Phase 7，指导前端契约清理）

## 1. 文档目的

本文用于说明前端当前的过渡态契约、目标态契约和迁移顺序，避免在前端重构时继续把 `StudioFixture` 当作长期运行时模型。

本文不讨论视觉改版，只讨论：

1. 页面首屏数据如何获取
2. 页面组件最终消费什么类型
3. 旧 fixture / mock 逻辑如何逐步退出主路径

## 2. 当前现状

### 2.1 当前真实模式

当前 Planner / Creation / Publish 页面已经从后端读取真实数据，但仍通过“先造 fixture 再回填真实数据”的方式启动页面。

典型位置：

1. `apps/web/src/features/planner/lib/planner-api.server.ts`
2. `apps/web/src/features/creation/lib/creation-api.server.ts`
3. `apps/web/src/features/publish/lib/publish-api.server.ts`

当前模式可以概括为：

1. 读取真实项目详情与 workspace DTO
2. 调用 `createRuntimeStudioFixture()`
3. 将真实数据回填到 `studio.project / studio.planner / studio.creation / studio.publish`
4. 页面主体组件继续按 `StudioFixture` 渲染

### 2.2 当前问题

这种过渡态有 5 个问题：

1. 真实 API 与页面运行时模型之间隔着一层隐式适配，增加理解成本
2. 组件会依赖 fixture 默认值，导致“页面能跑”但不代表真实契约完整
3. 前端无法清晰区分“后端真相字段”和“演示态补位字段”
4. `packages/domain` 被迫同时承担 mock 展示模型和运行时页面模型
5. Phase 2-6 的后端重构很难直接传递到前端，因为中间还有 fixture 兼容层

## 3. 目标态

### 3.1 目标原则

目标不是让页面直接吃数据库模型，而是让页面消费**稳定的 workspace DTO 或明确的 view model**。

推荐原则：

1. route / server loader 读取真实 API DTO
2. feature 内部可保留轻量 view model adapter
3. 页面组件不再接收 `StudioFixture`
4. mock-data 只用于 Explore 演示、视觉预览或测试，不进入主工作区运行时

### 3.2 各页目标输入

Planner：

1. 以 `ApiPlannerWorkspace` 为真实输入
2. 必要时增加 `PlannerPageViewModel`
3. `PlannerPage` 直接消费 planner 专属模型，而非整站 fixture

Creation：

1. 以 `ApiCreationWorkspace` 为真实输入
2. `CreationPage` 直接消费 creation 专属模型
3. 任何默认值都应显式来自 adapter，而不是来自 fixture 副作用

Publish：

1. 以 `ApiPublishWorkspace` 为真实输入
2. `PublishPage` 直接消费 publish 专属模型

## 4. 非目标

以下不属于本次契约迁移的目标：

1. 不要求一次性删除全部 `packages/domain` 类型
2. 不要求 Explore 立即脱离 mock-data
3. 不要求为了前端契约迁移先重写 UI 组件结构
4. 不要求把所有 view model 统一成一个“大而全”的页面模型

## 5. 迁移顺序

### 5.1 Phase A：冻结当前 DTO 真相源

先明确当前三类真实 DTO：

1. `ApiPlannerWorkspace`
2. `ApiCreationWorkspace`
3. `ApiPublishWorkspace`

要求：

1. 这些 DTO 的定义与后端接口响应保持同步
2. 页面所需的额外派生字段在 adapter 中显式生成
3. 不再把派生字段偷偷放回 `StudioFixture`

### 5.2 Phase B：拆出 feature 专属 adapter

每个工作区单独维护自己的 adapter：

1. `planner-workspace-adapter.ts`
2. `creation-workspace-adapter.ts`
3. `publish-workspace-adapter.ts`

作用：

1. 将 API DTO 转成页面真正需要的 view model
2. 显式处理默认值、空态和兼容字段
3. 让“兼容逻辑”集中，而不是散落在页面组件和 fixture 中

### 5.3 Phase C：页面组件去掉 `StudioFixture`

顺序建议：

1. Planner
2. Creation
3. Publish

原因：

1. Planner 的后端重构最先推进，收益最高
2. Creation 目前仍有较多默认值补位，需要在 Planner 稳定后再清理
3. Publish 相对简单，适合作为最后收尾

### 5.4 Phase D：收缩 mock-data 运行时职责

完成主路径迁移后：

1. `createRuntimeStudioFixture()` 不再服务 Planner / Creation / Publish 真实页面
2. `getMockStudioProject()` 不再作为主路径失败时的隐式兜底逻辑
3. mock-data 仅保留在演示、测试或 Explore 预览场景

## 6. 页面级改动建议

### 6.1 Planner

当前主要问题：

1. `planner-api.server.ts` 以 fixture 作为页面壳
2. `PlannerPage` 接收 `studio: StudioFixture`
3. 页面状态有一部分来自真实 workspace，一部分来自 fixture 默认值

目标：

1. `PlannerPageBootstrap` 只包含 planner 运行时真正需要的字段
2. `PlannerPage` 去掉对 `StudioFixture` 的直接依赖
3. `studio.project` 这类共享壳字段只保留必要最小集合

### 6.2 Creation

当前主要问题：

1. `creation-api.server.ts` 中存在大量默认值补位
2. 时长、分辨率、素材栈等字段部分来自真实 DTO，部分来自本地推断
3. 页面很难判断哪些字段是后端真相，哪些只是临时前端推断

目标：

1. 明确哪些字段必须由后端返回
2. 明确哪些字段可由前端 adapter 推断
3. 推断逻辑集中在 adapter，不进入 fixture

### 6.3 Publish

当前主要问题：

1. `publish-api.server.ts` 仍借助 fixture 壳组织页面
2. 页面 draft 状态与真实 workspace 之间还有一次隐式转换

目标：

1. `PublishPageBootstrap` 明确化
2. `PublishPage` 直接围绕 publish workspace 渲染

## 7. 清理对象

完成迁移后，应优先清理：

1. `apps/web/src/lib/studio-service.ts` 中不再服务主路径的旧接口契约
2. Planner / Creation / Publish 页面对 `StudioFixture` 的运行时依赖
3. `packages/domain/src/studio.ts` 中仅用于旧整站 fixture 的聚合模型

注意：

1. 删除前先确认 Explore 或其他演示路径是否仍在使用
2. 若仍需保留，可降级为 mock-only 类型，不再宣称为主页面契约

## 8. Done 定义

当前迁移完成的标志是：

1. Planner / Creation / Publish 页面都不再以 `StudioFixture` 作为运行时输入
2. 真实 API DTO 与页面 view model 的适配层显式存在且职责单一
3. 页面错误态不再依赖 fixture 默认值才能运行
4. mock-data 退出主工作区运行时路径
5. 文档中不再把 `StudioFixture` 写成主工作区的长期基线

## 9. 相关文档

1. `docs/index/master-index-v0.4.md`
2. `docs/specs/refactor-execution-guardrails-v0.1.md`
3. `docs/specs/backend-implementation-checklist-v0.3.md`
