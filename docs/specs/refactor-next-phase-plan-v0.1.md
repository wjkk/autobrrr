# 重构续推计划（v0.1）

版本：v0.1
日期：2026-03-19
状态：现行执行计划

---

## 1. 当前状态总结

截至 2026-03-19，已完成的重构工作：

| 已完成 | 说明 |
|--------|------|
| Planner 后端目录重组 | `lib/planner/` 下 9 个子目录（agent/debug/doc/entity/media/orchestration/refinement/rerun + 根级工具），68 个文件 |
| Route 层瘦身 | planner-debug 从 41KB → 468 行；explore-catalogs / planner-refinement-entities 改为聚合器模式 |
| 测试补齐 | 104 个测试文件 / 11,660 行，planner 子模块几乎每个 service 都有对应测试 |
| 外部调用审计 | `ExternalApiCallLog` 模型完整落地，transport hook 在 server/worker 双端自动安装 |
| Provider 接入 | ARK text/image/video 已接入统一 gateway；provider-adapters 定义了 ProviderAdapter 接口 |
| 前端 Planner 页拆分 | planner-page.tsx 从 God Component 收敛到约 658 行，拆出 14 个 hook + 多个子组件 |
| Domain 包建立 | `@aiv/domain` 含 planner-api/planner-doc/creation/project/studio/publish/shared，631 行 |
| Mock 数据迁移 | seko-plan-data / seko-plan-thread-data 已迁入 `packages/mock-data` |
| json-helpers 工具层 | 统一 JSON 安全读取，含完整测试 |

**当前中间态问题：**

1. 37 个 re-export 桩文件仍留在 `lib/` 根目录（向后兼容层，未清理）
2. 部分路由仍然较厚（planner-refinement-versions 366 行、planner-stream 302 行 等）
3. Provider 层缺乏统一 Capability 抽象（ark/platou 各自独立，无共享 capability 接口）
4. `run-lifecycle.ts` Asset URL 仍为 `https://generated.local/` 占位符
5. ARK AUDIO 接入搁置（等待官方确认可用接口）

---

## 2. 续推阶段划分

### Phase A：清理 re-export 桩文件（低风险，高收益）

**目标：** 消除 `lib/` 根目录 37 个一行 re-export 桩，统一 import 路径指向新位置。

**为什么先做：**
- 纯机械操作，无业务逻辑变更
- 消除目录噪音，新开发者不再困惑"该 import 哪个"
- 为后续 Phase B 的路由瘦身扫清 import 路径混乱

**执行步骤：**

1. 用 grep 找出所有消费 `lib/planner-*.ts` 桩文件的 import（routes/ 和 lib/ 内部）
2. 批量将 import 路径改为新路径（`./planner/agent/...`、`./planner/debug/...` 等）
3. 删除 37 个桩文件
4. 验证：`pnpm typecheck:api`

**涉及文件：**
- `apps/api/src/routes/*.ts`（所有 import planner-* 的路由文件）
- `apps/api/src/lib/planner-*.ts`（37 个桩文件，删除）

**验收：**
- `pnpm typecheck:api` 通过
- `pnpm --filter @aiv/api test:unit` 通过

---

### Phase B：继续瘦身剩余厚路由

**���标：** 将仍然较厚的路由文件收敛到"认证 + 校验 + 调 service + 返回"模式。

**优先级排序（按行数和复杂度）：**

| 路由文件 | 当前行数 | 目标行数 | 主要问题 |
|---------|---------|---------|---------|
| planner-refinement-versions.ts | 366 | ~120 | 查询逻辑混在路由层 |
| planner-stream.ts | 302 | ~100 | SSE 逻辑未下沉 |
| planner-media-generation.ts | 258 | ~100 | 媒体生成编排在路由层 |
| planner-finalize.ts | 240 | ~100 | finalize 逻辑未完全下沉 |
| planner-debug.ts | 468 | ~150 | schema 定义和业务逻辑仍混杂 |

**执行原则：**
- 每个路由文件单独一个提交
- 提取的 service 放入对应的 `lib/planner/` 子目录
- 每次提交后运行 `pnpm typecheck:api` + 对应 smoke

**执行步骤（以 planner-refinement-versions.ts 为例）：**

1. 新建 `lib/planner/orchestration/refinement-version-service.ts`
2. 将查询/聚合逻辑迁入 service
3. 路由层只保留 schema 定义 + 参数解析 + service 调用 + 响应
4. 补 service 单测
5. 验证：`pnpm typecheck:api` + `pnpm --filter @aiv/api test:unit`

---

### Phase C：Provider 层统一 Capability 抽象

**目标：** 建立统一的 provider capability 接口，消除 ark/platou 各自独立的现状。

**当前问题：**
```
provider-adapters.ts (657行) — submit/poll/handleCallback 混在一起
provider-gateway.ts (236行) — ark/platou facade，无 capability 分层
ark-client.ts (464行) — Ark 直连，无共享接口
platou-client.ts (227行) — Platou 直连，无共享接口
ark-model-catalog.ts (331行) — 独立
platou-model-catalog.ts (318行) — 独立
```

**目标结构：**
```
lib/
  provider/
    capability.ts          — ProviderCapability 接口（text/image/video/audio）
    registry.ts            — provider 注册表，capability → client 映射
    adapters/
      ark-adapter.ts       — Ark 实现 ProviderCapability
      platou-adapter.ts    — Platou 实现 ProviderCapability
    catalog/
      model-catalog.ts     — 统一模型能力查询入口（合并 ark/platou catalog）
```

**执行步骤：**

1. 定义 `ProviderCapability` 接口（text/image/video/audio 四种能力的统一签名）
2. 建立 provider registry，capability → adapter 映射
3. 将 ark-client / platou-client 包装为各自的 adapter 实现
4. 合并 ark-model-catalog / platou-model-catalog 为统一查询入口
5. 更新 provider-gateway.ts 使用新 registry（或逐步废弃 gateway）
6. 验证：`pnpm typecheck:api` + provider 相关 smoke

**注意：**
- ARK AUDIO（R-05D）仍搁���，新结构需为其预留接口但不强制实现
- 此 Phase 风险最高，需要最充分的测试覆盖后再合并

---

### Phase D：Asset 存储真实对接

**目标：** 消除 `run-lifecycle.ts` 中 `https://generated.local/` 占位符，接入真实文件存储。

**当前状态：**
- `run-lifecycle.ts` 480 行，Asset URL 写死为占位符
- `apps/api/uploads/generated/` 目录已存在（本地文件上传已有基础）

**执行步骤：**

1. 确认本地文件存储路径策略（`uploads/generated/{year}/{month}/{day}/`）
2. 在 `run-lifecycle.ts` 中将生成结果写入本地存储，返回真实可访问 URL
3. 确认 `assets.ts` 路由的静态文件服务已覆盖该路径
4. 补回归测试
5. 验证：真实生成一个 run，检查 Asset.sourceUrl 可访问

---

### Phase E：前端 Planner 模块评估与拆分

**目标：** 评估 12,958 行的 planner 模块是否需要进一步拆分，降低维护复杂度。

**当���状态：**
```
planner/ — 12,958 行（占前端总量 52%）
  components/ — 多个大文件
  hooks/ — 14 个 hook 文件
  lib/ — 12 个 lib 文件
```

**评估维度：**
1. hooks 之间的依赖关系是否形成循环或过深的调用链
2. 是否存在可以独立为子功能模块的区域（如 planner-debug 已独立）
3. 组件文件是否有超过 500 行的单文件

**可能的拆分方向：**
- `planner-outline/` — outline 阶段相关组件和 hooks
- `planner-refinement/` — refinement 阶段相关组件和 hooks
- `planner-debug/` — 已独立，保持现状

**执行原则：**
- 先做评估，再决定是否拆分
- 不为拆分而拆分，只有当某个子域有清晰边界时才拆

---

## 3. 执行顺序与依赖关系

```
Phase A（清理桩文件）
    ↓
Phase B（路由瘦身）    Phase D（Asset 存储）
    ↓
Phase C（Provider 抽象）
    ↓
Phase E（前端评估）
```

- Phase A 是前置，清理 import 路径后 Phase B 的改动更干净
- Phase B 和 Phase D 可并行
- Phase C 依赖 Phase B 完成（路由已瘦身，provider 调用点清晰）
- Phase E 最后做，不阻塞其他 Phase

---

## 4. 每个 Phase 的验收口径

| Phase | 验收命令 | 额外验证 |
|-------|---------|---------|
| A | `pnpm typecheck:api` + `pnpm --filter @aiv/api test:unit` | 无 |
| B | `pnpm typecheck:api` + `pnpm --filter @aiv/api test:unit` | 对应路由的 smoke |
| C | `pnpm typecheck:api` + `pnpm --filter @aiv/api test:unit` | provider smoke（image/video） |
| D | `pnpm typecheck:api` | 真实 run 生成后 Asset URL 可访问 |
| E | `pnpm typecheck` + `pnpm build` | planner 页面手动 smoke |

---

## 5. 不在本计划范围内的事项

以下事项当前不推进，原因已注明：

| 事项 | 原因 |
|------|------|
| ARK AUDIO 接入（R-05D） | 等待官方确认可用接口，不阻塞主链路 |
| subShot / shotSegments 新数据模型 | 需求未稳定，不提前设计 |
| Admin 后台迁移 | 功能性需求，重构完成后再推进 |
| 新功能开发 | 重构完成前暂停 |

---

## 6. 参考文档

- `docs/specs/refactor-todo-flat-table-v0.1.md` — 历史任务总表（R-01 到 R-23 均已完成）
- `docs/specs/planner-structural-refactor-rescue-plan-v0.1.md` — 救援计划（Phase 0-5 已执行）
- `docs/specs/refactor-execution-sequence-v0.1.md` — 历史执行序列
- `docs/specs/phase-2-ai-refactor-task-breakdown-v0.1.md` — Phase 2 AI 层拆解
- `docs/specs/planner-phase-4-5-task-breakdown-v0.1.md` — Planner Phase 4/5 拆解
