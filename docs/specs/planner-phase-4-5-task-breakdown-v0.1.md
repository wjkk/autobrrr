# Planner Phase 4/5 实施任务拆解（v0.1）

版本：v0.1
日期：2026-03-16
状态：现行执行拆解（Planner 专项）

> 路由口径说明（2026-03-21）：
> - Next.js Web 代理对外路径使用 `/api/planner/projects/:projectId/*`、`/api/creation/projects/:projectId/*`、`/api/publish/projects/:projectId/*`
> - Fastify 后端实现路径使用 `/api/projects/:projectId/planner/*`、`/api/projects/:projectId/creation/*`、`/api/projects/:projectId/publish/*`
> - 本文若未特别说明，默认使用后端实现路径


## 1. 文档目的

本文把 `Phase 4：模型感知分镜提示词生成` 和 `Phase 5：Planner 体验升级` 拆成可执行任务树，目标是回答四件事：

1. 先改哪些文件。
2. 每个文件的职责边界是什么。
3. 哪些任务可以并行，哪些必须串行。
4. 每一批改动做完后如何验证。

本文不替代：

1. `docs/specs/backend-implementation-checklist-v0.3.md`
2. `docs/specs/planner-ai-capabilities-spec-v0.1.md`
3. `docs/specs/ai-refactor-architecture-spec-v0.1.md`

若三者冲突，以 `checklist` 和 `planner-ai-capabilities-spec` 为准。

## 2. 范围与前置条件

### 2.1 本文覆盖范围

本文只覆盖 Planner 相关的 Phase 4/5：

1. `model-capability.ts`
2. `shot-prompt-generator.ts`
3. Planner refinement 的目标模型注入
4. `shot-prompts` 预览接口
5. Planner SSE 步骤推送
6. shot 级精细化重跑
7. `planner/finalize`
8. Planner -> Creation 交接

### 2.2 不在本文内的内容

以下内容不在本文范围：

1. Phase 2 的 gateway / run input / storage / transport hooks
2. Phase 3 的 `external_api_call_logs`
3. Phase 6 的 route/service 分层大整理
4. Phase 7 的前端正式 DTO 清理
5. `subShot` / `shotSegments` 新数据模型

### 2.3 前置条件

启动本文任务前，应满足：

1. Phase 2 已完成或至少完成对 Planner 有直接依赖的部分
2. `provider-gateway.ts` 已成为同步 AI 调用统一入口
3. `run.inputJson` 类型化骨架已就绪
4. Planner 现有版本链、partial rerun、workspace 查询仍然可用

## 3. 当前代码触点

当前最重要的代码触点如下：

### 后端

1. `apps/api/src/lib/planner-orchestrator.ts`
2. `apps/api/src/lib/planner-agent-schemas.ts`
3. `apps/api/src/lib/planner-refinement-projection.ts`
4. `apps/api/src/routes/planner-commands.ts`
5. `apps/api/src/routes/planner-partial-reruns.ts`
6. `apps/api/src/routes/workspaces.ts`
7. `apps/api/src/server.ts`
8. `apps/api/prisma/schema.prisma`

### 前端

1. `apps/web/src/features/planner/components/planner-page.tsx`
2. `apps/web/src/features/planner/lib/planner-api.ts`
3. `apps/web/src/features/planner/hooks/use-planner-refinement.ts`
4. `apps/web/src/app/api/planner/projects/[projectId]/partial-rerun/route.ts`

### 预计新增文件

1. `apps/api/src/lib/model-capability.ts`
2. `apps/api/src/lib/shot-prompt-generator.ts`
3. `apps/api/src/routes/planner-shot-prompts.ts`
4. `apps/api/src/routes/planner-stream.ts`
5. `apps/api/src/routes/planner-finalize.ts`
6. 前端对应的 proxy route 与轻量 presenter / hook 文件

## 4. 总体实施顺序

建议严格按下面顺序推进：

1. 数据模型与 schema 补强
2. 后端服务层：模型能力与 prompt 生成
3. Planner orchestrator 注入目标模型上下文
4. `shot-prompts` 预览接口
5. `planner/finalize`
6. SSE 实时步骤推送
7. shot 级精细化重跑
8. 前端 Planner 页整合
9. Creation 侧读取 finalize 结果
10. smoke / 文档 / 回归

原因：

1. 若不先补 schema，后面的服务层无法有稳定输入输出。
2. 若不先有 prompt 生成服务，`finalize` 和预览接口都会反复返工。
3. SSE 和 shot 级重跑属于体验升级，必须建立在正式业务边界已稳定的前提上。

## 5. 工作流 A：数据模型与 schema 补强

### 目标

让 Planner 文档字段和版本链足以支撑模型感知 prompt 生成与正式交接。

### 主要文件

1. `apps/api/prisma/schema.prisma`
2. `apps/api/src/lib/planner-agent-schemas.ts`
3. `apps/api/src/lib/planner-refinement-projection.ts`
4. `docs/specs/planner-ai-capabilities-spec-v0.1.md`

### 需要落地的字段

#### `PlannerRefinementVersion`

1. `sourceOutlineVersionId`
2. `promptSnapshotJson?`

#### `PlannerShotScript`

1. `durationSeconds?`
2. `soundDesign?`
3. `targetModelFamilySlug?`

说明：

1. `durationSeconds` 和 `soundDesign` 是 Planner 新增的生产原料字段。
2. `targetModelFamilySlug` 用于记录当前 Refinement 产出时针对的目标模型语境。

### 完成标准

1. Prisma schema 可表达上述字段
2. `planner-agent-schemas.ts` 能校验新字段
3. workspace 查询可返回这些字段
4. 历史数据兼容 nullable，不在第一步就强制非空
5. `storyboardConfig` 仍作为右侧文档视图中的投影对象，不在此工作流新增独立持久化 blob

### 本工作流不做什么

1. 不引入 `subShot`
2. 不在这一步写 `promptJson`
3. 不在这一步改前端 UI

## 6. 工作流 B：模型能力查询服务

### 目标

提供稳定、类型化的视频模型能力读取入口，供 Planner agent 和 prompt generator 共用。

### 主要文件

1. `apps/api/src/lib/model-capability.ts`（新建）
2. `apps/api/scripts/seed-model-registry.ts`
3. 相关 `model_families.capabilityJson` 读取位置

### 需要实现的能力

1. `getVideoModelCapability(familySlug)`
2. `summarizeVideoModelCapabilityForPlanner(familySlug)`

建议输出字段：

1. `supportsMultiShot`
2. `maxShotsPerGeneration`
3. `promptStyle`
4. `audioDescStyle`
5. `cameraVocab`
6. `timestampMeaning`

### 完成标准

1. `familySlug` 无效时给出明确错误
2. 所有 Planner 会用到的视频 family 都有结构化能力数据
3. Planner 注入 prompt 不再写死模型名判断

### 本工作流不做什么

1. 不直接生成 shot prompt
2. 不改 run-worker
3. 不改前端模型选择 UI

## 7. 工作流 C：分镜提示词生成服务

### 目标

实现 `shot-prompt-generator.ts`，把 PlannerShotScript 转成模型专属 prompt 结果。

### 主要文件

1. `apps/api/src/lib/shot-prompt-generator.ts`（新建）
2. `apps/api/src/lib/model-capability.ts`
3. `apps/api/src/lib/planner-refinement-projection.ts`

### 需要实现的核心函数

1. `generateShotPrompts(args)`
2. `groupShotsForMultiShotModel(args)`
3. `formatPromptForNarrativeModel(args)`
4. `formatPromptForSingleShotModel(args)`

### 输出结构建议

```ts
interface ShotPromptOutput {
  groupId: string;
  modelFamilySlug: string;
  shotIds: string[];
  actId: string;
  mode: 'multi-shot' | 'single-shot';
  promptText: string;
  promptPayload?: Record<string, unknown>;
}
```

### 关键规则

1. `supportsMultiShot = true` 时，允许多 shot 合并
2. `supportsMultiShot = true` 时，单 shot 也允许生成内部带镜头切换的 prompt
3. `audioDescStyle = inline` 时，`soundDesign` 要被吸收到 prompt 中
4. `cameraVocab = english-cinematic` 时，需把运镜词转成英文电影术语

### 完成标准

1. 对 `Seedance 2.0` 能输出多镜头叙事 prompt
2. 对单镜头模型能输出逐镜 prompt
3. 相同 ShotScript 可切模型重格式化，无需重跑 Planner

### 本工作流不做什么

1. 不写 API 路由
2. 不直接写入 `Shot.promptJson`
3. 不处理前端展示

## 8. 工作流 D：Planner orchestrator 模型感知注入

### 目标

让 Refinement 阶段的 agent 生成“更适合目标视频模型”的 shot 原料，而不是通用描述。

### 主要文件

1. `apps/api/src/lib/planner-orchestrator.ts`
2. `apps/api/src/lib/planner-agent-schemas.ts`
3. `apps/api/src/routes/planner-commands.ts`

### 具体任务

1. 从项目配置或请求上下文读取 `targetVideoModelFamilySlug`
2. 在 refinement 阶段构造 system prompt 时注入模型能力摘要
3. 将 `targetModelFamilySlug` 写入 `PlannerShotScript`
4. 将相关快照写入 `promptSnapshotJson`

### 明确边界

1. 本轮以 refinement 为主场注入模型能力
2. outline 阶段不强制注入视频模型能力
3. 若用户只切换模型做 prompt 预览，不反向改写当前 `RefinementVersion`

### 完成标准

1. agent 输出的 shot 原料明显包含景别词、运镜词和更明确的镜头推进
2. workspace 查询可看到 `targetModelFamilySlug`
3. debug/replay 能回溯注入前后的 prompt 快照

## 9. 工作流 E：`shot-prompts` 预览接口

### 目标

提供不污染主版本的模型切换与 prompt 预览能力。

### 主要文件

1. `apps/api/src/routes/planner-shot-prompts.ts`（新建）
2. `apps/api/src/server.ts`
3. `apps/web/src/app/api/...` 对应 proxy route（新建）
4. `apps/web/src/features/planner/lib/planner-api.ts`
5. `apps/web/src/features/planner/components/planner-shot-prompt-preview.tsx`

### 接口

1. `GET /api/projects/:projectId/planner/shot-prompts?episodeId=...&modelSlug=...`

### 规则

1. 默认读取当前 active refinement
2. 默认模型取项目当前目标视频模型
3. 切 `modelSlug` 只重算预览，不创建新版本
4. Planner 前端应展示真实视频模型 family，而不是继续使用静态占位模型 id

### 完成标准

1. 前端可在 Planner 内切换模型实时查看 prompt 预览
2. 接口结果包含 `shotIds` 与合并后的 group 信息
3. 失败时能明确告知是“没有 active refinement”还是“模型能力缺失”

## 10. 工作流 F：`planner/finalize`

### 目标

明确“策划完成”的正式动作，并把 Planner 结果推送到 Creation。

### 主要文件

1. `apps/api/src/routes/planner-finalize.ts`（新建）
2. `apps/api/src/server.ts`
3. `apps/api/src/lib/shot-prompt-generator.ts`
4. `apps/api/src/routes/workspaces.ts`
5. Creation 侧相关 query / projection 文件

### `finalize` 至少要完成的动作

1. 将当前 `activeRefinement` 标记为 `isConfirmed = true`
2. 调用 `shot-prompt-generator.ts`
3. 将结果写入 Creation 可消费的 `Shot.promptJson`
4. 写入 `Shot.targetVideoModelFamilySlug`
5. 将 `PlannerSubject.generatedAssetIds` 绑定到对应 Shot 的材料引用
6. 保留 `refinementVersionId -> shot` 的追踪关系

### 需要特别防止的问题

1. 重复 finalize 的幂等性
2. Shot 重建导致用户已生成素材丢失
3. 切换模型后二次 finalize 如何覆盖或派生

### 完成标准

1. `planner/finalize` 幂等可重试
2. finalize 后 Creation workspace 立刻可读
3. 用户不再需要手工搬运角色图、场景图、台词和 prompt

## 11. 工作流 G：Planner SSE 实时步骤推送

### 目标

把 Planner 生成过程从“完成后一次性展示 stepAnalysis”改成实时可见过程。

### 主要文件

1. `apps/api/src/routes/planner-stream.ts`（新建）
2. `apps/api/src/lib/planner-orchestrator.ts`
3. `apps/web/src/features/planner/components/planner-page.tsx`
4. 建议新增：
   - `apps/web/src/features/planner/hooks/use-planner-stream.ts`
   - `apps/web/src/features/planner/lib/planner-stream-events.ts`

### 事件建议

1. `step_started`
2. `step_done`
3. `generation_done`
4. `generation_failed`

### 技术要求

1. SSE 只承担过程事件，不承担最终完整文档
2. 文档仍以 workspace / version 查询为准
3. 连接中断后允许前端回退到轮询最新版本

### 完成标准

1. 生成中步骤能实时推进
2. 生成完成后自动刷新到新版本
3. 连接中断不导致 Planner 主流程不可用

## 12. 工作流 H：shot 级精细化重跑

### 目标

在当前 partial rerun 基础上，把粒度细化到单个 shot。

### 主要文件

1. `apps/api/src/routes/planner-partial-reruns.ts`
2. `apps/api/src/lib/planner-orchestrator.ts`
3. `apps/web/src/features/planner/components/planner-page.tsx`
4. `apps/web/src/features/planner/hooks/use-planner-refinement.ts`

### 需要落地的内容

1. `PlannerRerunScope` 统一为判别联合
2. 支持：
   - `{ type: 'subjects_only' }`
   - `{ type: 'scenes_only' }`
   - `{ type: 'shots_only' }`
   - `{ type: 'shot', shotIds: [...] }`
   - `{ type: 'act', actId: ... }`
3. 对单 shot 重跑时，把前后镜头、当前幕、角色、场景、目标模型能力一并带入

### 规则

1. 重跑仍产生新的 `RefinementVersion`
2. 未命中的区块尽可能复用旧版本
3. 左侧要明确显示“仅重跑哪些镜头”
4. `subjects_only / scenes_only / shots_only` 作为迁移期兼容变体保留；实体级 `subject / scene / act / shot` 是后续主实现方向

### 完成标准

1. 可对任意 shot 发起单独重跑
2. 其他 shot 不应被意外覆盖
3. 重跑后仍能生成正确 prompt 预览

## 13. 工作流 I：已确认版本创建草稿副本

### 目标

在 Planner 版本链中正式支持“已确认版本 -> 新草稿副本”的继续编辑路径，避免直接改写已确认版本。

### 主要文件

1. `apps/api/src/routes/planner-refinement-versions.ts`
2. 可能新增：`apps/api/src/routes/planner-refinement-drafts.ts`
3. `apps/web/src/features/planner/components/planner-page.tsx`
4. `apps/web/src/features/planner/lib/planner-api.ts`

### 需要落地的内容

1. 为已确认 `RefinementVersion` 提供“创建草稿副本”动作
2. 新副本保留来源版本关联
3. 前端在已确认版本上点击继续修改、AI 重跑或局部 patch 前，先触发草稿副本创建

### 完成标准

1. 已确认版本不能继续原地 patch
2. 草稿副本创建后，后续变更都落在新副本
3. 源确认版本仍可回看、可追踪、不可被污染
4. 草稿副本中的 `subject / scene / shot` 拥有新的实体 ID 与 `entityKey`，后续 document save 不会与源版本发生主键冲突

## 14. 工作流 J：前端 Planner 页整合

### 目标

把新增的后端能力接入现有 Planner UI，同时避免继续把复杂度堆进单个巨大组件文件。当前该工作流已完成当前阶段目标。

### 主要文件

1. `apps/web/src/features/planner/components/planner-page.tsx`
2. `apps/web/src/features/planner/lib/planner-api.ts`
3. 建议新增或拆分：
   - `apps/web/src/features/planner/components/planner-timeline.tsx`
   - `apps/web/src/features/planner/components/planner-document-receipt.tsx`
   - `apps/web/src/features/planner/components/planner-shot-prompt-preview.tsx`
   - `apps/web/src/features/planner/components/planner-finalize-bar.tsx`
   - `apps/web/src/features/planner/hooks/use-planner-stream.ts`

### 必做改动

1. 展示新的左侧消息类型与 document receipt
2. 增加模型切换下的 shot prompt 预览
3. 增加“确认策划，进入创作”按钮与 finalize 成功态
4. 增加 shot 级重跑入口
5. 增加“从已确认版本创建草稿副本”的继续修改入口
6. 接入 SSE 进度

### 工程要求

1. 若继续改 `planner-page.tsx`，必须同步做组件拆分
2. 不允许把 SSE、finalize、shot prompt 预览都继续塞进一个文件里

### 完成标准

1. Planner 页能完整走通：生成 -> 预览 -> 重跑 -> finalize
2. 已确认版本上继续修改时，前端先创建草稿副本再进入编辑
3. 关键新能力由独立组件/Hook 承担，不继续加剧单文件膨胀
4. “进入创作”主行为已做真实浏览器回归：同模型直接进入创作，切模型重新 finalize 后进入创作

## 15. 工作流 K：Creation 侧交接消费

### 目标

让 Creation 真正消费 finalize 后的数据，而不是继续依赖用户手填。

### 主要文件

1. Creation workspace 查询相关 route / projection
2. `apps/web/src/features/creation/lib/creation-api.server.ts`
3. Creation 页面对应 workspace presenter

### 必做改动

1. 读取 finalize 后的 `Shot.promptJson`
2. 读取 `Shot.targetVideoModelFamilySlug`
3. 读取绑定的主体草稿图 / 场景草稿图

### 完成标准

1. Creation 初始数据来自 finalize 交接结果
2. Planner 与 Creation 在目标模型和草稿图上不再断链

## 16. 推荐提交序列

建议按下面 7 个提交推进：

1. `schema + planner shot fields + refinement version lineage`
2. `model-capability.ts + registry wiring`
3. `shot-prompt-generator.ts + planner orchestrator target-model injection`
4. `planner shot-prompts api + web preview wiring`
5. `planner draft-from-confirmed api + web draft handoff`
6. `planner finalize api + creation handoff`
7. `planner sse stream + shot-level rerun + ui cleanup + smoke`

## 17. 最小验证矩阵

### 后端

1. Prisma migration 可执行
2. workspace 查询能返回新增字段
3. `shot-prompts` 接口对多模型可用
4. 已确认版本创建草稿副本后，源版本不被污染
5. `planner/finalize` 幂等可重试
6. shot 级 rerun 不污染其他 shot

### 前端

1. Planner 可查看 prompt 预览
2. 切模型只刷新预览，不污染主版本
3. 已确认版本继续修改时，前端先创建草稿副本
4. SSE 中断后页面可恢复
5. finalize 后可进入 Creation

### 产品回归

1. 单集项目可完整走通
2. 多集项目可切换 episode 独立策划
3. `Seedance 2.0` 可生成多镜头 prompt
4. 单镜头模型可生成逐镜 prompt

## 18. 本文明确不建议的实现方式

1. 先把 `planner-page.tsx` 继续堆大，再考虑拆分。  
   错。当前文件已经过大，新增能力必须伴随拆分。

2. 为了支持 `Seedance 2.0`，先引入 `subShot` 表。  
   错。本轮先走 prompt 层，不先扩展 shot 内部结构。

3. 为了做模型切换预览，每切一次模型就创建新的 `RefinementVersion`。  
   错。只有请求 AI 重写原料时才创建新版本。

4. 先做 SSE，再补 `finalize`。  
   错。SSE 是体验层，`finalize` 是业务闭环，优先级更高。

## 19. 下一阶段开发优先级与任务表（2026-03-18）

### 19.1 背景

在进入下一阶段功能开发前，以下基础约束已完成：

1. Planner refinement `subjects / scenes` 已支持显式 `entityType`
2. 后端已将实体分类收敛为“模型声明 + 语义校验”双保险
3. Outline 阶段已补轻量实体约束，减少 refinement 首次生成时的纠偏成本
4. API parser / projection / Web structured-doc adapter / 聚焦单测 / typecheck 已完成对齐

因此，当前已适合从“修协议”转入“基于稳定实体语义的新功能开发”。

### 19.2 推荐推进顺序

1. 实体级局部重跑主路径化
2. outline -> refinement 结构继承加强
3. 基于实体类型的素材推荐 / 自动补全
4. shot `subjectBindings` 精细化
5. planner debug 实体约束可视化
6. 实体稳定键策略

### 19.3 可执行任务表

| ID | 优先级 | 任务 | 主要改动点 | 完成标准 |
| --- | --- | --- | --- | --- |
| R1 | P0 | 收敛 partial rerun scope，统一以 `subject / scene / shot / act` 为主语义 | `apps/api/src/lib/planner-rerun-scope.ts` `apps/api/src/lib/planner-rerun-service.ts` | 新入口默认走实体级 scope；旧 `*_only` 仅保留兼容层 |
| R2 | P0 | 统一目标实体解析与 clone 逻辑 | `apps/api/src/lib/planner-rerun-service.ts` | 对 `subject / scene / shot / act` 的目标解析走单一路径，无重复分支 |
| R3 | P0 | scoped rerun prompt 注入实体上下文，而不是整包重跑语境 | `apps/api/src/lib/planner-prompt-builder.ts` `apps/api/src/lib/planner-rerun-service.ts` | 改一个主体时，只重写该主体相关内容；无关内容不漂移 |
| R4 | P0 | 前端把局部重跑升级为主交互路径 | `apps/web/src/features/planner/hooks/use-planner-refinement.ts` `apps/web/src/features/planner/components/planner-page.tsx` | 用户可从主体/场景/分镜直接触发局部重跑 |
| R5 | P0 | 补 API / Web 单测与 focused smoke | `apps/api/src/lib/planner-rerun-service.test.ts` `apps/api/src/lib/planner-refinement-partial.test.ts` | 覆盖实体级 scope、target miss、diff merge、不误改无关区域 |
| O1 | P0 | 定义 outline -> refinement 的中间提示结构，不扩主 schema | `apps/api/src/lib/planner-outline-doc.ts` `apps/api/src/lib/planner-prompt-builder.ts` | 有稳定 adapter，输出角色 / 空间 / 结构 hints |
| O2 | P0 | 从 outline 提取 `characterHints / locationHints / structureHints` | `apps/api/src/lib/planner-prompt-builder.ts` | refinement 首次生成可显式继承大纲信息 |
| O3 | P1 | 将 outline hints 注入 refinement prompt 与 run snapshot | `apps/api/src/lib/planner-run-service.ts` | debug / run input 可看到 outline-derived hints |
| O4 | P1 | 前端 outline preview 与 refinement seed 对齐 | `apps/web/src/features/planner/lib/planner-structured-doc.ts` | outline 确认进入 refinement 后，角色 / 空间漂移明显下降 |
| O5 | P1 | 补 adapter 单测 | `apps/api/src/lib/planner-orchestrator.test.ts` `apps/web/src/features/planner/lib/planner-structured-doc.test.ts` | 锁住三类 hints 的提取与注入 |
| M1 | P1 | 定义实体素材推荐 contract | `apps/api/src/lib/planner-refinement-entity-service.ts` `apps/api/src/lib/planner-media-generation-service.ts` | `subject / scene` 推荐接口 shape 稳定 |
| M2 | P1 | 主体素材推荐 | 同上 | 可为 `subject` 返回候选参考素材或 prompt seed |
| M3 | P1 | 场景素材推荐 | 同上 | 可为 `scene` 返回候选空间素材或 prompt seed |
| M4 | P1 | 前端推荐入口与一键应用 | `apps/web/src/features/planner/hooks/use-planner-asset-actions.ts` `apps/web/src/features/planner/components/planner-asset-dialog.tsx` | 推荐结果可应用到当前实体，不污染其他实体 |
| M5 | P1 | 推荐链路测试 | API service tests + Web hook tests | 覆盖 `subject / scene` 类型分流、空结果、重复去重 |
| B1 | P1 | 定义 shot 级主体绑定推断规则 | `apps/api/src/lib/planner-refinement-sync.ts` | 不再默认把全部 subjects 绑定到每个 shot |
| B2 | P1 | 基于 shot 文本和实体名推断 `subjectBindings` | `apps/api/src/lib/planner-refinement-sync.ts` | 每个 shot 绑定更接近真实出现主体 |
| B3 | P1 | projection 回建保留绑定一致性 | `apps/api/src/lib/planner-refinement-projection.ts` | save -> projection -> workspace 不丢绑定 |
| B4 | P1 | 为局部编辑补绑定回归测试 | `apps/api/src/lib/planner-refinement-sync.test.ts` | 改一个 shot 不会把绑定全部重置 |
| D1 | P2 | debug payload 暴露 `raw / normalized / final` 三层视图 | `apps/api/src/lib/planner-debug-shared.ts` `apps/api/src/lib/planner-debug-execution-service.ts` | 能看见模型原始声明、归一化结果、最终结构 |
| D2 | P2 | debug UI 展示实体纠偏结果 | `apps/web/src/features/planner-debug/components/planner-debug-result-view.tsx` | 一眼能看出 `subject / scene` 被如何纠偏 |
| D3 | P2 | debug compare 增加实体差异聚合 | `apps/web/src/features/planner-debug/lib/planner-debug-presenters.ts` | compare 页面可聚合展示实体变化 |
| K1 | P2 | 定义实体稳定键策略，优先 ID，其次语义指纹 | `apps/api/src/lib/planner-refinement-sync.ts` `apps/api/src/lib/planner-refinement-drafts.ts` | 改标题不轻易丢资产继承 |
| K2 | P2 | 引入 subject / scene 语义 fingerprint | 同上 | 同名改写、轻微文案变更仍能继承旧资产 |
| K3 | P2 | draft copy / projection / sync 三处统一策略 | `apps/api/src/lib/planner-refinement-drafts.ts` `apps/api/src/lib/planner-refinement-projection.ts` | 三条链路口径一致 |
| K4 | P2 | 补稳定键回归测试 | 对应 test 文件 | 锁住标题改写、轻微 prompt 变更、draft copy 三类场景 |

### 19.4 建议的开发批次

1. Batch A：`R1 R2 R3 O1 O2`
2. Batch B：`R4 R5 O3 O4 O5`
3. Batch C：`M1 M2 M3 M4 M5`
4. Batch D：`B1 B2 B3 B4`
5. Batch E：`D1 D2 D3 K1 K2 K3 K4`

### 19.5 今日最小可交付

若按“今天开工”的节奏推进，建议先完成：

1. `R1-R3`：实体级局部重跑的后端主路径
2. `O1-O2`：outline -> refinement hints adapter
3. `R4-R5`：前端入口、聚焦单测与 focused smoke

最小验收口径：

1. 用户可对单个 `subject / scene / shot / act` 发起局部重跑
2. 后端 prompt 只注入目标实体上下文
3. outline 确认进入 refinement 时，角色 / 关键空间 / 结构 hints 能稳定传递
4. API / Web 单测通过，`pnpm typecheck:api` 与 `pnpm typecheck` 通过
