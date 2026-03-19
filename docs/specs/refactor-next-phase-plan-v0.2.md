# 重构续推计划（v0.2）

版本：v0.2
日期：2026-03-19
状态：下一阶段执行计划

---

## 1. 背景与目标

`v0.1` 计划内的主链路重构已完成：

- `apps/api/src/lib/` 根目录 37 个 `planner-*` re-export 桩文件已删除
- Planner 主要 route 已进一步收口
- Provider 执行边界已开始收口到统一 registry
- Asset 本地存储已补代码级回归测试
- Planner 前端已完成第一轮状态 ownership 拆分

当前项目进入下一阶段，重点不再是继续清理 Planner 历史尾巴，而是处理剩余的大型模块、空壳抽象和 Creation 前端技术债。

本阶段目标只有三类：

1. 收口仍然明显失衡的后端 God Module
2. 让 Provider 抽象从“统一入口”进化到“真正统一实现”
3. 把 Creation feature 提升到接近 Planner 当前的工程质量水平

---

## 2. 当前剩余热点

### 后端热点

| 文件 | 当前行数 | 问题 |
|------|---------|------|
| `apps/api/src/lib/provider-adapters.ts` | 657 | provider 选择、submission/poll/callback、状态归一化、metadata 构建混在一起 |
| `apps/api/src/lib/provider/catalog/model-catalog.ts` | 47 | 统一入口已存在，但仍是薄 facade |
| `apps/api/src/lib/ark-model-catalog.ts` | 331 | Ark catalog 逻辑仍独立 |
| `apps/api/src/lib/platou-model-catalog.ts` | 318 | Platou catalog 逻辑仍独立 |
| `apps/api/src/routes/planner-debug.ts` | 468 | 仍是最厚 route，schema 与分发较多 |
| `apps/api/src/lib/planner/debug/execution-service.ts` | 512 | debug 执行链仍是大模块 |
| `apps/api/src/lib/planner/orchestration/conversation-finalizer.ts` | 580 | 逻辑集中、helper 较多，仍可再拆 |

### 前端热点

| 文件 | 当前行数 | 问题 |
|------|---------|------|
| `apps/web/src/features/creation/lib/use-creation-workspace.ts` | 810 | Creation 的 God Hook |
| `apps/web/src/features/creation/components/creation-visual-sidebar.tsx` | 750 | 组件职责过重 |
| `apps/web/src/features/creation/components/creation-dialogs.tsx` | 647 | dialogs 聚合过厚 |
| `apps/web/src/features/planner/hooks/use-planner-page-state.ts` | 629 | 仍是 orchestration hub，但已完成第一轮状态拆分 |
| `apps/web/src/features/planner-debug/components/planner-agent-debug-page.tsx` | 983 | 页面规模过大 |
| `apps/web/src/features/explore/components/explore-page.tsx` | 974 | Explore 主页面过厚 |
| `apps/web/src/features/settings/components/provider-config-page.tsx` | 938 | Settings Provider 页面过厚 |
| `apps/web/src/features/settings/components/catalog-management-page.tsx` | 685 | Catalog 管理页过厚 |

### 模块级热点

| 模块 | 当前规模 | 问题 |
|------|---------|------|
| `apps/web/src/features/creation` | 6,667 行 | 尚未经历 Planner 同等级别的系统性重构 |
| `apps/web/src/features/planner` | 主热点已下降 | 现阶段优先级低于 Creation |

---

## 3. 下一阶段优先级

### P0：必须先做

1. 拆分 `provider-adapters.ts`
2. 把 Provider catalog 从“统一入口 facade”推进到“真正统一实现”

### P1：主链路质量提升

1. 拆分 Creation feature
2. 继续收口 Planner debug 执行链

### P2：体验层与次级大文件

1. 拆分 `conversation-finalizer.ts`
2. 拆分 Explore / Settings 系列 God Page
3. 视情况继续拆 `use-planner-page-state.ts`

---

## 4. 分阶段执行计划

### Phase F：拆分 `provider-adapters.ts`

**目标：** 消除当前唯一明显的后端 God Module，使 provider 执行链的职责边界清晰。

**当前问题：**

- `provider-adapters.ts` 当前 `657` 行
- 对外几乎只有 `resolveProviderAdapter(...)`
- 内部同时承担：
  - run input 解析
  - provider 选择
  - transport metadata 构建
  - platou / ark task id 与状态推断
  - ark / platou submit / poll / callback 实现

**建议目标结构：**

```text
apps/api/src/lib/provider/
  adapters/
    ark.ts
    platou.ts
    mock-proxy.ts
    official.ts
  adapter-shared.ts
  adapter-resolution.ts
```

**执行步骤：**

1. 抽出 `adapter-shared.ts`
   - `getProviderBackedRunInput`
   - `getProviderCode`
   - `getEndpointModelKey`
   - `getPrompt`
   - `getModelKind`
   - `buildRunTransportMetadata`
   - `buildProviderNotConfiguredFailure`
2. 抽出 `ark.ts`
   - Ark submit / poll / callback
   - Ark video state / task id 推断
3. 抽出 `platou.ts`
   - Platou submit / poll / callback
   - Platou video state / task id 推断
4. 抽出 `mock-proxy.ts` 与 `official.ts`
5. 将 `resolveProviderAdapter(...)` 收口到 `adapter-resolution.ts`
6. 保留 `apps/api/src/lib/provider-adapters.ts` 作为薄兼容入口，或直接迁移调用点

**验收：**

- `pnpm typecheck:api`
- `pnpm --filter @aiv/api test:unit`
- `provider-adapters.test.ts` 继续通过

---

### Phase G：合并 Provider catalog 真正实现

**目标：** 让 `lib/provider/catalog/model-catalog.ts` 不只是 facade，而是成为 catalog 逻辑的真正中心。

**当前问题：**

- 统一入口已存在，但核心逻辑仍散在：
  - `ark-model-catalog.ts`
  - `platou-model-catalog.ts`
- 当前属于“入口统一了，实现没统一”

**建议目标结构：**

```text
apps/api/src/lib/provider/catalog/
  model-catalog.ts
  ark-parser.ts
  platou-parser.ts
  sync-service.ts
```

**执行步骤：**

1. 把 provider-agnostic 类型和通用 sync 逻辑移入 `provider/catalog/`
2. 把 Ark / Platou 的 payload 解析拆成 provider-specific parser
3. 把 `syncArkModelCatalog(...)` / `syncPlatouModelCatalog(...)` 的共通写库逻辑提到 `sync-service.ts`
4. 保留 provider-specific 差异在 parser 或 definition 层
5. 让 `provider-config-catalog-service.ts` 只依赖 `provider/catalog/model-catalog.ts`

**验收：**

- `pnpm typecheck:api`
- `pnpm --filter @aiv/api test:unit`
- Ark / Platou catalog 相关测试全部通过

---

### Phase H：拆分 Creation feature

**目标：** 将 Creation 从“当前最落后的前端主模块”提升到接近 Planner 当前的结构水位。

**当前状态：**

```text
apps/web/src/features/creation/
  总计约 6,667 行

热点文件：
- use-creation-workspace.ts            810
- creation-visual-sidebar.tsx          750
- creation-dialogs.tsx                 647
- creation-canvas-editor.tsx           532
- creation-state.ts                    517
```

**执行原则：**

- 优先拆状态 ownership，不先拆视觉组件
- 优先把 data/runtime/orchestration 从 UI 中拉出
- 沿用 Planner 已验证的做法：纯函数、状态 hook、薄 page/container

**建议执行顺序：**

1. 拆 `use-creation-workspace.ts`
   - runtime data
   - selection / editor state
   - mutation actions
   - timeline/canvas 相关 bridge
2. 拆 `creation-state.ts`
   - 保留纯状态派生
   - 把副作用和 IO 从 state 层拿掉
3. 拆 `creation-dialogs.tsx`
   - 按 dialog 类型分文件
4. 拆 `creation-visual-sidebar.tsx`
   - 抽纯展示子组件
   - 抽 sidebar action bridge
5. 视情况再处理 `creation-canvas-editor.tsx`

**验收：**

- `pnpm typecheck`
- `pnpm build`
- Creation 相关页面最少一轮手动 smoke

---

### Phase I：继续收口 Planner debug 执行链

**目标：** 继续把 Planner debug 从“还能工作的大模块”推进到职责明确的调试链路。

**当前问题：**

- route 仍有 `468` 行
- `debug/execution-service.ts` 仍有 `512` 行
- 当前已拆出 selection，但 compare / replay / execute 仍在同一文件

**执行步骤：**

1. 拆 `execution-service.ts`
   - `execute-service.ts`
   - `replay-service.ts`
   - `compare-service.ts`
   - `execution-shared.ts`
2. `planner-debug.ts` 路由仅保留：
   - schema
   - service 调用
   - reply mapping
3. 如有必要，把 route schema 再拆到独立 contract helper

**验收：**

- `pnpm typecheck:api`
- `pnpm --filter @aiv/api test:unit`
- debug route / service 测试持续通过

---

### Phase J：拆分 `conversation-finalizer.ts`

**目标：** 降低 conversation finalize 逻辑的认知负担，为后续 Planner 迭代留出可维护边界。

**当前问题：**

- 文件 `580` 行
- 只有两个 export，但内部 helper 较多
- 当前语义上同时包含：
  - message 创建
  - planner conversation finalize
  - structured doc / outline 结果落库桥接

**建议方向：**

```text
apps/api/src/lib/planner/orchestration/
  conversation-finalizer.ts
  conversation-message-service.ts
  conversation-persistence.ts
  conversation-finalizer-shared.ts
```

**验收：**

- `pnpm typecheck:api`
- `pnpm --filter @aiv/api test:unit`

---

### Phase K：拆分 Explore / Settings God Page

**目标：** 清理明显的大页面，但优先级低于 Provider / Creation / Planner debug。

**目标文件：**

- `explore-page.tsx` `974`
- `provider-config-page.tsx` `938`
- `catalog-management-page.tsx` `685`
- `planner-agent-debug-page.tsx` `983`

**执行原则：**

- 只做边界明确的拆分
- 不为目录整齐而重构
- 优先抽 presenter、page-state、action hooks

**验收：**

- `pnpm typecheck`
- `pnpm build`

---

## 5. 推荐执行顺序

```text
Phase F（provider-adapters）
  ↓
Phase G（provider catalog 真合并）
  ↓
Phase H（creation feature）
  ↓
Phase I（planner debug 执行链）
  ↓
Phase J（conversation-finalizer）
  ↓
Phase K（explore / settings / debug page）
```

说明：

- `F + G` 是同一条后端边界收口主线，优先级最高
- `H` 是前端主战场，收益大于继续雕 Planner 小尾巴
- `I` 放在 `H` 之后，是因为 Planner 主链路当前已可接受，debug 不是用户主路径
- `J + K` 都是重要但不阻塞主链路的收尾项

---

## 6. 验收口径

| Phase | 验收命令 | 额外验证 |
|-------|---------|---------|
| F | `pnpm typecheck:api` + `pnpm --filter @aiv/api test:unit` | provider adapter 测试通过 |
| G | `pnpm typecheck:api` + `pnpm --filter @aiv/api test:unit` | Ark / Platou catalog 测试通过 |
| H | `pnpm typecheck` + `pnpm build` | Creation 页面手动 smoke |
| I | `pnpm typecheck:api` + `pnpm --filter @aiv/api test:unit` | debug route/service 测试通过 |
| J | `pnpm typecheck:api` + `pnpm --filter @aiv/api test:unit` | finalize / conversation 相关测试通过 |
| K | `pnpm typecheck` + `pnpm build` | Explore / Settings 页面手动 smoke |

---

## 7. 非本阶段范围

以下事项暂不纳入本阶段：

| 事项 | 原因 |
|------|------|
| ARK AUDIO 真实接入 | 依赖外部接口可用性，不作为本阶段阻塞项 |
| 新数据模型设计（如 subShot / shotSegments） | 需求仍不稳定 |
| Admin 功能扩展 | 本阶段继续聚焦结构治理 |
| 大范围视觉改版 | 不在当前重构主链路内 |

---

## 8. 参考文档

- `docs/specs/refactor-next-phase-plan-v0.1.md`
- `docs/specs/backend-implementation-checklist-v0.3.md`
- `docs/specs/refactor-execution-guardrails-v0.1.md`
- `docs/specs/planner-phase-4-5-task-breakdown-v0.1.md`
