# Planner 结构重构救援执行计划（v0.1）

版本：v0.1
日期：2026-03-19
状态：已被 `architecture-8-score-roadmap-v0.1.md` 替代，仅保留为历史参考

> 当前执行请改读 [architecture-8-score-roadmap-v0.1.md](/Users/jiankunwu/project/aiv/docs/specs/architecture-8-score-roadmap-v0.1.md)。
> 本文记录的是上一轮“结构救援式重构”的阶段计划，不再作为本轮成熟度收口的执行依据。

## 1. 目标

本计划用于替换“一次性 7 步全量重构”的执行方式，目标不是重新定义方向，而是把当前已经卡住的重构拆成可落地、可回滚、可验证的阶段。

核心原则：

1. 先修当前坏状态，再做大规模移动。
2. 先处理低风险高收益的契约与 mock 清理，再做目录和组件大拆。
3. 任何一步都必须在 API 和 Web 的真实验证口径下闭环。

## 2. 修正后的阶段划分

### Phase 0：稳定当前半成品

目标：

1. 修复 Step 1 当前卡住的 helper 收口。
2. 明确 helper 语义分层，禁止继续机械替换。
3. 恢复 `@aiv/api` 类型检查并补最小测试。

执行项：

1. 保留通用 `readObject` / `readString` / `readObjectArray` / `readStringArray` / `readNumber` / `toInputJsonObject`。
2. 新增语义化 helper：`readNullableString`、`readStringCoerce`。
3. `planner-agent-schema-utils.ts` 继续对外暴露原有 `readString` 语义，但改为委托到 `readStringCoerce`。
4. `planner-debug-shared.ts` 继续对外暴露原有 `readString` 语义，但改为委托到 `readNullableString`。
5. 新增 `json-helpers.test.ts`。

验证：

1. `pnpm typecheck:api`
2. `pnpm --filter @aiv/api test:unit`

### Phase 1：先做低风险契约清理

目标：

1. 把 planner mock 数据迁出 web feature。
2. 把 planner API DTO 从 web 本地迁入 `@aiv/domain`。

执行项：

1. `seko-plan-data.ts`、`seko-plan-thread-data.ts` 迁入 `packages/mock-data`。
2. 新建 `packages/domain/src/planner-api.ts`，只迁稳定 API DTO。
3. web 侧 `planner-api.ts` 改为消费 `@aiv/domain` DTO。

验证：

1. `pnpm typecheck:api && pnpm typecheck`
2. `pnpm build`

### Phase 2：Planner 后端目录重组，按域分批迁移

目标：

1. 消除 `apps/api/src/lib` 下 planner 文件平铺。
2. 降低文件移动造成的 import 断裂风险。

执行项：

1. 先建立 `apps/api/src/lib/planner/` 目录骨架和兼容 re-export。
2. 按域分批迁移：`agent/`、`debug/`、`refinement/`、`orchestration/`、`rerun/`。
3. 在所有消费者切换完成前，保留兼容 barrel。

验证：

1. 每一批迁移后执行 `pnpm typecheck:api`
2. 每两批迁移后执行 `pnpm --filter @aiv/api test:unit`

### Phase 3：PlannerPage 状态收口

目标：

1. 把 God Component 收缩到布局组件。
2. 减少层层 props 透传。

执行项：

1. 先抽 `use-planner-page-state.ts`。
2. 再引入细粒度 context，而不是一个大而全的全局 context。
3. `planner-page.tsx` 只保留布局和页面级装配。

验证：

1. `pnpm typecheck`
2. `pnpm build`
3. planner 页面手动 smoke

### Phase 4：Route -> Service seam

目标：

1. 厚 route 下沉到 service。
2. route 保持认证、校验、响应装配三件事。

执行项：

1. 先处理 `studio-projects.ts` 与 `explore-catalogs.ts`。
2. 再处理 planner 相关厚路由。
3. service 层补 focused API unit test。

验证：

1. `pnpm typecheck:api`
2. `pnpm --filter @aiv/api test:unit`

### Phase 5：Provider 简化，但不做大文件合并

目标：

1. 去掉多余中间跳转。
2. 不把复杂度堆到 `provider-adapters.ts`。

执行项：

1. 以 provider registry / capability map 替代 `provider-gateway.ts`。
2. `provider-adapters.ts` 保持 Run 执行入口职责，不继续膨胀。

验证：

1. `pnpm typecheck:api`
2. `pnpm --filter @aiv/api test:unit`

## 3. 验证口径修正

旧计划中的验证口径不准确，现统一为：

1. 后端改动必须至少运行 `pnpm typecheck:api`。
2. 前端改动必须至少运行 `pnpm typecheck` 和 `pnpm build`。
3. 需要 API 与页面协同时，再执行更重的回归组合。

说明：

1. 根目录 `pnpm typecheck` 当前只检查 `@aiv/web`。
2. 根目录 `pnpm build` 当前只构建 `@aiv/web`。
3. `pnpm test:quality` 是重型总闸，不适合作为每一步的默认验证。

## 4. 当前执行状态

1. Phase 0 已开始。
2. 当前不进入 Phase 2 以前的任何大规模文件移动。
