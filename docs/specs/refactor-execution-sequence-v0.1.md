# 重构执行序列（v0.1）

版本：v0.1
日期：2026-03-16
状态：现行执行序列

## 1. 文档目的

本文只回答一个问题：接下来我应该按什么顺序真正开工。

它不是新的规划文档，而是把现有总表和专项拆解压成“提交序列 + 每步验证 + 切换条件”。

配套基线：

1. `docs/specs/refactor-todo-flat-table-v0.1.md`
2. `docs/specs/phase-2-ai-refactor-task-breakdown-v0.1.md`
3. `docs/specs/planner-phase-4-5-task-breakdown-v0.1.md`
4. `docs/specs/refactor-execution-guardrails-v0.1.md`

## 2. 执行原则

### 2.1 只按依赖和闭环推进

不按工种拆，不按目录拆，只按：

1. 哪一步会卡住下一步
2. 哪一步做完能形成一个新的可用闭环
3. 哪一步可以独立验证

### 2.2 每一提交都必须可停

每个提交都要满足：

1. 类型检查可过
2. 主路径最小 smoke 可过
3. 出问题可以在当前提交内收敛，不需要靠后续提交“补回来”

### 2.3 体验层晚于闭环层

执行顺序固定：

1. 先做数据和边界
2. 再做 prompt 能力
3. 再做 Planner -> Creation 正式交接
4. 最后做 SSE 和交互体验增强

## 3. 推荐执行序列

## Commit 1：Run Input 类型化骨架

当前状态：已完成（2026-03-16）

### 目标

统一 `Run.inputJson` 的读写方式，消灭字符串路径解析。

### 对应待办

1. `R-01`

### 主要文件

1. `apps/api/src/lib/run-input.ts`
2. `apps/api/src/lib/provider-adapters.ts`
3. `apps/api/src/routes/creation-commands.ts`
4. `apps/api/src/routes/planner-commands.ts`
5. `apps/api/src/routes/planner-partial-reruns.ts`
6. 其他创建 Run 的 route

### 完成后必须成立

1. 创建 Run 全部走 `serializeRunInput`
2. 读取 Run 全部走 `parseRunInput`
3. 旧的字符串读取 helper 不再是主路径

### 最小验证

1. planner 文本 run 可创建
2. creation 图片 run 可创建
3. creation 视频 run 可创建

### 切换到下一个提交的条件

只有当 Run 创建和读取已经稳定，不再需要字符串路径兜底时，才进入 Commit 2。

## Commit 2：Provider Gateway 收口

当前状态：已完成（2026-03-16）

### 目标

建立 `provider-gateway.ts`，让同步业务调用统一收口。

### 对应待办

1. `R-02`
2. `R-05A`

### 主要文件

1. `apps/api/src/lib/provider-gateway.ts`
2. `apps/api/src/lib/provider-adapters.ts`
3. `apps/api/src/lib/catalog-subject-image.ts`
4. `apps/api/src/routes/provider-configs.ts`

### 完成后必须成立

1. 业务代码不再直连 transport client
2. `catalog-subject-image.ts` 改走 gateway
3. `provider-adapters.ts` 明确收缩为 Run-only

### 最小验证

1. provider test 文本路径可用
2. planner 主体图生成可用
3. creation 图片 / 视频主路径不回归

### 切换条件

只有当“同步业务调用统一入口”已经稳定，才继续做本地存储和 hooks。

## Commit 3：本地文件存储替代临时 URL

当前状态：已完成（2026-03-16）

### 目标

去掉 `generated.local`，把生成结果先下载到本地，再写 `Asset.sourceUrl`。

### 对应待办

1. `R-03`

### 主要文件

1. `apps/api/src/lib/asset-storage.ts`
2. `apps/api/src/lib/run-lifecycle.ts`
3. `apps/api/src/server.ts`
4. `apps/api/src/routes/assets.ts`

### 完成后必须成立

1. `Asset.sourceUrl` 不再写假地址
2. 图片 / 视频结果都先落本地
3. 无输出 URL 时 run 明确失败

### 最小验证

1. 图片生成后本地有文件
2. 视频生成后本地有文件
3. 返回 URL 可访问

### 切换条件

只有当资产落盘链路稳定后，才适合做 transport hooks 和外部调用审计铺垫。

## Commit 4：Transport Hooks + ARK 多能力预留

当前状态：已完成（2026-03-16；hook 已接入 `external_api_call_logs`）

### 目标

在 transport 层插 hooks，并把 ARK 从“text-only 假设”里解放出来。

### 对应待办

1. `R-04`
2. `R-05A`
3. `R-05B / R-05C / R-05D`

### 主要文件

1. `apps/api/src/lib/transport-hooks.ts`
2. `apps/api/src/lib/ark-client.ts`
3. `apps/api/src/lib/platou-client.ts`
4. `apps/api/scripts/seed-model-registry.ts`
5. `apps/api/src/routes/model-registry.ts`
6. `apps/api/src/routes/provider-configs.ts`

### 完成后必须成立

1. 所有外部调用都能经过统一 hook
2. no-op hook 不影响主链路
3. ARK 在架构上不再被写死为 text-only

状态说明：

1. `R-04` 已完成：transport hook 已在 server / worker 双端安装
2. `R-10` 已完成：`external_api_call_logs` 已落地并通过 focused smoke
3. `R-05A`、`R-05B` 已完成
4. `R-05C / R-05D` 不应再与本提交绑定成一个“大进行中”状态
3. 这三个子项应按 ARK 的真实 endpoint readiness 单独推进

### 最小验证

1. 文本、图片、视频调用都能经过 hook
2. model registry 返回 ARK 多能力预留结构
3. provider test 不再依赖 `ark = text-only` 假设

### 切换条件

这一步结束后，Phase 2 的通用 AI 边界基本收住，才进入 Planner 基础修复。

## Commit 5：Planner 基础修复

当前状态：已完成（`R-06`、`R-07`、`R-08`、`R-09` 已完成）

### 目标

修复版本链、事务边界、rerun scope、资产关联稳定性。

### 对应待办

1. `R-06`
2. `R-07`
3. `R-08`
4. `R-09`

### 主要文件

1. `apps/api/prisma/schema.prisma`
2. `apps/api/src/lib/planner-orchestrator.ts`
3. `apps/api/src/lib/planner-refinement-projection.ts`
4. `apps/api/src/lib/planner-rerun-scope.ts`
5. `apps/api/src/routes/planner-partial-reruns.ts`

### 完成后必须成立

1. refinement 可追踪来源 outline
2. 不再留下脏 refinement 版本
3. `PlannerRerunScope` 统一为 `type + shotIds`
4. 资产关联不再主要依赖标题匹配

### 最小验证

1. outline -> refinement 可正常完成
2. partial rerun 新 scope 可用
3. 标题修改后 asset 不丢失
4. 前端整份 structured doc 回写不会静默丢失 `entityKey`

当前收口备注：

1. `sourceOutlineVersionId` 已进入 schema、run input、workspace
2. typed `rerunScope` 已贯穿前后端主路径
3. 标题改写后实体 ID 与 asset 绑定稳定性已通过 focused API smoke
4. 真实 API smoke 已补到资产回写后二次 document save、shot entity patch、refinement activation 后 workspace / run output 同步
5. `smoke-planner-api-refactor.ts` 现已补齐 planner media generation 路径：覆盖 shot `generate-image` run 创建、生成结果 finalize、`PlannerShotScript.generatedAssetIdsJson` 更新、以及 structured doc / workspace 投影同步

### 切换条件

当前该切换条件已满足，Planner 基础结构与投影链路可视为稳定，之后继续推进模型感知 prompt 与体验增强。

## Commit 6：模型能力服务 + Prompt Generator

当前状态：已完成（`R-11`、`R-12` 已完成）

### 目标

把视频模型能力和 prompt 生成能力做成稳定服务层。

### 对应待办

1. `R-11`
2. `R-12`

### 主要文件

1. `apps/api/src/lib/model-capability.ts`
2. `apps/api/src/lib/shot-prompt-generator.ts`
3. `apps/api/scripts/seed-model-registry.ts`

### 完成后必须成立

1. `getVideoModelCapability()` 可稳定返回结构化能力
2. `shot-prompt-generator.ts` 能输出多镜头和单镜头两种模式
3. `Seedance 2.0` 可输出多镜头 prompt

### 最小验证

1. 给同一组 ShotScript 切不同模型，输出结果会变化
2. 多镜头模型输出叙事段落
3. 单镜头模型输出逐镜 prompt

### 切换条件

当 prompt 生成逻辑已经稳定，才进入 orchestrator 注入和 API 暴露。

## Commit 7：Planner 模型感知注入 + `shot-prompts` 预览接口

当前状态：已完成（`R-13`、`R-14` 已完成；前端已可切模型查看 prompt 预览且不污染当前版本）

### 目标

让 refinement 真正带目标模型语境，并把 prompt 预览开放给前端。

### 对应待办

1. `R-13`
2. `R-14`

### 主要文件

1. `apps/api/src/lib/planner-orchestrator.ts`
2. `apps/api/src/routes/planner-commands.ts`
3. `apps/api/src/routes/planner-shot-prompts.ts`
4. `apps/api/src/lib/planner-target-video-model.ts`
5. `apps/web/src/features/planner/lib/planner-api.ts`
6. `apps/web/src/features/planner/components/planner-shot-prompt-preview.tsx`
7. `apps/web/src/app/api/...`

### 完成后必须成立

1. refinement prompt 已正式注入目标视频模型能力摘要
2. `targetVideoModelFamilySlug` 已写入 run input，并沿 structured doc / `PlannerShotScript` / workspace 贯通
3. 前端可在 Planner 内切换真实视频模型并查看 `shot-prompts` 预览
4. 切模型只重算预览，不创建新版本

### 最小验证

1. 同一版本切不同 `modelSlug` 可实时返回不同 prompt
2. workspace 中能看到模型语境字段
3. `generate-doc / partial-rerun` 创建的 queued run 已写入 `targetVideoModelFamilySlug` 与能力摘要 prompt

### 切换条件

只有当 Planner 已经能稳定产出“模型感知原料 + prompt 预览”，才进入版本副本和 finalize。当前已满足该条件，后续阻塞点转为 `R-15` 草稿副本机制和 `R-16` finalize。

## Commit 8：已确认版本创建草稿副本

### 目标

建立“已确认版本 -> 草稿副本”的正式路径，防止污染确认版本。

### 对应待办

1. `R-15`

### 主要文件

1. `apps/api/src/routes/planner-refinement-versions.ts`
2. `apps/web/src/features/planner/lib/planner-api.ts`
3. `apps/web/src/features/planner/components/planner-page.tsx`

### 完成后必须成立

1. 已确认版本不能原地 patch
2. 用户继续修改时先创建草稿副本
3. 新副本与源版本有稳定来源关联

### 最小验证

1. 在已确认版本点击继续修改，会切到新副本
2. 源版本内容保持不变
3. 草稿副本中的 `subject / scene / shot` 拥有新的实体 ID 与 `entityKey`，首次保存不会与源版本发生主键冲突

### 切换条件

只有当版本副本机制成立后，`finalize` 才不会把 Planner 版本链做坏。当前该条件已满足，下一步进入 `R-16`。

## Commit 9：`planner/finalize` + Creation 交接

### 目标

把 Planner 和 Creation 正式打通。

### 对应待办

1. `R-16`
2. `R-20`

### 主要文件

1. `apps/api/src/routes/planner-finalize.ts`
2. Creation workspace 查询与 presenter
3. `apps/web/src/features/creation/lib/creation-api.server.ts`

### 完成后必须成立

1. finalize 后 Creation 直接拿到 Shot、prompt、目标模型、草稿图
2. 用户不再需要手动搬运 Planner 结果
3. finalize 支持幂等重试

### 最小验证

1. 点击“确认策划，进入创作”后可进入 Creation
2. Creation 初始数据来自 finalize 结果
3. 重复 finalize 不会生成重复 Shot，且会复用既有 shot 行

### 切换条件

到这里，核心业务闭环才算真的成立。当前该条件已满足，Creation 首屏 presenter 与运行时刷新也已统一复用 finalize workspace 映射；`R-19` 也已完成当前收口：Planner 页已补齐 creation CTA 的真实浏览器回归，同模型可直接进入创作，切模型会重新 finalize 后进入创作，且 `planner-page.tsx` 已收敛到约 658 行。

## Commit 10：SSE + shot 级重跑 + Planner 页整合

### 目标

补齐 Planner 的实时体验和精细化操作，同时控制前端复杂度。

### 对应待办

1. `R-17`
2. `R-18`
3. `R-19`

### 主要文件

1. `apps/api/src/routes/planner-stream.ts`
2. `apps/api/src/routes/planner-partial-reruns.ts`
3. `apps/web/src/features/planner/components/planner-page.tsx`
4. 新拆分的 Planner hooks / components

### 完成后必须成立

1. Planner 生成过程可实时展示步骤
2. 任意 shot 可单独重跑
3. `planner-page.tsx` 不继续膨胀

### 最小验证

1. 生成中步骤可实时推进
2. shot 单独重跑不污染其他 shot
3. 已确认版本继续修改仍会先创建草稿副本

### 切换条件

到这一步，Planner Phase 5 基本完成。当前 `R-17`、`R-18`、`R-19` 已完成当前阶段实现：`planner-page.tsx` 已拆出 header、episode rail、thread panel、document panel、result header、dialogs，并新增 `use-planner-runtime-workspace.ts`、`use-planner-run-submission.ts`、`use-planner-asset-drafts.ts`、`use-planner-asset-actions.ts`、`use-planner-document-persistence.ts`、`use-planner-composer-actions.ts`、`use-planner-shot-editor.ts`、`use-planner-shot-actions.ts`、`use-planner-shot-prompt-preview.ts`、`use-planner-creation-flow.ts`、`use-planner-display-state.ts`、`use-planner-dialog-display-state.ts`，以及 `planner-page-helpers.ts`、`planner-page-dialogs.tsx` 等收口文件；`planner-page.tsx` 已收敛到约 658 行，Planner 页“进入创作”已通过真实浏览器回归。

## Commit 11：API 分层重构

### 目标

把重构后仍然过重的 route 继续下沉到更清晰的 service / orchestrator seam。

### 对应待办

1. `R-21`

### 完成后必须成立

1. route 文件明显变薄
2. 业务编排不再堆在 route

## Commit 12：前后端 DTO 冻结与 `StudioFixture` 清理

### 目标

把前端过渡层继续缩小，完成正式契约收口。

### 对应待办

1. `R-22`

### 完成后必须成立

1. Planner / Creation / Publish 真页面不再依赖 `createRuntimeStudioFixture()`
2. workspace DTO 成为稳定契约

## 4. 当前建议的开工线

如果现在立刻开工，我的建议顺序就是：

1. `Commit 1`
2. `Commit 2`
3. `Commit 3`
4. `Commit 4`
5. `Commit 5`
6. `Commit 6`
7. `Commit 7`
8. `Commit 8`
9. `Commit 9`
10. `Commit 10`

其中真正的主战场是前 9 个提交。  
`Commit 10` 之后，系统已经不是“纸面规划”，而是一个具备完整 Planner -> Creation 闭环的重构后基线。
