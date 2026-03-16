# 重构 Todo 总表（v0.1）

版本：v0.1
日期：2026-03-16
状态：现行执行视图（单表版）

## 1. 文档目的

本文把当前重构计划压平成一张表，服务于排期、分工和实际开工。

本文是以下文档的单表视图，不替代原始规格：

1. `docs/specs/backend-implementation-checklist-v0.3.md`
2. `docs/specs/phase-2-ai-refactor-task-breakdown-v0.1.md`
3. `docs/specs/planner-ai-capabilities-spec-v0.1.md`
4. `docs/specs/planner-phase-4-5-task-breakdown-v0.1.md`

说明：

1. 本表只列“待做事项”，不重复列已完成事项。
2. `状态` 当前默认以 `待开始` 为主；真正开工后可以按 `进行中 / 已完成 / 阻塞` 维护。
3. `文件范围` 只列主触点，不是完整清单。

## 2. 单表总览

| ID | 优先级 | 状态 | Phase | 任务 | 依赖 | 文件范围 | 验收标准 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-01 | P0 | 待开始 | 2 | `Run.inputJson` 类型化，统一 `parseRunInput / serializeRunInput` | 无 | `apps/api/src/lib/run-input.ts`, `apps/api/src/lib/provider-adapters.ts`, `apps/api/src/routes/*-commands.ts` | Run 创建和读取不再依赖字符串路径；脏数据会显式失败 |
| R-02 | P0 | 待开始 | 2 | 新建 `provider-gateway.ts`，同步业务调用统一入口 | R-01 | `apps/api/src/lib/provider-gateway.ts`, `apps/api/src/lib/provider-adapters.ts`, `apps/api/src/lib/catalog-subject-image.ts`, `apps/api/src/routes/provider-configs.ts` | 业务代码不再直连 `ark-client.ts` / `platou-client.ts` |
| R-03 | P0 | 待开始 | 2 | 删除 `generated.local`，生成结果先落本地文件存储再写 `Asset.sourceUrl` | R-01 | `apps/api/src/lib/asset-storage.ts`, `apps/api/src/lib/run-lifecycle.ts`, `apps/api/src/routes/assets.ts` | 图片/视频结果落本地；URL 缺失时明确失败 |
| R-04 | P0 | 待开始 | 2 | transport hooks 预埋，为 Phase 3 审计铺路 | R-02 | `apps/api/src/lib/transport-hooks.ts`, `apps/api/src/lib/ark-client.ts`, `apps/api/src/lib/platou-client.ts` | 所有外部调用都能经过统一 hook，默认 no-op 不回归 |
| R-05 | P0 | 待开始 | 2 | ARK 多能力接入预留，移除 `ark = text-only` 假设 | R-02 | `apps/api/scripts/seed-model-registry.ts`, `apps/api/src/routes/model-registry.ts`, `apps/api/src/routes/provider-configs.ts` | 注册表、gateway、provider test 都允许 ARK 后续接入 IMAGE / VIDEO / AUDIO |
| R-06 | P0 | 待开始 | 2 | Planner 版本链完整性修复，补 `sourceOutlineVersionId` | R-01 | `apps/api/prisma/schema.prisma`, `apps/api/src/lib/planner-orchestrator.ts`, `apps/api/src/routes/planner-refinement-versions.ts` | 任意 refinement 都能追到来源 outline |
| R-07 | P0 | 待开始 | 2 | Planner 衍生数据同步事务化，避免脏版本 | R-06 | `apps/api/src/lib/planner-orchestrator.ts`, `apps/api/src/lib/planner-refinement-projection.ts` | 不再出现“有 RefinementVersion 但无 Subject/Scene/Shot”的脏记录 |
| R-08 | P0 | 待开始 | 2 | `PlannerRerunScope` 类型化，统一为 `type + shotIds` | R-01 | `apps/api/src/lib/planner-rerun-scope.ts`, `apps/api/src/routes/planner-partial-reruns.ts`, `apps/api/src/lib/planner-orchestrator.ts` | rerun scope 具备编译期保护，支持单镜头与小批量镜头重跑 |
| R-09 | P0 | 待开始 | 2 | Planner 资产关联稳定性修复，优先按实体 ID 匹配 | R-07 | `apps/api/src/lib/planner-refinement-projection.ts`, `apps/api/src/lib/planner-orchestrator.ts` | 标题修改后已生成 asset 不丢失 |
| R-10 | P0 | 待开始 | 3 | 新增 `external_api_call_logs`，统一记录 request / response / latency / error | R-04 | `apps/api/prisma/schema.prisma`, `apps/api/src/lib/transport-hooks.ts`, `apps/api/src/lib/*-client.ts` | 任意外部调用都可追溯 provider / capability / trace / error |
| R-11 | P0 | 待开始 | 4 | 模型能力注册表结构化，落地 `VideoModelCapability` | R-05 | `apps/api/src/lib/model-capability.ts`, `apps/api/scripts/seed-model-registry.ts` | `getVideoModelCapability()` 返回稳定结构，字段缺失直接暴露 |
| R-12 | P0 | 待开始 | 4 | 新建 `shot-prompt-generator.ts`，支持多镜头/单镜头两种模式 | R-11, R-06 | `apps/api/src/lib/shot-prompt-generator.ts`, `apps/api/src/lib/planner-refinement-projection.ts` | `Seedance 2.0` 可输出多镜头 prompt，单镜头模型输出逐镜 prompt |
| R-13 | P0 | 待开始 | 4 | Planner refinement 注入目标模型上下文，写入 `targetModelFamilySlug` | R-11 | `apps/api/src/lib/planner-orchestrator.ts`, `apps/api/src/routes/planner-commands.ts`, `apps/api/src/lib/planner-agent-schemas.ts` | shot 原料开始体现景别词、运镜词、模型语境 |
| R-14 | P0 | 待开始 | 4 | 新增 `shot-prompts` 预览接口，切模型只重算预览不污染主版本 | R-12, R-13 | `apps/api/src/routes/planner-shot-prompts.ts`, `apps/web/src/features/planner/lib/planner-api.ts`, `apps/web/src/app/api/...` | 前端可按模型实时预览 prompt，且不创建新版本 |
| R-15 | P0 | 待开始 | 5 | 已确认版本创建草稿副本，禁止直接 patch 已确认版本 | R-06 | `apps/api/src/routes/planner-refinement-versions.ts`, `apps/web/src/features/planner/lib/planner-api.ts`, `apps/web/src/features/planner/components/planner-page.tsx` | 已确认版本继续修改时，系统先创建草稿副本再编辑 |
| R-16 | P0 | 待开始 | 5 | 新增 `planner/finalize`，打通 Planner -> Creation 正式交接 | R-12, R-13, R-15 | `apps/api/src/routes/planner-finalize.ts`, Creation workspace 查询与 presenter | finalize 后 Creation 直接拿到 Shot、prompt、目标模型、草稿图 |
| R-17 | P1 | 待开始 | 5 | SSE 实时步骤推送 | R-13 | `apps/api/src/routes/planner-stream.ts`, `apps/api/src/lib/planner-orchestrator.ts`, `apps/web/src/features/planner/hooks/use-planner-stream.ts` | Planner 生成过程可实时展示步骤，断线可恢复 |
| R-18 | P1 | 待开始 | 5 | shot 级精细化重跑 | R-08, R-13 | `apps/api/src/routes/planner-partial-reruns.ts`, `apps/api/src/lib/planner-orchestrator.ts`, `apps/web/src/features/planner/hooks/use-planner-refinement.ts` | 任意 shot 可单独重跑，其他 shot 不被污染 |
| R-19 | P1 | 待开始 | 5 | Planner 前端整合与组件拆分，避免继续膨胀 `planner-page.tsx` | R-14, R-15, R-16, R-17, R-18 | `apps/web/src/features/planner/components/planner-page.tsx`, 拆分子组件与 hooks | Planner 可完整走通：生成 -> 预览 -> 重跑 -> finalize，且主组件不继续失控 |
| R-20 | P1 | 待开始 | 5 | Creation 侧消费 finalize 交接结果，去掉用户手工搬运 | R-16 | `apps/web/src/features/creation/lib/creation-api.server.ts`, Creation workspace presenter | Creation 初始数据来自 finalize，而非用户手填 |
| R-21 | P1 | 待开始 | 6 | API 分层重构，route 只保留协议转换 | R-02, R-16 | `apps/api/src/routes/*.ts`, 对应 service / orchestrator seam | route 文件明显变薄，业务编排下沉 |
| R-22 | P1 | 待开始 | 7 | 前后端工作区 DTO 冻结，清理 `StudioFixture` 真实路径依赖 | R-21 | `apps/web/src/features/planner/lib/planner-api.server.ts`, `apps/web/src/features/creation/lib/creation-api.server.ts`, `packages/domain` | Planner / Creation / Publish 真页面不再依赖 `createRuntimeStudioFixture()` |
| R-23 | P2 | 待开始 | 1/持续 | 文档交叉引用与专项文档层级持续收口 | 无 | `docs/index/master-index-v0.4.md`, `docs/specs/*.md`, `docs/reviews/*.md` | 入口清晰，无旧口径冲突，无失效引用 |

## 3. 使用方式

建议实际推进时按下面方法用这张表：

1. 把 `P0` 作为当前主战场。
2. `R-01` 到 `R-09` 完成后，再进入 Planner 的 `R-11` 到 `R-20`。
3. `R-17`、`R-18`、`R-19` 不要早于 `R-16`。
4. `R-21`、`R-22` 放在核心业务闭环稳定之后做。

## 4. 说明

如果后面要再压得更像项目管理工具，可以继续从这张表派生出：

1. “按人分工版”
2. “按提交序列版”
3. “按周排期版”
