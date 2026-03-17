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

1. 本表覆盖当前执行事项，包含 `待开始 / 进行中 / 已完成 / 搁置` 四类状态。
2. `状态` 应以当前实际落地情况维护，不再默认视为 `待开始`。
3. `文件范围` 只列主触点，不是完整清单。

## 2. 单表总览

| ID | 优先级 | 状态 | Phase | 任务 | 依赖 | 文件范围 | 验收标准 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-01 | P0 | 已完成 | 2 | `Run.inputJson` 类型化，统一 `parseRunInput / serializeRunInput` | 无 | `apps/api/src/lib/run-input.ts`, `apps/api/src/lib/provider-adapters.ts`, `apps/api/src/routes/*-commands.ts` | Run 创建和读取不再依赖字符串路径；脏数据会显式失败 |
| R-02 | P0 | 已完成 | 2 | 新建 `provider-gateway.ts`，同步业务调用统一入口 | R-01 | `apps/api/src/lib/provider-gateway.ts`, `apps/api/src/lib/provider-adapters.ts`, `apps/api/src/lib/catalog-subject-image.ts`, `apps/api/src/routes/provider-configs.ts` | 业务代码不再直连 `ark-client.ts` / `platou-client.ts` |
| R-03 | P0 | 已完成 | 2 | 删除 `generated.local`，生成结果先落本地文件存储再写 `Asset.sourceUrl` | R-01 | `apps/api/src/lib/asset-storage.ts`, `apps/api/src/lib/run-lifecycle.ts`, `apps/api/src/routes/assets.ts` | 图片/视频结果落本地；URL 缺失时明确失败 |
| R-04 | P0 | 已完成 | 2 | transport hooks 预埋，为 Phase 3 审计铺路 | R-02 | `apps/api/src/lib/transport-hooks.ts`, `apps/api/src/lib/ark-client.ts`, `apps/api/src/lib/platou-client.ts`, `apps/api/src/worker.ts`, `apps/api/src/server.ts` | 所有外部调用都能经过统一 hook，server / worker 均已自动安装 hook |
| R-05A | P0 | 已完成 | 2 | ARK 多能力架构预留，移除 `ark = text-only` 假设 | R-02 | `apps/api/scripts/seed-model-registry.ts`, `apps/api/src/routes/model-registry.ts`, `apps/api/src/routes/provider-configs.ts` | 注册表、gateway、provider test 都允许 ARK 后续接入 IMAGE / VIDEO / AUDIO |
| R-05B | P1 | 已完成 | 2/持续 | ARK IMAGE 真接入 | R-05A | `apps/api/src/lib/provider-gateway.ts`, `apps/api/src/lib/ark-client.ts`, `apps/api/src/routes/provider-configs.ts`, `apps/api/src/lib/catalog-subject-image.ts` | ARK 图片端点已接入 `POST /images/generations`；provider test 已用真实 Ark 配置通过，目录主体图与统一 gateway 均可走 Ark 图片链路 |
| R-05C | P1 | 已完成 | 2/持续 | ARK VIDEO 真接入 | R-05A | `apps/api/src/lib/provider-gateway.ts`, `apps/api/src/lib/ark-client.ts`, `apps/api/src/lib/provider-adapters.ts`, `apps/api/src/routes/provider-configs.ts`, `apps/api/src/lib/run-lifecycle.ts` | ARK 视频端点已接入 `POST /contents/generations/tasks` + poll 主链路；真实 submit/poll 与 `/api/provider-configs/ark/test { video }` 均已通过 |
| R-05D | P1 | 搁置 | 2/持续 | ARK AUDIO 真接入 | R-05A | `apps/api/src/lib/provider-gateway.ts`, `apps/api/src/lib/ark-client.ts`, `apps/api/src/lib/provider-config-test-service.ts`, `apps/api/src/routes/provider-configs.ts` | ARK 音频端点可被统一 gateway 调用并测试；当前代码路径已接通，但需等待 Ark 官方确认可用音频接口与可同步音频 endpoint 后再恢复推进 |
| R-06 | P0 | 已完成 | 2 | Planner 版本链完整性修复，补 `sourceOutlineVersionId` | R-01 | `apps/api/prisma/schema.prisma`, `apps/api/src/lib/planner-orchestrator.ts`, `apps/api/src/routes/planner-refinement-versions.ts`, `apps/api/src/routes/workspaces.ts` | 任意 refinement 都能追到来源 outline |
| R-07 | P0 | 已完成 | 2 | Planner 衍生数据同步事务化，避免脏版本 | R-06 | `apps/api/src/lib/planner-orchestrator.ts`, `apps/api/src/lib/planner-refinement-projection.ts`, `apps/api/src/routes/planner-document.ts`, `apps/api/src/routes/planner-refinement-entities.ts`, `apps/api/src/routes/planner-media-generation.ts`, `apps/api/scripts/smoke-planner-api-refactor.ts` | 不再出现“有 RefinementVersion 但无 Subject/Scene/Shot”的脏记录；document save、asset 回写、entity patch、version activate、planner media generation 回写均已通过 focused smoke |
| R-08 | P0 | 已完成 | 2 | `PlannerRerunScope` 类型化，统一为 `type + shotIds` | R-01 | `apps/api/src/lib/planner-rerun-scope.ts`, `apps/api/src/routes/planner-partial-reruns.ts`, `apps/api/src/lib/planner-orchestrator.ts`, `apps/web/src/features/planner/components/planner-page.tsx` | rerun scope 具备编译期保护，支持单镜头与小批量镜头重跑 |
| R-09 | P0 | 已完成 | 2 | Planner 资产关联稳定性修复，优先按实体 ID 匹配 | R-07 | `apps/api/src/lib/planner-refinement-projection.ts`, `apps/api/src/lib/planner-orchestrator.ts`, `apps/api/src/lib/planner-refinement-sync.ts`, `apps/web/src/features/planner/lib/planner-structured-doc.ts` | 标题修改后已生成 asset 不丢失 |
| R-10 | P0 | 已完成 | 3 | 新增 `external_api_call_logs`，统一记录 request / response / latency / error | R-04 | `apps/api/prisma/schema.prisma`, `apps/api/src/lib/external-api-call-logs.ts`, `apps/api/src/lib/transport-hooks.ts`, `apps/api/src/lib/*-client.ts`, `apps/api/scripts/smoke-external-api-call-logs.ts` | 任意外部调用都可追溯 provider / capability / trace / error；focused smoke 已覆盖 `emit hook -> 落库` |
| R-11 | P0 | 已完成 | 4 | 模型能力注册表结构化，落地 `VideoModelCapability` | R-05A | `apps/api/src/lib/model-capability.ts`, `apps/api/scripts/seed-model-registry.ts` | `getVideoModelCapability()` 返回稳定结构，字段缺失直接暴露 |
| R-12 | P0 | 已完成 | 4 | 新建 `shot-prompt-generator.ts`，支持多镜头/单镜头两种模式 | R-11, R-06 | `apps/api/src/lib/shot-prompt-generator.ts`, `apps/api/src/lib/planner-refinement-projection.ts` | `Seedance 2.0` 可输出多镜头 prompt，单镜头模型输出逐镜 prompt |
| R-13 | P0 | 已完成 | 4 | Planner refinement 注入目标模型上下文，写入 `targetModelFamilySlug` | R-11 | `apps/api/src/lib/planner-orchestrator.ts`, `apps/api/src/routes/planner-commands.ts`, `apps/api/src/lib/planner-target-video-model.ts`, `apps/api/src/lib/planner-refinement-sync.ts` | refinement prompt 会读取目标视频模型能力摘要；run input、structured doc、`PlannerShotScript`、workspace 已贯通 `targetModelFamilySlug` |
| R-14 | P0 | 已完成 | 4 | 新增 `shot-prompts` 预览接口，切模型只重算预览不污染主版本 | R-12, R-13 | `apps/api/src/routes/planner-shot-prompts.ts`, `apps/web/src/features/planner/lib/planner-api.ts`, `apps/web/src/features/planner/components/planner-shot-prompt-preview.tsx`, `apps/web/src/app/api/...` | 后端、web proxy、Planner 页模型切换预览均可用；切模型不污染主版本 |
| R-15 | P0 | 已完成 | 5 | 已确认版本创建草稿副本，禁止直接 patch 已确认版本 | R-06 | `apps/api/src/routes/planner-refinement-versions.ts`, `apps/api/src/lib/planner-refinement-drafts.ts`, `apps/web/src/features/planner/lib/planner-api.ts`, `apps/web/src/features/planner/components/planner-page.tsx` | 已确认版本继续修改时，系统先创建草稿副本再编辑；新副本拥有独立实体 ID / `entityKey`，不会污染源确认版本 |
| R-16 | P0 | 已完成 | 5 | 新增 `planner/finalize`，打通 Planner -> Creation 正式交接 | R-12, R-13, R-15 | `apps/api/src/routes/planner-finalize.ts`, `apps/api/src/lib/planner-finalize.ts`, Creation workspace 查询与 presenter | finalize 幂等可重试；Creation workspace 直接拿到 Shot、prompt、目标模型、草稿图绑定，并默认使用 finalize 写入的目标模型 |
| R-17 | P1 | 已完成 | 5 | SSE 实时步骤推送 | R-13 | `apps/api/src/routes/planner-stream.ts`, `apps/web/src/app/api/planner/projects/[projectId]/stream/route.ts`, `apps/web/src/features/planner/hooks/use-planner-stream.ts`, `apps/web/src/features/planner/components/planner-page.tsx` | Planner 生成过程可实时展示步骤；queued/running 阶段会先用 stepDefinitions 合成步骤流，完成后切到真实 `stepAnalysis` |
| R-18 | P1 | 已完成 | 5 | shot 级精细化重跑 | R-08, R-13 | `apps/api/src/routes/planner-partial-reruns.ts`, `apps/web/src/features/planner/lib/planner-api.ts`, `apps/web/src/features/planner/components/planner-page.tsx` | 前后端统一走 typed `rerunScope`；任意 shot 可单独重跑，act 级也可触发局部重排，其他 shot 不被污染 |
| R-19 | P1 | 已完成 | 5 | Planner 前端整合与组件拆分，避免继续膨胀 `planner-page.tsx` | R-14, R-15, R-16, R-17, R-18 | `apps/web/src/features/planner/components/planner-page.tsx`, `planner-page-header.tsx`, `planner-episode-rail.tsx`, `planner-script-acts.tsx`, `planner-thread-panel.tsx`, `planner-asset-dialog.tsx`, `planner-document-panel.tsx`, `planner-result-header.tsx`, `planner-delete-shot-dialog.tsx`, `planner-creation-boot-dialog.tsx`, `hooks/use-planner-runtime-workspace.ts`, `hooks/use-planner-run-submission.ts`, `hooks/use-planner-asset-drafts.ts`, `hooks/use-planner-asset-actions.ts`, `hooks/use-planner-document-persistence.ts`, `hooks/use-planner-composer-actions.ts`, `hooks/use-planner-shot-editor.ts`, `hooks/use-planner-shot-actions.ts`, `hooks/use-planner-shot-prompt-preview.ts`, `hooks/use-planner-creation-flow.ts`, `hooks/use-planner-display-state.ts`, `hooks/use-planner-dialog-display-state.ts`, `lib/planner-shot-editor.ts`, `lib/planner-api.ts`, `lib/planner-page-helpers.ts`, `components/planner-page-dialogs.tsx` | Planner 可完整走通：生成 -> 预览 -> 重跑 -> finalize；同模型可直接进入创作，切模型会重新 finalize 后进入创作；`planner-page.tsx` 已收敛到约 658 行 |
| R-20 | P1 | 已完成 | 5 | Creation 侧消费 finalize 交接结果，去掉用户手工搬运 | R-16 | `apps/web/src/features/creation/lib/creation-api.server.ts`, `apps/web/src/features/creation/lib/creation-api.ts`, Creation workspace presenter | Creation 首屏和运行时刷新统一消费 finalize 写入的 shot / prompt / target model / materialBindings，不再依赖用户手工搬运 |
| R-21 | P1 | 已完成 | 6 | API 分层重构，route 只保留协议转换 | R-02, R-16 | `apps/api/src/routes/*.ts`, `apps/api/src/lib/planner-run-service.ts`, `apps/api/src/lib/creation-run-service.ts`, `apps/api/src/lib/provider-config-query-service.ts`, `apps/api/src/lib/provider-config-catalog-service.ts`, `apps/api/src/lib/provider-config-test-service.ts`, `apps/api/src/lib/planner-debug-query-service.ts`, `apps/api/src/lib/planner-debug-execution-service.ts`, `apps/api/src/lib/planner-debug-shared.ts`, `apps/api/src/lib/planner-workspace-service.ts`, `apps/api/src/lib/creation-workspace-service.ts`, `apps/api/src/lib/publish-workspace-service.ts`, `apps/api/src/lib/planner-rerun-service.ts`, `apps/api/src/lib/planner-media-generation-service.ts`, `apps/api/src/lib/planner-refinement-entity-service.ts` | 核心 Planner / Creation / Provider / Workspace route 已显著变薄，业务编排下沉到 service seam；`pnpm typecheck:api`、`smoke:planner-refactor`、`smoke:planner-api-refactor` 均已通过 |
| R-22 | P1 | 已完成 | 7 | 前后端工作区 DTO 冻结，清理 `StudioFixture` 真实路径依赖 | R-21 | `apps/web/src/features/planner/lib/planner-api.server.ts`, `apps/web/src/features/creation/lib/creation-api.server.ts`, `apps/web/src/features/publish/lib/publish-api.server.ts`, `apps/web/src/features/planner/lib/planner-page-data.ts`, `apps/web/src/features/creation/lib/creation-page-data.ts`, `apps/web/src/features/publish/lib/publish-page-data.ts` | Planner / Creation / Publish 真页面已改为 feature-local page data / workspace view model；真实启动路径已不再依赖 `createRuntimeStudioFixture()` |
| R-23 | P2 | 已完成 | 1/持续 | 文档交叉引用与专项文档层级持续收口 | 无 | `docs/index/master-index-v0.4.md`, `docs/specs/*.md`, `docs/reviews/*.md` | 入口清晰，无旧口径冲突，无失效引用；主链路真实浏览器回归结果已回写文档 |

## 3. 使用方式

建议实际推进时按下面方法用这张表：

1. 把 `P0` 作为当前主战场。
2. `R-01` 到 `R-09` 完成后，再进入 Planner 的 `R-11` 到 `R-20`。
3. `R-17`、`R-18`、`R-19` 不要早于 `R-16`。
4. `R-21`、`R-22` 放在核心业务闭环稳定之后做。

## 4. 当前收口结论

本轮状态收口后，当前待办应按下面三类理解：

1. 实际已完成，但此前文档未及时收口：
   `R-06`、`R-08`、`R-09`、`R-11`、`R-12`
2. 仍在真正开发中，继续往后推进前不能长期悬而不决：
   暂无 P0 主项

3. 已拆成按 provider readiness 逐步推进的持续项：
   `R-05B`、`R-05D`

当前收口重点：

1. `R-19` 已完成：Planner 页已拆出 header、episode rail、thread panel、document panel、result header、dialogs，以及运行时/保存/提交/资产/分镜/prompt preview/creation flow 等 hooks；`planner-page.tsx` 已收敛到约 658 行，且浏览器回归已验证“同模型直接进入创作”和“切模型重新 finalize 后进入创作”两条路径
2. `R-07` 已完成：focused smoke 现已覆盖 document save、subject asset 回写后二次保存、shot entity patch、refinement activation、typed `rerunScope`、`shot-prompts`、以及 `planner-media-generation` 的 run 创建与回写投影同步
3. `R-04`、`R-10` 已完成：`external_api_call_logs` 已落地，transport hook 在 server / worker 双端自动安装，catalog / provider test / run submit / run poll / planner debug 都会进入统一审计账本，`smoke-external-api-call-logs.ts` 已验证 `emit hook -> 落库`
4. `R-05B` 已完成：ARK 图片能力已接入统一 gateway，并通过真实 `/api/provider-configs/ark/test { image }` 验证
5. `R-05C` 已完成：ARK 视频已接入统一 gateway、Run submit/poll 主链路与 `run-lifecycle` 输出 URL 提取，并通过真实 submit/poll 及 `/api/provider-configs/ark/test { video }` 验证
6. `R-21` 已完成：核心 AI/Planner route 已完成服务层下沉，`planner-commands.ts` 已从约 351 行收敛到约 94 行，`creation-commands.ts` 已从约 288 行收敛到约 171 行，`provider-configs.ts` 已从约 1014 行收敛到约 191 行，`planner-debug.ts` 已从约 1273 行收敛到约 423 行，`workspaces.ts` 已从约 792 行收敛到约 135 行，`planner-partial-reruns.ts` 已从约 468 行收敛到约 135 行，`planner-media-generation.ts` 已从约 503 行收敛到约 258 行，`planner-refinement-entities.ts` 已从约 613 行收敛到约 388 行；focused smoke 已覆盖新的 service seam，无回归
7. `R-22` 已完成：Planner / Creation / Publish 真实页面已改为 feature-local page data / workspace view model，`planner-api.server.ts`、`creation-api.server.ts`、`publish-api.server.ts` 不再通过 `createRuntimeStudioFixture()` 构造主工作区；`pnpm --filter @aiv/web typecheck` 已通过
8. `R-23` 已完成：主索引、执行序列、总表、Phase 7 迁移说明和 checklist 已同步当前实现状态；零散旧口径已收口，且 `Planner -> Creation -> Publish` 主链路真实浏览器回归已通过

关于 ARK：

1. `R-05A` 已完成，表示架构不再写死 `ark = text-only`
2. `R-05D` 当前为搁置态：gateway、client、provider test 已补上音频代码路径，但需等待 Ark 官方确认可用音频接口与可同步音频 endpoint
3. `R-05D` 不阻塞当前 Planner 主链路
4. 它们应按 provider endpoint readiness 逐项推进，而不是继续挂一个笼统的“R-05 进行中”
## 5. 说明

如果后面要再压得更像项目管理工具，可以继续从这张表派生出：

1. “按人分工版”
2. “按提交序列版”
3. “按周排期版”
