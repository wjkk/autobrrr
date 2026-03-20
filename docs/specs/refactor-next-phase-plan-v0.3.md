# 重构续推计划（v0.3）

版本：v0.3
日期：2026-03-19
状态：已完成（2026-03-19 全量验收通过）

---

## 执行结果（2026-03-19）

- Phase L 完成：`apps/web/src/features/creation/lib/creation-state.ts` 已收口为 98 行 facade，状态逻辑拆入 `creation-shot-state.ts`、`creation-playback-state.ts`、`creation-audio-state.ts`、`creation-state-shared.ts`
- Phase L 完成：`apps/web/src/features/creation/components/creation-canvas-editor.tsx` 已降到 123 行，编辑器状态、stage 与 sidebar 分拆到 `use-creation-canvas-editor-state.ts`、`creation-canvas-editor-stage.tsx`、`creation-canvas-editor-sidebar.tsx`
- Phase M 完成：Creation page/container 继续瘦身，`creation-page.tsx` 已降到 78 行，`creation-sidebar.tsx` 已降到 28 行，并拆出 `creation-page-header.tsx`、`creation-track-rail.tsx`、`creation-workspace-center.tsx`、`creation-audio-sidebar.tsx`、`creation-lipsync-sidebar.tsx`
- Phase N 完成：Planner Debug 页面继续收口，`planner-agent-debug-page.tsx` 已降到 31 行，状态与动作拆入 `use-planner-agent-debug-page-state.ts`、`use-planner-agent-debug-page-bootstrap.ts`、`planner-agent-debug-page-actions.ts`
- Phase N 完成：Explore 页面继续拆 presenter，`explore-page.tsx` 已降到 274 行，并新增 `explore-hero-composer.tsx`
- Phase N 完成：Catalog 管理页继续拆展示层，新增 `catalog-management-auth-gate.tsx`、`catalog-management-dialogs.tsx`、`catalog-management-admin-nav.tsx`，将认证壳、弹层与 admin nav 从主页面剥离
- Phase O 完成：新增 `apps/web/src/features/creation/lib/creation-playback-state.test.ts`，补 Creation playback / lipsync state helper 回归测试
- 最终验收通过：`pnpm typecheck:api`、`pnpm --filter @aiv/api test:unit`、`pnpm --filter @aiv/web test:unit`、`pnpm typecheck`、`pnpm build`

说明：

- `apps/api/src/lib/planner/refinement/entity-service.ts` 仍按计划维持“按需治理”策略，未做预防性拆分
- `apps/web/src/features/settings/components/catalog-management-page.tsx` 仍偏厚，但已完成本阶段约定的 opportunistic 收口，不再阻塞 `v0.3` 关闭

---

## 0. 本阶段结论

`v0.2` 完成后，项目已经脱离“后端主链路被结构债阻塞”的阶段。

`v0.3` 不再建议发起一次纯重构冲刺，而是进入“功能开发继续推进，重构按热点并行收口”的阶段。

本阶段判断：

1. 可以开始继续做新功能，后端主干已足够健康
2. 下一阶段主战场转为前端 `creation` feature
3. 后端只处理“真实阻碍开发”的局部热点，不做无收益的提前拆分
4. `refinement/entity-service.ts` 这类大文件，后续如无明确变更需求，不做预防性重构

---

## 1. 当前基线（v0.2 完成后）

### 后端

已基本收口：

- Provider adapter 已模块化：`apps/api/src/lib/provider/adapter-resolution.ts`
- Provider catalog 已统一：`apps/api/src/lib/provider/catalog/model-catalog.ts`
- Planner debug route 已瘦身：`apps/api/src/routes/planner-debug.ts`
- Conversation finalize 已拆出 facade + persistence/message 层：`apps/api/src/lib/planner/orchestration/conversation-finalizer.ts`

当前后端剩余热点：

| 文件 | 当前行数 | 评价 |
|------|---------|------|
| `apps/api/src/lib/planner/refinement/entity-service.ts` | 634 | 仍偏大，但职责相对集中，按需再拆 |
| `apps/api/src/routes/planner-debug.ts` | 248 | 已可接受，后续只在新增需求触达时继续下沉 |

### 前端

当前主要热点集中在 `creation` 与若干 admin/settings/explore 页面：

| 文件 | 当前行数 | 评价 |
|------|---------|------|
| `apps/web/src/features/planner-debug/components/planner-agent-debug-page.tsx` | 651 | 仍是最厚页面之一 |
| `apps/web/src/features/settings/components/catalog-management-page.tsx` | 567 | 仍可继续拆 presenter / actions |
| `apps/web/src/features/creation/components/creation-canvas-editor.tsx` | 532 | Creation 下一步最值得处理的 UI 热点 |
| `apps/web/src/features/explore/components/explore-page.tsx` | 530 | 已明显改善，但仍有拆分空间 |
| `apps/web/src/features/creation/lib/creation-state.ts` | 517 | 仍偏像 feature 内状态中枢 |
| `apps/web/src/features/settings/components/provider-config-page.tsx` | 464 | 已可维护，后续只按需求触达继续瘦身 |
| `apps/web/src/features/creation/components/creation-visual-sidebar.tsx` | 407 | 已明显改善，进入按需优化阶段 |

---

## 2. v0.3 核心目标

本阶段目标从“拆掉明显 God Module”切换为“支撑持续开发”：

1. 让 `creation` feature 达到接近 `planner` 的可持续演进水平
2. 让高频页面在继续开发时不再因为文件过厚而放大修改成本
3. 用测试和契约补强，避免拆分后出现 feature 边界回退
4. 保持后端稳定，不为了“文件好看”制造新的抽象层

---

## 3. 执行原则

### 原则 A：功能优先，重构并行

- 允许新功能开发与重构同步进行
- 不再暂停业务开发专门发起大面积“清债冲刺”
- 新功能触达到热点文件时，必须顺手做边界收口

### 原则 B：只拆真正影响开发效率的点

- 优先拆高频变更文件
- 优先拆“状态编排 + 副作用 + UI 混在一起”的模块
- 不为目录整齐而重构

### 原则 C：优先状态和契约，不优先视觉切片

- 先拆 state / action / orchestration
- 再拆 page content / presenter / section
- 最后才处理纯视觉层碎片化

### 原则 D：后端以按需治理为主

- `entity-service.ts` 只有在新增需求明显增加认知负担时才拆
- 不再启动新的 provider 层抽象工程
- 不主动重构已稳定且测试充分的主链路

---

## 4. 优先级清单

### P0：Creation feature 第二轮治理

这是 `v0.3` 的绝对主线。

#### 目标

- 降低 `creation` 新功能接入成本
- 避免新的逻辑再次回流到单一 state 文件或大组件
- 建立可长期复用的 feature 内边界

#### 建议处理点

1. `apps/web/src/features/creation/lib/creation-state.ts`
   - 拆出纯派生 selector
   - 拆出 mutation reducer / state transition helper
   - 将副作用桥接继续留在 hook/action 层
2. `apps/web/src/features/creation/components/creation-canvas-editor.tsx`
   - 拆 stage interaction
   - 拆 timeline/canvas bridge
   - 拆 inspector 或工具栏级子模块
3. `apps/web/src/features/creation/components/creation-page.tsx`
   - 若新功能继续进入该页，优先抽 page-level sections / containers
4. `apps/web/src/features/creation/components/creation-sidebar.tsx`
   - 若继续变厚，抽 sidebar sections 与 action hooks

#### 完成标准

- `creation` 新功能不需要再集中塞回单个 God Hook/God Component
- 核心状态流可从 page -> hook -> action/state helper 逐层追踪

### P1：继续压前端剩余厚页面

这些页面已经可维护，但仍值得继续收口。

#### 目标文件

- `apps/web/src/features/planner-debug/components/planner-agent-debug-page.tsx`
- `apps/web/src/features/settings/components/catalog-management-page.tsx`
- `apps/web/src/features/explore/components/explore-page.tsx`

#### 执行方式

- 只在新增需求触达时继续拆
- 优先抽 page-state、async action、section presenter
- 避免再把逻辑散成过多 20-30 行“假模块”

### P1：测试与契约补强

随着模块增多，下一阶段比“继续切文件”更重要的是补契约。

#### 建议方向

1. 为 `creation` 新拆出的 state helper / action helper 补单测
2. 为关键 page-state hook 补最小行为测试
3. 对高频 API 映射层继续保持输入/输出归一化测试
4. 对跨 feature 共用的 domain helper，优先做纯函数测试

### P2：后端按需拆分热点

#### 处理策略

1. `apps/api/src/lib/planner/refinement/entity-service.ts`
   - 暂不主动拆
   - 仅在新增需求修改超过一个职责面时，顺手拆成 query/service/mapper 或 orchestration + helper
2. `apps/api/src/routes/planner-debug.ts`
   - 维持当前状态
   - 仅在新增 debug capability 导致 route 再次膨胀时处理

---

## 5. 建议分阶段执行

### Phase L：Creation 状态层继续拆分

先处理：

- `apps/web/src/features/creation/lib/creation-state.ts`
- `apps/web/src/features/creation/components/creation-canvas-editor.tsx`

目标：

- 把 Creation 剩余最大认知负担从 UI 与状态中枢上拆掉

### Phase M：Creation 页面级容器收口

按功能开发触达情况，继续处理：

- `apps/web/src/features/creation/components/creation-page.tsx`
- `apps/web/src/features/creation/components/creation-sidebar.tsx`
- `apps/web/src/features/creation/components/creation-stage.tsx`

目标：

- 形成稳定的 page/container/section 分层

### Phase N：剩余厚页面 opportunistic 收口

处理：

- `apps/web/src/features/planner-debug/components/planner-agent-debug-page.tsx`
- `apps/web/src/features/settings/components/catalog-management-page.tsx`
- `apps/web/src/features/explore/components/explore-page.tsx`

目标：

- 不打断业务开发，但持续降低单文件变更成本

### Phase O：测试与边界护栏补齐

处理：

- Creation state/action helper tests
- 高频 page-state 行为测试
- 必要的 API/domain 纯函数回归测试

目标：

- 保证后续继续拆分时不回退

---

## 6. 不建议做的事

以下事项不建议作为 `v0.3` 主线：

| 事项 | 原因 |
|------|------|
| 再做一次大范围后端抽象升级 | 当前后端已经足够健康，收益低 |
| 主动拆 `entity-service.ts` | 当前属于“可接受但偏厚”，无需求驱动不值得 |
| 为了行数继续机械拆小组件 | 容易产生碎片化和导航负担 |
| 发起纯重构冻结期 | 会打断业务推进，不符合当前收益结构 |

---

## 7. 验收口径

`v0.3` 不建议按一次性“大闭环冲刺”验收，而是按阶段滚动验收。

### 基础验收

- `pnpm typecheck:api`
- `pnpm --filter @aiv/api test:unit`
- `pnpm typecheck`
- `pnpm build`

### 增量验收

- Creation 新增模块具备最小单测或行为测试
- 新功能落地后，没有把逻辑重新塞回单个超厚文件
- 页面层职责维持 “page/container -> state/action -> presentational section” 结构

---

## 8. 一句话执行策略

`v0.3` 的关键词不是“再打一轮全仓重构”，而是：

**一边继续开发，一边把 `creation` 做成下一个结构稳定的主模块，并对剩余热点执行按需治理。**

---

## 9. 参考文档

- `docs/archive/specs/refactor-next-phase-plan-v0.1.md`
- `docs/archive/specs/refactor-next-phase-plan-v0.2.md`
- `docs/specs/backend-implementation-checklist-v0.3.md`
- `docs/specs/refactor-execution-guardrails-v0.1.md`
